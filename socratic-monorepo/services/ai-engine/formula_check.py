"""Equivalence check for formulas typed or written on the board (board lessons).

`routers/online_tutor.verdict` belongs to the fixed homework catalog and only knows a handful of physics symbols,
so it cannot grade a parabola the teacher just typed. This module compares any two formulas symbolically:

- teacher LaTeX and student plain text are first reduced to one plain form (`latex_to_plain`);
- equations are equal when they are the same up to rearrangement, sign or a constant factor;
- anything unreadable or unsafe returns None (UNVERIFIED), never False: a student is not marked wrong for syntax.
"""
from __future__ import annotations

import re
from typing import Optional

from symbolic.socratic_guard import is_safe_math_input

try:
    import sympy as sp
    from sympy.parsing.sympy_parser import convert_xor, implicit_multiplication_application, parse_expr, standard_transformations

    SYMPY_AVAILABLE = True
except ImportError:  # pragma: no cover - sympy is a hard dependency of the engine
    SYMPY_AVAILABLE = False

_UNICODE = {
    "−": "-", "–": "-", "×": "*", "·": "*", "⋅": "*", "÷": "/", "²": "^2", "³": "^3", "√": "sqrt",
    "μ": "mu", "α": "alpha", "β": "beta", "γ": "gamma", "ω": "omega", "π": "pi", "θ": "theta", "λ": "lam",
}
_DECORATIONS = r"vec|bar|overline|hat|dot|ddot|tilde|mathrm|mathbf|mathit|boldsymbol|text|operatorname"
_SPACING = re.compile(r"\\(?:left|right|quad|qquad|,|;|:|!| )")
_DECORATION = re.compile(r"\\(?:" + _DECORATIONS + r")\s*\{([^{}]*)\}")
_FRAC = re.compile(r"\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}")
_SQRT = re.compile(r"\\sqrt\s*\{([^{}]*)\}")
_SUB_BRACED = re.compile(r"_\{([^{}]*)\}")
_SUB_SINGLE = re.compile(r"_([A-Za-z0-9])")


def latex_to_plain(text: str) -> str:
    """Reduce teacher LaTeX (and student plain text) to a form SymPy can parse."""
    t = text or ""
    for src, dst in _UNICODE.items():
        t = t.replace(src, dst)
    t = _SPACING.sub(" ", t)
    for _ in range(6):  # nested decorations / fractions
        new = _DECORATION.sub(r"\1", t)
        new = _FRAC.sub(r"((\1)/(\2))", new)
        new = _SQRT.sub(r"sqrt(\1)", new)
        if new == t:
            break
        t = new
    t = t.replace("\\cdot", "*").replace("\\times", "*").replace("\\div", "/").replace("\\lambda", "lam")
    t = _SUB_BRACED.sub(r"\1", t)
    t = _SUB_SINGLE.sub(r"\1", t)
    t = t.replace("{", "(").replace("}", ")")
    t = re.sub(r"\\([A-Za-z]+)", r"\1", t)  # \cos, \alpha, \pi ... keep their names
    return re.sub(r"\s+", " ", t.replace("\\", "")).strip()


def _globals() -> dict:
    """Names the parser may use. No sympy star-import, so E, I, S, N, Q stay ordinary symbols."""
    return {
        "Symbol": sp.Symbol, "Integer": sp.Integer, "Float": sp.Float, "Rational": sp.Rational,
        "sin": sp.sin, "cos": sp.cos, "tan": sp.tan, "cot": sp.cot, "sqrt": sp.sqrt, "log": sp.log, "ln": sp.log,
        "exp": sp.exp, "asin": sp.asin, "acos": sp.acos, "atan": sp.atan, "arcsin": sp.asin, "arccos": sp.acos, "arctan": sp.atan,
        "pi": sp.pi, "abs": sp.Abs,
    }


def _parse(text: str):
    return parse_expr(
        text, local_dict={}, global_dict=_globals(), evaluate=True,
        transformations=standard_transformations + (implicit_multiplication_application, convert_xor),
    )


def _zero(expr) -> bool:
    return sp.simplify(sp.expand(expr)) == 0


def check_formula(answer: str, expected: str) -> Optional[bool]:
    """True/False when both formulas could be read and compared; None when the answer cannot be checked."""
    a, b = latex_to_plain(answer), latex_to_plain(expected)
    if not a or not b or not is_safe_math_input(a) or not is_safe_math_input(b):
        return None
    if a.replace(" ", "") == b.replace(" ", ""):
        return True
    if not SYMPY_AVAILABLE or a.count("=") != b.count("=") or a.count("=") > 1:
        return None
    try:
        if "=" in a:
            (la, ra), (lb, rb) = a.split("="), b.split("=")
            if not all(side.strip() for side in (la, ra, lb, rb)):
                return None
            ea, eb = _parse(la) - _parse(ra), _parse(lb) - _parse(rb)
            if _zero(ea - eb) or _zero(ea + eb):
                return True
            if eb != 0:
                ratio = sp.simplify(ea / eb)
                if ratio.is_number and ratio != 0:
                    return True
            return False
        return _zero(_parse(a) - _parse(b))
    except Exception:
        return None
