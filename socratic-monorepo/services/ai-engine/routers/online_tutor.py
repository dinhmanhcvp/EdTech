"""Server-owned assessment catalog v1; no caller-supplied answer keys."""
import json
import re
import hashlib
import sympy as sp
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
import student_context as store
from security import require_roles

router = APIRouter(prefix='/api/v1/student/tutor', tags=['Online Tutor'])
CATALOG = {
    'hw-phys-1': {'kc': 'PHYSICS_PROJECTILE', 'prior': .25, 'answers': [r'v_x = v_0\cos\alpha', r'y = h + v_0\sin\alpha t - \frac{1}{2}gt^2']},
    'hw-chem-1': {'kc': 'CHEM_REDOX', 'prior': .20, 'answers': [r'n_{\text{Fe}} = 0.2\text{ mol}, \quad n_{\text{O}_2} = 0.2\text{ mol}', r'\frac{0.2}{4} < \frac{0.2}{3}']},
    'hw-math-1': {'kc': 'MATH_TRIG', 'prior': .35, 'answers': [r'T = \frac{2\pi}{\omega} = \frac{2\pi}{3}']},
}

def normalize(value):
    value = re.sub(r'\\text\{([^{}]*)\}', r'\1', value)
    for _ in range(5):
        value = re.sub(r'\\frac\{([^{}]+)\}\{([^{}]+)\}', r'((\1)/(\2))', value)
    for name in ['alpha', 'omega', 'pi', 'sin', 'cos', 'quad']:
        value = value.replace('\\' + name, '' if name == 'quad' else name + ' ')
    value = re.sub(r'_\{([^{}]+)\}', r'\1', value).replace('_', '')
    value = value.replace('{', '(').replace('}', ')')
    return re.sub(r'\s+', '', value).replace('^', '**')

def verdict(answer, expected):
    a, b = normalize(answer), normalize(expected)
    if a == b: return True
    # Restricted scalar grammar: no eval/parse_expr, attributes or arbitrary calls.
    # Unknown LaTeX/units/prose are unverified, never automatically incorrect.
    if ',' in a or ',' in b or '<' in a or '<' in b:
        return None
    import ast
    symbols = {name: sp.Symbol(name) for name in ['vx', 'v0', 'alpha', 'y', 'h', 'g', 't', 'T', 'omega']}
    def parse(s):
        def walk(n):
            if isinstance(n, ast.Constant) and type(n.value) in (float, int): return sp.Rational(str(n.value))
            if isinstance(n, ast.Name): return sp.pi if n.id == 'pi' else symbols[n.id]
            if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.USub, ast.UAdd)): return -walk(n.operand) if isinstance(n.op, ast.USub) else walk(n.operand)
            if isinstance(n, ast.BinOp):
                l, r = walk(n.left), walk(n.right)
                if isinstance(n.op, ast.Add): return l+r
                if isinstance(n.op, ast.Sub): return l-r
                if isinstance(n.op, ast.Mult): return l*r
                if isinstance(n.op, ast.Div): return l/r
                if isinstance(n.op, ast.Pow) and r.is_number and abs(r) <= 6: return l**r
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in ('sin', 'cos') and len(n.args) == 1 and not n.keywords:
                return getattr(sp, n.func.id)(walk(n.args[0]))
            raise ValueError('unsupported')
        return walk(ast.parse(s, mode='eval').body)
    # Explicit alternate plain-math representation of the physics catalog.
    b = b.replace('v0cosalpha', 'v0*cos(alpha)').replace('v0sinalphat', 'v0*sin(alpha)*t').replace(')gt', ')*g*t')
    try:
        aa, bb = a.split('='), b.split('=')
        if len(aa) != len(bb): return None
        return all(sp.simplify(parse(x) - parse(y)) == 0 for x, y in zip(aa, bb))
    except (ValueError, KeyError, SyntaxError, TypeError): return None

class Attempt(BaseModel):
    model_config = ConfigDict(extra='forbid')
    problem_id: str = Field(max_length=60)
    step: int = Field(ge=1, le=20)
    answer: str = Field(min_length=1, max_length=200)
    request_id: str = Field(min_length=1, max_length=80)

