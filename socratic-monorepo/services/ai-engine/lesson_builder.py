"""Rule-based lesson builder: classroom snapshot -> public lesson plan + server-only answer keys."""
from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

SUBJECTS = {"MATH", "PHYSICS", "CHEMISTRY", "BIOLOGY"}


def _question(scene_id: str, n: int, kind: str, prompt: str) -> Dict[str, Any]:
    return {"id": f"{scene_id}:q{n}", "scene_id": scene_id, "kind": kind, "prompt": prompt, "hint_count": 4}


def build_lesson(snapshot: Dict[str, Any], student_id: str) -> Tuple[Dict[str, Any], Dict[str, str]]:
    """Return (public_plan, answer_keys). Only COMPUTE questions have keys; keys never enter the plan."""
    session_id = str((snapshot or {}).get("sessionId") or "session")
    boards = [b for b in ((snapshot or {}).get("boardSnapshots") or []) if isinstance(b, dict) and b.get("id")]
    work = [w for w in ((snapshot or {}).get("studentWork") or []) if isinstance(w, dict)]
    scenes, keys = [], {}
    for board in boards:
        scene_id = str(board["id"])
        subject = board.get("subject") if board.get("subject") in SUBJECTS else "MATH"
        latex = str(board.get("latex") or "")
        questions = []
        if latex:
            q = _question(scene_id, 1, "COMPUTE", "Viết lại công thức then chốt của cảnh này theo cách của em.")
            questions.append(q)
            keys[q["id"]] = latex
        questions.append(_question(scene_id, len(questions) + 1, "EXPLAIN_BACK", "Em thử giải thích lại ý chính của cảnh này như đang kể cho một bạn chưa nghe thầy cô giảng nhé?"))
        has_error = any(
            w.get("subject") == subject and any(isinstance(l, dict) and l.get("status") == "error" for l in (w.get("lines") or []))
            for w in work
        )
        if has_error:
            questions.append(_question(scene_id, len(questions) + 1, "FIND_ERROR", "Có một bài chữa trên bảng ở phần này bị sai. Em đoán xem lỗi nằm ở bước nào?"))
        scenes.append({"id": scene_id, "title": str(board.get("title") or scene_id), "subject": subject, "latex": latex,
                       "concept": str(board.get("note") or ""), "questions": questions})
    review = [q.strip()[:240] for q in ((snapshot or {}).get("reviewQuestions") or []) if isinstance(q, str) and q.strip()][:8]
    for k, prompt in enumerate(review if scenes else []):
        scene = scenes[k % len(scenes)]
        scene["questions"].append(_question(scene["id"], len(scene["questions"]) + 1, "EXPLAIN_BACK", prompt))
    plan = {"lesson_id": f"{session_id}:{student_id}", "session_id": session_id,
            "title": str((snapshot or {}).get("lessonTitle") or "Bài học từ bảng"), "version": 1, "scenes": scenes}
    return plan, keys


def title_for_student(scene: Dict[str, Any], index: int, keys: Dict[str, str], solved: set) -> str:
    """A section title can be the formula itself (Teacher Board names a section after its first moment);
    while the scene is locked such a title is replaced by a neutral one."""
    from lesson_llm import leaks_answer  # local import: lesson_llm pulls in the Gemini client

    computes = [q["id"] for q in scene["questions"] if q["id"] in keys]
    if computes and not all(qid in solved for qid in computes) and any(leaks_answer(scene["title"], keys[qid]) for qid in computes):
        return f"Phần {index + 1}"
    return scene["title"]


def public_view(plan: Dict[str, Any], solved: set, keys: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Client copy of a stored plan: a scene's formula, board note and (when it equals the formula) title stay
    hidden until its COMPUTE question is solved."""
    import copy

    view = copy.deepcopy(plan)
    for i, scene in enumerate(view["scenes"]):
        computes = [q["id"] for q in scene["questions"] if q["kind"] == "COMPUTE"]
        if computes and not all(qid in solved for qid in computes):
            scene["latex"] = ""
            scene["concept"] = ""
        if keys:
            scene["title"] = title_for_student(scene, i, keys, solved)
    return view
