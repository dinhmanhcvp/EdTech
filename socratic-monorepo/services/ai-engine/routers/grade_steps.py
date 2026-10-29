"""
Chấm CÁCH LÀM theo từng bước (Toán đại số, Toán hình, Vật lí, Hóa học, Sinh học).

1. Máy kiểm chứng trước (SymPy, cân bằng hóa học): bước i → i+1 có tương đương không, phép tính số có đúng không, phương trình hóa học
   đã cân bằng chưa. Kết quả của máy là sự thật: AI không được lật lại.
2. AI (Gemini, OpenRouter dự phòng) đọc cả bài, chấm hợp lý từng bước theo bộ tiêu chí của môn, chỉ ra bước sai ĐẦU TIÊN (lỗi gốc),
   giải thích kĩ vì sao sai và cách sửa. Không có AI thì vẫn trả phần máy đã kiểm (status OFFLINE).
"""

import asyncio
import json
import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field

from routers.board_qa import _llm_json
from symbolic.chem_balancer import verify_chemical_equation

try:
    import sympy as sp
    from sympy.parsing.sympy_parser import convert_xor, implicit_multiplication_application, parse_expr, standard_transformations

    _TR = standard_transformations + (implicit_multiplication_application, convert_xor)
    SYMPY_OK = True
except ImportError:  # pragma: no cover
    SYMPY_OK = False

router = APIRouter(prefix="/api/v1/canvas", tags=["Grade steps"])
_POOL = ThreadPoolExecutor(max_workers=2, thread_name_prefix="grade-sympy")
MAX_LINES = 40
# Tổng thời gian chờ AI qua mọi cặp (khóa, model); quá hạn thì trả phần máy đã kiểm thay vì để giáo viên chờ mãi
TOTAL_TIMEOUT_S = 60.0


class GradeLine(BaseModel):
    latex: str = Field(default="", max_length=600)
    text: str = Field(default="", max_length=600)


class GradeStepsRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lines: List[GradeLine] = Field(default_factory=list)
    subject: Optional[str] = None
    problem: str = Field(default="", max_length=2000)
    expected_answer: str = Field(default="", max_length=300)
    gemini_api_key: Optional[str] = Field(default=None, max_length=600)
    openrouter_api_key: Optional[str] = Field(default=None, max_length=300)


