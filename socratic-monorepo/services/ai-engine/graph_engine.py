import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import re
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor

TRANSFORMATIONS = standard_transformations + (implicit_multiplication_application, convert_xor)

def clean_equation_string(raw: str) -> str:
    """
    Cleans raw equation string by removing y=, f(x)=, LaTeX tokens,
    superscript characters, and converting to valid SymPy syntax.
    """
    eq = raw.strip()
    # Strip \text{...} or \mathrm{...}
    eq = re.sub(r'\\(?:text|mathrm|mathbf|mathit)\{([^{}]*)\}', r'\1', eq)
    # Strip unit annotations
    eq = re.sub(r'\b(m/s|m/s2|cm|rad/s|rad|độ|do)\b', '', eq, flags=re.IGNORECASE)
    
    # Strip leading assignment: y =, x =, x(t) =, s(t) =, v(t) =, f(x) =, Rate =
    eq = re.sub(r'^[yYfFxXsSvVuUrR]\s*(\([xXtTa-zA-Z]\))?\s*=\s*', '', eq)
    
    # Handle fractions: \frac{a}{b} -> ((a)/(b))
    while r'\frac' in eq:
        eq = re.sub(r'\\frac\{([^{}]+)\}\{([^{}]+)\}', r'((\1)/(\2))', eq)
        
    # Handle square roots: \sqrt{x} -> sqrt(x)
    eq = re.sub(r'\\sqrt\{([^{}]+)\}', r'sqrt(\1)', eq)
    
    # LaTeX cleanup
    eq = re.sub(r'\\[,;!]', ' ', eq)
    eq = eq.replace(r'\quad', ' ').replace(r'\qquad', ' ')
    eq = eq.replace(r'\pi', 'pi')
    eq = eq.replace('\\sin', 'sin').replace('\\cos', 'cos').replace('\\tan', 'tan')
    eq = eq.replace('\\cdot', '*').replace('\\times', '*')
    eq = re.sub(r'(\^\\circ|°)', '', eq)
    
    # Superscript unicode conversion
    eq = eq.replace('²', '^2').replace('³', '^3').replace('⁴', '^4')
    return eq.strip()