def init_tutor_tables(conn):
    conn.executescript('CREATE TABLE IF NOT EXISTS tutor_attempts(student TEXT, request TEXT, fingerprint TEXT, result TEXT, PRIMARY KEY(student,request)); CREATE TABLE IF NOT EXISTS tutor_progress(student TEXT, problem TEXT, step INTEGER, mastery REAL, PRIMARY KEY(student,problem));')

def progress_snapshot(conn, student_id):
    rows = {r['problem']: r for r in conn.execute('SELECT problem,step,mastery FROM tutor_progress WHERE student=?', (student_id,))}
    problems = [{'problem_id': pid, 'kc_id': p['kc'], 'step_count': len(p['answers']),
                 'completed_step': rows[pid]['step'] if pid in rows else 0,
                 'mastery': rows[pid]['mastery'] if pid in rows else p['prior']}
                for pid, p in CATALOG.items()]
    return {'catalog_version': 1, 'total_points': sum(r['step'] * 20 for r in rows.values()), 'problems': problems}

@router.get('/{student_id}/progress')
def progress(student_id: str, claims: dict = Depends(require_roles({'student', 'admin'}))):
    if claims['role'] == 'student' and claims['subject'] != student_id:
        raise HTTPException(403, 'student_subject_mismatch')
    with store._LOCK, store._connect() as conn:
        init_tutor_tables(conn)
        return progress_snapshot(conn, student_id)

@router.post('/{student_id}/attempts')
def attempt(student_id: str, req: Attempt, claims: dict = Depends(require_roles({'student', 'admin'}))):
    if claims['role'] == 'student' and claims['subject'] != student_id: raise HTTPException(403, 'student_subject_mismatch')
    problem = CATALOG.get(req.problem_id)
    if not problem or req.step > len(problem['answers']): raise HTTPException(404, 'unknown_catalog_step')
    fingerprint = hashlib.sha256(req.model_dump_json().encode()).hexdigest()
    with store._LOCK, store._connect() as conn:
        init_tutor_tables(conn)
        conn.execute('BEGIN IMMEDIATE')
        cached = conn.execute('SELECT fingerprint,result FROM tutor_attempts WHERE student=? AND request=?', (student_id, req.request_id)).fetchone()
        if cached:
            if cached['fingerprint'] != fingerprint: raise HTTPException(409, 'request_id_reused')
            # Keep the assessment immutable, but never replay an obsolete balance.
            return {**json.loads(cached['result']), 'progress': progress_snapshot(conn, student_id)}
        row = conn.execute('SELECT step,mastery FROM tutor_progress WHERE student=? AND problem=?', (student_id, req.problem_id)).fetchone()
        completed, mastery = (row['step'], row['mastery']) if row else (0, problem['prior'])
        if req.step > completed + 1: raise HTTPException(409, 'step_locked')
        correct = verdict(req.answer, problem['answers'][req.step-1])
        points = 0
        if correct is not None and req.step > completed:
            likelihood = .92 if correct else .08
            guess = .12 if correct else .88
            posterior = mastery*likelihood / (mastery*likelihood + (1-mastery)*guess)
            mastery = posterior + (1-posterior)*.2
            if correct: completed, points = req.step, 20
            conn.execute('INSERT OR REPLACE INTO tutor_progress VALUES(?,?,?,?)', (student_id, req.problem_id, completed, mastery))
        status = 'UNVERIFIED' if correct is None else 'VERIFIED_CORRECT' if correct else 'VERIFIED_INCORRECT'
        result = {'status': status, 'points': points, 'mastery': mastery, 'completed_step': completed, 'catalog_version': 1, 'feedback': 'Biểu thức đã được xác thực.' if correct else 'Kiểm tra lại hệ số và dấu.' if correct is False else 'Chưa phân tích được biểu thức; thử cú pháp có dấu nhân và ngoặc rõ ràng.'}
        conn.execute('INSERT INTO tutor_attempts VALUES(?,?,?,?)', (student_id, req.request_id, fingerprint, json.dumps(result)))
        return {**result, 'progress': progress_snapshot(conn, student_id)}