# ------------------------------------------------------------------ kiểm chứng bằng máy
def latex_to_plain(s: str) -> str:
    """LaTeX đơn giản → biểu thức SymPy đọc được. Không hiểu thì để nguyên (kiểm chứng sẽ trả None)."""
    t = s or ""
    t = re.sub(r"\\text\{[^}]*\}", " ; ", t)  # chữ xen giữa (hoặc, và...) là dấu ngăn: dòng đó máy không kiểm
    t = re.sub(r"\\(?:left|right|,|;|!|quad|qquad)", " ", t)
    for _ in range(4):
        t = re.sub(r"\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}", r"((\1)/(\2))", t)
        t = re.sub(r"\\sqrt\s*\{([^{}]*)\}", r"sqrt(\1)", t)
    t = re.sub(r"\\sqrt\s*(\d+)", r"sqrt(\1)", t)
    t = t.replace("\\cdot", "*").replace("\\times", "*").replace("\\div", "/").replace("×", "*").replace("÷", "/").replace("−", "-")
    t = t.replace("\\pi", "pi").replace("π", "pi").replace("^{", "^(").replace("}", ")").replace("{", "(")
    t = re.sub(r"\\[a-zA-Z]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def _parse(side: str):
    return parse_expr(latex_to_plain(side).replace("^", "**"), transformations=_TR, evaluate=True)


def _eq_sides(s: str) -> Optional[List[str]]:
    plain = latex_to_plain(s)
    if ";" in plain:
        return None
    parts = [p for p in re.split(r"(?<![<>!])=(?!=)", plain) if p.strip()]
    return parts if len(parts) >= 2 else None


def check_line_arithmetic(latex: str) -> Optional[Dict[str, Any]]:
    """Dòng toàn số (2 + 3 = 6): sai thì trả mô tả. Có biến hoặc không hiểu được thì None."""
    parts = _eq_sides(latex)
    if not SYMPY_OK or not parts:
        return None
    try:
        vals = [sp.nsimplify(_parse(p)) for p in parts]
        if any(v.free_symbols for v in vals):
            return None
        for i in range(len(vals) - 1):
            if sp.simplify(vals[i] - vals[i + 1]) != 0:
                return {"left": str(vals[i]), "right": str(vals[i + 1])}
    except Exception:
        return None
    return None


def check_transition(prev: str, nxt: str) -> Optional[bool]:
    """Bước sau có suy ra tương đương từ bước trước không. True/False, hoặc None khi máy không đủ chắc (biến khác nhau, không phân tích được)."""
    if not SYMPY_OK:
        return None
    try:
        a, b = _eq_sides(prev), _eq_sides(nxt)
        if a and b:
            ea, eb = _parse(a[0]) - _parse(a[-1]), _parse(b[0]) - _parse(b[-1])
            syms = sorted((ea.free_symbols | eb.free_symbols), key=str)
            if len(syms) == 1:
                x = syms[0]
                sa, sb = sp.solveset(ea, x, sp.S.Reals), sp.solveset(eb, x, sp.S.Reals)
                if sa.is_FiniteSet and sb.is_FiniteSet:
                    return sa == sb
                return None
            if not syms:
                return True
            ratio = sp.simplify(ea / eb) if eb != 0 else None
            if ratio is not None and ratio.is_number and ratio != 0:
                return True  # phương trình tương đương (nhân cả hai vế với số khác 0)
            return None
        if not a and not b:
            return sp.simplify(_parse(prev) - _parse(nxt)) == 0
    except Exception:
        return None
    return None


def machine_check(lines: List[GradeLine]) -> Dict[int, Dict[str, Any]]:
    """{chỉ số dòng: lỗi do máy phát hiện}. Chỉ báo lỗi khi chắc chắn."""
    found: Dict[int, Dict[str, Any]] = {}
    for i, ln in enumerate(lines):
        tex = ln.latex or ln.text
        chem = re.search(r"\\(?:rightarrow|to|longrightarrow)|->|→", tex)
        if chem and re.search(r"[A-Z][a-z]?\d*", tex):
            res = verify_chemical_equation(tex)
            if res.get("imbalanced_elements"):
                found[i] = {"kind": "balance", "title": "Phương trình hóa học chưa cân bằng", "detail": f"Số nguyên tử vế trái {res.get('left_atoms')}, vế phải {res.get('right_atoms')}; lệch ở {', '.join(str(e.get('element', e)) if isinstance(e, dict) else str(e) for e in res['imbalanced_elements'])}."}
            continue
        bad = check_line_arithmetic(tex)
        if bad:
            found[i] = {"kind": "calculation", "title": "Tính sai", "detail": f"{bad['left']} khác {bad['right']}."}
            continue
        if i > 0 and i - 1 not in found:
            ok = check_transition(lines[i - 1].latex or lines[i - 1].text, tex)
            if ok is False:
                found[i] = {"kind": "transform", "title": "Biến đổi không tương đương với bước trước", "detail": "Hai dòng này không cùng tập nghiệm (hoặc không bằng nhau) nên bước biến đổi không đúng."}
    return found


def machine_check_guarded(lines: List[GradeLine]) -> Dict[int, Dict[str, Any]]:
    try:
        return _POOL.submit(machine_check, lines).result(timeout=4.0)
    except (FuturesTimeout, Exception):
        return {}


# ------------------------------------------------------------------ AI chấm và giải thích
SYSTEM = """Bạn là giáo viên chấm bài cho học sinh THPT Việt Nam, giỏi Toán đại số, Toán hình, Vật lí, Hóa học, Sinh học.
Chấm CÁCH LÀM, không chỉ đáp án: mỗi bước có hợp lý và suy ra được từ các bước trước không.
Tiêu chí theo môn:
- Toán đại số: biến đổi tương đương, chuyển vế đổi dấu, dấu ngoặc, quy đồng, điều kiện xác định, nghiệm ngoại lai, nhân/chia hai vế bất đẳng thức với số âm phải đổi chiều, làm tròn.
- Toán hình: đúng định lí (Pytago, hệ thức lượng, cosin, thales, tỉ số thể tích...), đủ điều kiện áp dụng, quan hệ vuông góc/song song, góc giữa đường mặt, đơn vị diện tích thể tích.
- Vật lí: đúng công thức cho hiện tượng, đổi đơn vị, thay số đúng đại lượng, đơn vị kết quả, thứ nguyên, dấu và chiều vectơ, chữ số có nghĩa.
- Hóa học: cân bằng phương trình, bảo toàn khối lượng/nguyên tố/electron, tính mol, tỉ lệ mol theo hệ số, đơn vị, chất dư/chất hết, điều kiện phản ứng.
- Sinh học: thuật ngữ, quy luật di truyền (giao tử, kiểu gen, tỉ lệ), xác suất, quá trình (nhân đôi, phiên mã, dịch mã, hô hấp, quang hợp), số liệu.
QUY TẮC:
1. "Máy đã kiểm" là sự thật: bước máy báo sai thì PHẢI là "error", chỉ cần giải thích.
2. Không bịa lỗi. Bước đúng là "ok". Không chắc thì "warn" và nói rõ cần kiểm lại điều gì.
3. Lỗi gốc là bước sai ĐẦU TIÊN. Các bước sau chỉ sai vì dùng kết quả sai đó nhưng bản thân hợp lý thì là "carry" (không tính lỗi mới) và nhắc "do lỗi ở bước X".
4. Với mỗi bước sai: "title" ngắn (VD "Sai dấu khi chuyển vế"), "explain" giải thích KĨ vì sao sai (2 đến 5 câu, tiếng Việt, nêu quy tắc/định lí liên quan), "fix" các bước sửa cụ thể, "corrected" là dòng đúng (LaTeX).
5. "final_correct": đáp án cuối đúng hay không (null nếu không xác định). "summary": 1 đến 2 câu nhận xét tổng quát, kể cả điểm làm tốt.
Trả về DUY NHẤT JSON: {"subject":"MATH_ALGEBRA|MATH_GEOMETRY|PHYSICS|CHEMISTRY|BIOLOGY|OTHER","final_correct":true|false|null,"summary":"...",
"steps":[{"index":0,"status":"ok|error|carry|warn","kind":"calculation|sign|transform|concept|unit|balance|missing|other","title":"...","explain":"...","fix":"...","corrected":"..."}]}
Mảng steps phải có ĐÚNG một phần tử cho mỗi dòng, theo thứ tự."""


def _extract(raw: str) -> Optional[Dict[str, Any]]:
    m = re.search(r"\{.*\}", raw or "", re.DOTALL)
    if not m:
        return None
    for cand in (m.group(0), re.sub(r",\s*([\}\]])", r"\1", m.group(0))):
        try:
            return json.loads(cand)
        except json.JSONDecodeError:
            continue
    return None


def _s(v: Any, n: int = 700) -> str:
    return str(v or "").strip()[:n]


def build_user(req: GradeStepsRequest, machine: Dict[int, Dict[str, Any]]) -> str:
    rows = "\n".join(f"[{i}] {ln.latex or ln.text}" for i, ln in enumerate(req.lines))
    hints = "\n".join(f"- Dòng [{i}]: {m['title']}. {m['detail']}" for i, m in sorted(machine.items())) or "(máy chưa phát hiện lỗi chắc chắn)"
    head = f"Môn (gợi ý): {req.subject}\n" if req.subject else ""
    prob = f"Đề bài: {req.problem}\n" if req.problem else ""
    exp = f"Đáp án giáo viên: {req.expected_answer}\n" if req.expected_answer else ""
    return f"{head}{prob}{exp}Bài làm của học sinh, từng dòng:\n{rows}\n\nMáy đã kiểm:\n{hints}"


def merge(req: GradeStepsRequest, machine: Dict[int, Dict[str, Any]], ai: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    n = len(req.lines)
    ai_steps = {int(s.get("index", -1)): s for s in (ai or {}).get("steps", []) if isinstance(s, dict) and str(s.get("index", "")).lstrip("-").isdigit()}
    steps: List[Dict[str, Any]] = []
    for i in range(n):
        a = ai_steps.get(i, {})
        m = machine.get(i)
        status = _s(a.get("status"), 8) or ("ok" if ai else "unchecked")
        if status not in ("ok", "error", "carry", "warn", "unchecked"):
            status = "warn"
        if m:
            status = "error"  # máy chắc chắn: AI không được lật lại
        steps.append({
            "index": i,
            "latex": req.lines[i].latex or req.lines[i].text,
            "status": status,
            "kind": (m or {}).get("kind") or _s(a.get("kind"), 20) or "other",
            "title": _s(a.get("title"), 120) or (m or {}).get("title", ""),
            "explain": _s(a.get("explain")) or (m or {}).get("detail", ""),
            "fix": _s(a.get("fix")),
            "corrected": _s(a.get("corrected"), 300),
            "source": "machine" if m else ("ai" if ai else "none"),
        })
    first = next((s["index"] for s in steps if s["status"] == "error"), None)
    return {
        "status": "GRADED" if ai else "OFFLINE",
        "subject": _s((ai or {}).get("subject"), 20) or (req.subject or ""),
        "final_correct": (ai or {}).get("final_correct") if isinstance((ai or {}).get("final_correct"), bool) else (False if first is not None and ai is None else None),
        "summary": _s((ai or {}).get("summary"), 400) or ("Chưa gọi được AI; đây là phần máy đã kiểm chứng." if not ai else ""),
        "first_error": first,
        "steps": steps,
    }


def grade_lines(req: GradeStepsRequest, gemini_key: str = "", openrouter_key: str = "") -> Dict[str, Any]:
    """Bản đồng bộ cho hub (chấm ảnh vở học sinh ở luồng nền). Cùng các bước với route /grade-steps; route giữ nguyên."""
    req.lines = [ln for ln in req.lines if (ln.latex or ln.text).strip()][:MAX_LINES]
    machine = machine_check_guarded(req.lines)
    try:
        llm = _llm_json(SYSTEM, build_user(req, machine), gemini_key, openrouter_key, 3500, 40.0, "grade")
        ai = _extract(llm[0]) if llm else None
    except Exception:
        ai = None
    return merge(req, machine, ai)


@router.post("/grade-steps")
async def grade_steps(request: Request):
    try:
        req = GradeStepsRequest.model_validate(await request.json())
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Yêu cầu không hợp lệ: {str(e)[:160]}")
    req.lines = [ln for ln in req.lines if (ln.latex or ln.text).strip()][:MAX_LINES]
    if not req.lines:
        raise HTTPException(status_code=422, detail="Không có dòng bài làm để chấm.")
    g = (request.headers.get("x-gemini-api-key") or req.gemini_api_key or "").strip().strip("'\"")
    o = (request.headers.get("x-openrouter-api-key") or req.openrouter_api_key or "").strip().strip("'\"")
    machine = await run_in_threadpool(machine_check_guarded, req.lines)
    ai: Optional[Dict[str, Any]] = None
    try:
        llm = await asyncio.wait_for(run_in_threadpool(_llm_json, SYSTEM, build_user(req, machine), g, o, 3500, 40.0, "grade"), TOTAL_TIMEOUT_S)
        ai = _extract(llm[0]) if llm else None
    except Exception:  # gồm cả asyncio.TimeoutError
        ai = None
    return merge(req, machine, ai)
