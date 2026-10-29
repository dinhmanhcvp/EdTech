import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
from formula_check import check_formula, latex_to_plain


@pytest.mark.parametrize('answer,expected', [
    ('y = x^2 - 3', r'y = x^{2} - 3'),                       # the case that failed in the browser
    ('y=x²−3', r'y = x^{2} - 3'),                            # unicode superscript and minus
    ('y = x**2 - 3', r'y = x^{2} - 3'),
    ('y + 3 = x^2', r'y = x^{2} - 3'),                       # rearranged equation
    ('2y = 2x^2 - 6', r'y = x^{2} - 3'),                     # scaled equation
    ('y = 2x', 'y = 2*x'),                                   # implicit multiplication
    ('E = 1/2 m v^2', r'E = \frac{1}{2}mv^{2}'),
    ('E = mc^2', 'E = m c^2'),                               # E must stay a symbol, not Euler's number
    ('S = v t', 'S = vt'),                                   # S must stay a symbol
    ('x = A cos(omega t)', r'x = A\cos(\omega t)'),
    ('x = A cos(ω t)', r'x = A\cos(\omega t)'),
    ('U = U_R + U_L + U_C', r'\vec{U} = \vec{U}_R + \vec{U}_L + \vec{U}_C'),
    ('x_Fe = 8/3', r'\bar{x}_{Fe} = +\frac{8}{3}'),
    (r'A_{ms} = -\mu mg\cos\alpha \cdot s', r'A_{ms} = -\mu mg\cos\alpha \cdot s'),   # identical strings
])
def test_equivalent_forms_are_accepted(answer, expected):
    assert check_formula(answer, expected) is True


@pytest.mark.parametrize('answer,expected', [
    ('y = x^2', r'y = x^{2} - 3'),
    ('x = y^2 - 3', r'y = x^{2} - 3'),                       # variables swapped
    ('y = x^2 + 3', r'y = x^{2} - 3'),
    ('x = A sin(omega t)', r'x = A\cos(\omega t)'),
    ('E = m v^2', r'E = \frac{1}{2}mv^{2}'),
    ('s = vt', 'S = vt'),                                    # case matters in physics
])
def test_wrong_formulas_are_rejected(answer, expected):
    assert check_formula(answer, expected) is False


@pytest.mark.parametrize('answer', [
    'xin chao?!', '', '   ', 'y =', '= x', '__import__("os").system("x")', 'y = x^2; import os',
    'y = x' + '+x' * 120,                                    # longer than the input cap
    'lambda: 1', 'y = open("f")',
])
def test_unreadable_or_unsafe_answers_are_unverified_not_wrong(answer):
    assert check_formula(answer, r'y = x^{2} - 3') is None


def test_an_equation_against_a_bare_expression_is_unverified():
    assert check_formula('x^2 - 3', r'y = x^{2} - 3') is None


def test_bare_expressions_are_compared_symbolically():
    assert check_formula('(x-1)(x+1)', 'x^2 - 1') is True
    assert check_formula('x^2 + 1', 'x^2 - 1') is False


def test_latex_to_plain_handles_the_decorations_teachers_type():
    assert latex_to_plain(r'\frac{1}{2}mv^{2}') == '((1)/(2))mv^(2)'
    assert latex_to_plain(r'\vec{F} = m\vec{a}') == 'F = ma'
    assert latex_to_plain(r'\text{Fe} + \sqrt{x}') == 'Fe + sqrt(x)'