def generate_neon_graph(equation_str: str, param_a: float = 1.0, param_b: float = 0.0, param_c: float = 0.0, param_d: float = 0.0) -> str:
    """
    Parses any mathematical expression safely with SymPy and renders a high-contrast dark-neon SVG.
    Supports algebraic, trigonometric, integrals (\\int x^2 dx), and rational functions.
    """
    try:
        cleaned_str = clean_equation_string(equation_str)
        x = sp.Symbol('x')
        t = sp.Symbol('t')
        A = sp.Symbol('A')
        a = sp.Symbol('a')
        b = sp.Symbol('b')
        c = sp.Symbol('c')
        d = sp.Symbol('d')
        
        # Check if it is an indefinite integral: \int ... dx or \int ... dt
        is_integral = False
        integral_match = re.search(r'\\?int\s*(.*?)(?:\s*[\.,]?\s*d([xXtT])|\s*$)', cleaned_str)
        if integral_match:
            is_integral = True
            inner_str = integral_match.group(1).strip()
            int_var_char = integral_match.group(2) or ('t' if 't' in inner_str else 'x')
            int_var = t if int_var_char.lower() == 't' else x
            inner_str = re.sub(r'[\.,\*]+$', '', inner_str).strip()
            inner_str = inner_str.replace('{', '(').replace('}', ')')
            if not inner_str:
                inner_str = "1"
            inner_expr = parse_expr(inner_str, transformations=TRANSFORMATIONS)
            expr = sp.integrate(inner_expr, int_var)
        else:
            cleaned_str = cleaned_str.replace('{', '(').replace('}', ')')
            expr = parse_expr(cleaned_str, transformations=TRANSFORMATIONS)
        
        # Substitute optional parameters if present in the expression
        substitutions = {}
        if A in expr.free_symbols: substitutions[A] = param_a
        if a in expr.free_symbols: substitutions[a] = param_a
        if b in expr.free_symbols: substitutions[b] = param_b
        if c in expr.free_symbols: substitutions[c] = param_c
        if d in expr.free_symbols: substitutions[d] = param_d
        
        if substitutions:
            expr_evaluated = expr.subs(substitutions)
        else:
            expr_evaluated = expr
            
        if is_integral:
            if param_d != 0.0:
                expr_evaluated = expr_evaluated + param_d

        # Determine independent variable: if 't' is present, use 't', else 'x'
        t = sp.Symbol('t')
        var_symbol = t if t in expr_evaluated.free_symbols else x
        
        # Lambdify to numpy function
        f = sp.lambdify(var_symbol, expr_evaluated, modules=["numpy"])
        
        # Determine range and labels
        expr_str = str(expr_evaluated).lower()
        if is_integral:
            x_vals = np.linspace(-4, 4, 1000)
            x_label_title = "x"
            y_label_title = "F(x)"
            c_tag = f" + {param_d}" if param_d != 0.0 else " + C"
            curve_label = f"F(x) = {expr_evaluated}" + (c_tag if param_d == 0.0 and "+ c" not in str(expr_evaluated).lower() else "")
            plot_title = f"Nguyên hàm xác thực: F(x) = ∫ ({inner_str}) dx"
        elif var_symbol == t:
            x_vals = np.linspace(0, 4, 1000)
            x_label_title = "t (s)"
            y_label_title = "x (cm)"
            curve_label = f"x(t) = {expr_evaluated}"
            plot_title = f"Dao động: x(t) = {expr_evaluated}"
        elif 'sin' in expr_str or 'cos' in expr_str or 'tan' in expr_str:
            x_vals = np.linspace(-2 * np.pi, 2 * np.pi, 1000)
            x_label_title = "x (rad)"
            y_label_title = "y"
            curve_label = f"y = {expr_evaluated}"
            plot_title = f"y = {expr_evaluated}"
        else:
            x_vals = np.linspace(-6, 6, 1000)
            x_label_title = "x"
            y_label_title = "y"
            curve_label = f"y = {expr_evaluated}"
            plot_title = f"y = {expr_evaluated}"

        # Evaluate safely
        y_vals = f(x_vals)
        if np.isscalar(y_vals):
            y_vals = np.full_like(x_vals, float(y_vals))
            
        # Clean infinite/NaN values
        y_vals = np.nan_to_num(y_vals, nan=0.0, posinf=50.0, neginf=-50.0)
        
        # Cap extremes for visualization
        y_vals = np.clip(y_vals, -50.0, 50.0)

        # Plot with Matplotlib Neon Style
        plt.style.use('dark_background')
        fig, ax = plt.subplots(figsize=(8, 4.5), facecolor='#0f172a')
        ax.set_facecolor('#0f172a')

        # Clean spines
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#475569')
        ax.spines['bottom'].set_color('#475569')
        ax.tick_params(colors='#94a3b8')
        ax.grid(color='#1e293b', linestyle='--', linewidth=1, alpha=0.7)
        
        # Zero axes lines
        ax.axhline(0, color='#334155', linewidth=1.2)
        ax.axvline(0, color='#334155', linewidth=1.2)

        # Glow lines
        glow_color = '#06b6d4'
        for lw in [8, 5, 3]:
            ax.plot(x_vals, y_vals, color=glow_color, linewidth=lw, alpha=0.15)
        
        # Shaded area under curve for integrals
        if is_integral:
            ax.fill_between(x_vals, y_vals, 0, color='#06b6d4', alpha=0.22, label="Diện tích tích phân ∫")
        
        # Crisp foreground curve
        ax.plot(x_vals, y_vals, color='#22d3ee', linewidth=2.2, label=curve_label)

        # Title
        ax.set_title(plot_title, color='#f8fafc', fontsize=14, pad=16, fontfamily='monospace', fontweight='bold')
        ax.set_xlabel(x_label_title, color='#64748b', fontsize=10)
        ax.set_ylabel(y_label_title, color='#64748b', fontsize=10)

        # Vector SVG export
        svg_buffer = io.StringIO()
        plt.savefig(svg_buffer, format='svg', bbox_inches='tight', transparent=True)
        plt.close(fig)
        
        return svg_buffer.getvalue()

    except Exception as e:
        return f"<svg viewBox='0 0 400 100' xmlns='http://www.w3.org/2000/svg'><rect width='400' height='100' fill='#0f172a'/><text x='20' y='55' fill='#f43f5e' font-family='monospace' font-size='13'>Lỗi phân tích đồ thị: {str(e)}</text></svg>"

