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
