"""
Symbolic Algebra Verifier (Tier 1 Verification Engine - 0 API Call)
Validates algebraic equivalence, trigonometric identities, and calculus expressions in <10ms.
"""
import time
from typing import Tuple, Dict, Any, Optional

try:
    import sympy as sp
    from sympy.parsing.sympy_parser import (
        parse_expr,
        standard_transformations,
        implicit_multiplication_application,
        convert_xor
    )
    SYMPY_AVAILABLE = True
except ImportError:
    SYMPY_AVAILABLE = False

TRANSFORMATIONS = (
    standard_transformations +
    (implicit_multiplication_application, convert_xor)
) if SYMPY_AVAILABLE else ()

# Dimensional vector: (Length, Mass, Time) -> (L, M, T)
PHYSICAL_DIMENSIONS = {
    "x": (1, 0, 0), "y": (1, 0, 0), "h": (1, 0, 0), "s": (1, 0, 0), "L": (1, 0, 0), "d": (1, 0, 0),
    "t": (0, 0, 1),
    "v": (1, 0, -1), "v0": (1, 0, -1), "vx": (1, 0, -1), "vy": (1, 0, -1),
    "a": (1, 0, -2), "g": (1, 0, -2),
    "m": (0, 1, 0), "m1": (0, 1, 0), "m2": (0, 1, 0),
    "F": (1, 1, -2), "P": (1, 1, -2), "N": (1, 1, -2),
}


def compute_monomial_dimension(term_str: str) -> Optional[Tuple[int, int, int]]:
    """Calculates (L, M, T) net dimension exponents for a multiplicative monomial."""
    if not term_str:
        return None
    import re
    # Normalize exponents e.g. ^2 -> **2
    norm = term_str.strip().replace("^", "**")
    # Strip leading numerical coefficients and optional multiplication sign (e.g. 1/2*, 0.5*, 2*)
    t_clean = re.sub(r'^[+-]?[0-9\.\/]+(?:\s*\*\s*)?', '', norm)
    if not t_clean:
        return (0, 0, 0) # dimensionless constant

    net_L, net_M, net_T = 0, 0, 0
    # Match symbols and powers: e.g. v0, g, t**2, m**1
    tokens = re.findall(r'([a-zA-Z_][a-zA-Z0-9_]*)(?:\*\*([0-9\-]+))?', t_clean)
    found_any = False
    for sym, pwr_str in tokens:
        pwr = int(pwr_str) if pwr_str else 1
        if sym in PHYSICAL_DIMENSIONS:
            found_any = True
            dL, dM, dT = PHYSICAL_DIMENSIONS[sym]
            net_L += dL * pwr
            net_M += dM * pwr
            net_T += dT * pwr

    return (net_L, net_M, net_T) if found_any else None


def check_dimensional_inconsistency(student_str: str) -> Optional[str]:
    """
    Checks if student adds or subtracts terms with different physical dimensions,
    or equates quantities with different dimensions (LHS != RHS).
    Returns warning message if inconsistency is detected, else None.
    """
    import re
    lhs_dim = None
    lhs_str = None
    if "=" in student_str:
        lhs_part, rhs_part = student_str.split("=", 1)
        lhs_str = lhs_part.strip()
        rhs = rhs_part.strip()
        lhs_d = compute_monomial_dimension(lhs_str)
        if lhs_d is not None:
            lhs_dim = lhs_d
    else:
        rhs = student_str.strip()

    clean_rhs = rhs
    if clean_rhs.startswith("+") or clean_rhs.startswith("-"):
        clean_rhs = clean_rhs[1:]

    parts = [p.strip() for p in re.split(r'[\+\-]', clean_rhs) if p.strip()]
    if not parts:
        return None

    dims = []
    for p in parts:
        d = compute_monomial_dimension(p)
        if d is not None:
            dims.append((p, d))

    if len(dims) >= 2:
        first_p, first_d = dims[0]
        for next_p, next_d in dims[1:]:
            if first_d != next_d:
                return (
                    f"Phát hiện lỗi thứ nguyên (Dimensional Analysis): "
                    f"Số hạng '{first_p}' và '{next_p}' có đơn vị vật lý không tương thích. "
                    f"Hai đại lượng khác thứ nguyên không thể cộng hoặc trừ trực tiếp!"
                )

    if lhs_dim is not None and dims:
        for p, d in dims:
            if d != lhs_dim:
                return (
                    f"Phát hiện lỗi thứ nguyên (Dimensional Analysis): "
                    f"Vế trái '{lhs_str}' và số hạng '{p}' có đơn vị vật lý không tương thích. "
                    f"Hai vế phương trình phải cùng thứ nguyên!"
                )
    return None


def check_limiting_case(expr_str: str, var_name: str, limit_value: float) -> Dict[str, Any]:
    """
    Evaluates limiting case for Olympiad reasoning (e.g. alpha -> 90 deg or k -> 0).
    """
    if not SYMPY_AVAILABLE:
        return {"supported": False, "limit": None}
    try:
        var = sp.Symbol(var_name)
        expr = parse_expr(expr_str.replace("^", "**"), transformations=TRANSFORMATIONS)
        lim_res = sp.limit(expr, var, limit_value)
        return {
            "supported": True,
            "variable": var_name,
            "approaches": limit_value,
            "limit_result": str(lim_res),
            "is_finite": bool(lim_res.is_finite if hasattr(lim_res, 'is_finite') else True)
        }
    except Exception as e:
        return {"supported": False, "error": str(e)}


