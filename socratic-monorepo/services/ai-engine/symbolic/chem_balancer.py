"""
Chemical Stoichiometry Verifier & Atom Counter (Tier 1 Verification Engine - 0 API Call)
Checks chemical equation balance, counts atoms per element on both sides,
and generates Visual Debugger payload (CHEMICAL_BALANCE_SCALE).
"""
import re
import time
from typing import Dict, Any, Tuple


def parse_formula(formula: str) -> Dict[str, int]:
    """
    Parses chemical formula into element counts, e.g. 'Fe2O3' -> {'Fe': 2, 'O': 3}, 'Ca(OH)2' -> {'Ca': 1, 'O': 2, 'H': 2}
    """
    counts: Dict[str, int] = {}
    
    # Simple regex for elements without nested parentheses
    # Expand nested parentheses first
    def expand_parens(match):
        sub = match.group(1)
        mult = int(match.group(2)) if match.group(2) else 1
        elem_matches = re.findall(r'([A-Z][a-z]*)(\d*)', sub)
        expanded = ""
        for elem, num in elem_matches:
            val = int(num) if num else 1
            expanded += f"{elem}{val * mult}"
        return expanded

    formula = re.sub(r'\((.*?)\)(\d*)', expand_parens, formula)

    matches = re.findall(r'([A-Z][a-z]*)(\d*)', formula)
    for elem, num in matches:
        val = int(num) if num else 1
        counts[elem] = counts.get(elem, 0) + val
        
    return counts


def parse_side(side_str: str) -> Tuple[Dict[str, int], Dict[str, int]]:
    """
    Parses a side like '4Fe + 3O2' or 'Fe + O2'
    Returns:
        total_atoms: {'Fe': 4, 'O': 6}
        species_coefficients: {'Fe': 4, 'O2': 3}
    """
    total_atoms: Dict[str, int] = {}
    species: Dict[str, int] = {}
    
    terms = [t.strip() for t in side_str.split('+') if t.strip()]
    for term in terms:
        # Match leading coefficient e.g. 4Fe or 2H2O
        coeff_match = re.match(r'^(\d+)\s*(.*)$', term)
        if coeff_match:
            coeff = int(coeff_match.group(1))
            molecule = coeff_match.group(2).strip()
        else:
            coeff = 1
            molecule = term.strip()
            
        species[molecule] = coeff
        atom_dict = parse_formula(molecule)
        for elem, count in atom_dict.items():
            total_atoms[elem] = total_atoms.get(elem, 0) + count * coeff
            
    return total_atoms, species


def verify_chemical_equation(equation_str: str) -> Dict[str, Any]:
    """
    Evaluates student's chemical equation (e.g., '4Fe + 3O2 -> 2Fe2O3' or 'Fe + O2 -> Fe2O3')
    Returns:
        {
            "is_balanced": bool,
            "verification_time_ms": float,
            "error_category": Optional[str],
            "left_atoms": Dict[str, int],
            "right_atoms": Dict[str, int],
            "imbalanced_elements": list,
            "visual_debugger": Dict[str, Any],
            "feedback": str
        }
    """
    start_time = time.perf_counter()
    arrow_pattern = r'->|=>|→|='
    parts = re.split(arrow_pattern, equation_str)
    
    if len(parts) != 2:
        elapsed = (time.perf_counter() - start_time) * 1000
        return {
            "is_balanced": False,
            "verification_time_ms": round(elapsed, 2),
            "error_category": "FORMULA_MISMATCH",
            "left_atoms": {},
            "right_atoms": {},
            "imbalanced_elements": [],
            "visual_debugger": None,
            "feedback": "Phương trình hóa học phải có 2 vế ngăn cách bởi mũi tên '->'."
        }
        
    left_side = parts[0].strip()
    right_side = parts[1].strip()
    
    left_atoms, _ = parse_side(left_side)
    right_atoms, _ = parse_side(right_side)
    
    all_elements = set(left_atoms.keys()) | set(right_atoms.keys())
    imbalanced = []
    
    for elem in all_elements:
        l_cnt = left_atoms.get(elem, 0)
        r_cnt = right_atoms.get(elem, 0)
        if l_cnt != r_cnt:
            imbalanced.append({"element": elem, "left": l_cnt, "right": r_cnt})
            
    is_balanced = (len(imbalanced) == 0)
    elapsed = (time.perf_counter() - start_time) * 1000
    
    visual_debugger = {
        "widget_type": "CHEMICAL_BALANCE_SCALE",
        "payload": {
            "left_atoms": left_atoms,
            "right_atoms": right_atoms,
            "equation": equation_str,
            "imbalanced": imbalanced
        }
    }
    
    if is_balanced:
        feedback = f"Phương trình đã cân bằng hoàn hảo! Bảo toàn nguyên tố trên cả hai vế."
        return {
            "is_balanced": True,
            "verification_time_ms": round(elapsed, 2),
            "error_category": None,
            "left_atoms": left_atoms,
            "right_atoms": right_atoms,
            "imbalanced_elements": [],
            "visual_debugger": visual_debugger,
            "feedback": feedback
        }
    else:
        # Construct helpful Socratic guidance
        elem_details = ", ".join([f"{item['element']} (Trái: {item['left']}, Phải: {item['right']})" for item in imbalanced])
        feedback = f"Gần đúng rồi! Em hãy nhìn lên chiếc cân bên dưới: Số nguyên tử chưa cân bằng ở: {elem_details}."
        return {
            "is_balanced": False,
            "verification_time_ms": round(elapsed, 2),
            "error_category": "STOICHIOMETRY_IMBALANCE",
            "left_atoms": left_atoms,
            "right_atoms": right_atoms,
            "imbalanced_elements": imbalanced,
            "visual_debugger": visual_debugger,
            "feedback": feedback
        }