def verify_algebraic_equivalence(student_expr_str: str, expected_expr_str: str) -> Dict[str, Any]:
    """
    Checks if student_expr_str is mathematically equivalent to expected_expr_str.
    Returns:
        {
            "is_equivalent": bool,
            "verification_time_ms": float,
            "error_category": Optional[str],
            "simplified_diff": str,
            "feedback": str
        }
    """
    start_time = time.perf_counter()
    
    # Safety verification
    try:
        from symbolic.socratic_guard import is_safe_math_input
        if not is_safe_math_input(student_expr_str):
            elapsed = (time.perf_counter() - start_time) * 1000
            return {
                "is_equivalent": False,
                "verification_time_ms": round(elapsed, 2),
                "error_category": "UNSAFE_INPUT",
                "simplified_diff": "blocked",
                "feedback": "Biểu thức chứa ký tự hoặc cú pháp không hợp lệ trong khuôn khổ bài học."
            }
    except Exception:
        pass

    # Fast path cleanups
    s_clean = student_expr_str.strip().replace(" ", "").replace("^", "**")
    e_clean = expected_expr_str.strip().replace(" ", "").replace("^", "**")
    
    if s_clean == e_clean:
        elapsed = (time.perf_counter() - start_time) * 1000
        return {
            "is_equivalent": True,
            "verification_time_ms": round(elapsed, 2),
            "error_category": None,
            "simplified_diff": "0",
            "feedback": "Chính xác tuyệt đối! Biểu thức của em hoàn toàn trùng khớp."
        }

    # High-School & Olympiad Dimensional Analysis Guard
    dim_err = check_dimensional_inconsistency(student_expr_str)
    if dim_err:
        elapsed = (time.perf_counter() - start_time) * 1000
        return {
            "is_equivalent": False,
            "verification_time_ms": round(elapsed, 2),
            "error_category": "DIMENSIONAL_INCONSISTENCY",
            "simplified_diff": "dimensional_mismatch",
            "feedback": dim_err
        }
        
    if not SYMPY_AVAILABLE:
        # Fallback string comparison
        elapsed = (time.perf_counter() - start_time) * 1000
        is_eq = s_clean.lower() == e_clean.lower()
        return {
            "is_equivalent": is_eq,
            "verification_time_ms": round(elapsed, 2),
            "error_category": None if is_eq else "FORMULA_MISMATCH",
            "simplified_diff": "" if is_eq else "diff",
            "feedback": "Đáp án hợp lệ." if is_eq else "Biểu thức chưa tương đương với kết quả cần tìm."
        }
    
    try:
        def parse_sym(s: str):
            s = s.strip().replace("^", "**")
            if "=" in s:
                lhs_str, rhs_str = s.split("=", 1)
                lhs_expr = parse_expr(lhs_str.strip(), transformations=TRANSFORMATIONS)
                rhs_expr = parse_expr(rhs_str.strip(), transformations=TRANSFORMATIONS)
                return lhs_expr - rhs_expr, rhs_expr
            expr = parse_expr(s, transformations=TRANSFORMATIONS)
            return expr, expr

        student_norm, student_rhs = parse_sym(s_clean)
        expected_norm, expected_rhs = parse_sym(e_clean)

        # 1. Compare full equation differences if both have '='
        diff = sp.simplify(student_norm - expected_norm)
        is_equivalent = bool(diff == 0)

        # 2. If one side had '=' and the other didn't, or inverted (e.g. h - 1/2*g*t^2 vs 1/2*g*t^2 - h)
        if not is_equivalent:
            if bool(sp.simplify(student_norm + expected_norm) == 0):
                is_equivalent = True
            elif bool(sp.simplify(student_rhs - expected_rhs) == 0):
                is_equivalent = True

        elapsed = (time.perf_counter() - start_time) * 1000

        if is_equivalent:
            return {
                "is_equivalent": True,
                "verification_time_ms": round(elapsed, 2),
                "error_category": None,
                "simplified_diff": "0",
                "feedback": "Xuất sắc! Biểu thức của em có dạng biến đổi toán học tương đương chuẩn xác."
            }
        else:
            # Detect sign error: diff == 2 * expected or student == -expected
            is_sign_error = bool(sp.simplify(student_rhs + expected_rhs) == 0)
            error_cat = "ALGEBRAIC_SIGN_ERROR" if is_sign_error else "FORMULA_MISMATCH"
            feedback = (
                "Hình như em đã nhầm dấu (+/-) ở một trong các số hạng. Hãy kiểm tra lại chiều biến thiên!"
                if is_sign_error else
                "Biểu thức chưa tương đương với biểu thức chuẩn. Em hãy kiểm tra lại hệ số và các bước khai triển!"
            )
            return {
                "is_equivalent": False,
                "verification_time_ms": round(elapsed, 2),
                "error_category": error_cat,
                "simplified_diff": "diff_hidden",
                "feedback": feedback
            }
    except Exception as ex:
        elapsed = (time.perf_counter() - start_time) * 1000
        return {
            "is_equivalent": False,
            "verification_time_ms": round(elapsed, 2),
            "error_category": "SYNTAX_ERROR",
            "simplified_diff": str(ex),
            "feedback": f"Cú pháp biểu thức toán chưa chuẩn: {str(ex)}. Em hãy kiểm tra lại dấu ngoặc và biến số."
        }
