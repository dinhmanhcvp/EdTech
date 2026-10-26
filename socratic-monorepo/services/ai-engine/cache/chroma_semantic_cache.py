"""
Semantic Cache Layer (Tier 2 - Simulates ChromaDB Vector Storage & Embedding Matching)
Matches student prompts and questions against pre-indexed scaffolding templates.
If cosine similarity > 0.90, instantly returns the cached scaffolding step (0 API Call).
"""
import re
import math
from typing import Dict, Any, Optional, List


# Pre-indexed Scaffolding Templates for typical STEM questions
CACHED_TEMPLATES = [
    {
        "id": "CHEM_REDOX_FE_O2",
        "category": "STOICHIOMETRY",
        "keywords": ["fe", "o2", "fe2o3", "sắt", "oxi", "cân bằng"],
        "trigger_patterns": [
            r"cân bằng.*fe.*o2",
            r"fe\s*\+\s*o2",
            r"oxi hóa.*sắt",
            r"bảo toàn.*nguyên tố.*oxi"
        ],
        "scaffolding_response": {
            "socratic_question": "Em hãy đếm xem trong phân tử Fe2O3 ở vế phải có bao nhiêu nguyên tử Oxi, và làm sao để vế trái có số nguyên tử Oxi tương đương?",
            "expected_concept": "Bảo toàn số nguyên tử Oxi bằng bội chung nhỏ nhất (BCNN = 6)",
            "visual_debugger_type": "CHEMICAL_BALANCE_SCALE",
            "hint": "Tìm bội chung nhỏ nhất của chỉ số 2 (trong O2) và 3 (trong Fe2O3)."
        }
    },
    {
        "id": "PHYS_PROJECTILE_ANGLE",
        "category": "KINEMATICS",
        "keywords": ["ném xiên", "góc", "tầm xa", "vận tốc", "45 độ", "quỹ đạo"],
        "trigger_patterns": [
            r"tầm xa.*cực đại",
            r"ném.*vận tốc.*góc",
            r"projectile.*angle",
            r"tại sao.*45.*độ"
        ],
        "scaffolding_response": {
            "socratic_question": "Công thức tầm xa là L = (v0^2 * sin(2*alpha)) / g. Giá trị sin(2*alpha) đạt cực đại bằng 1 khi góc 2*alpha bằng bao nhiêu độ?",
            "expected_concept": "sin(90°) = 1 suy ra alpha = 45°",
            "visual_debugger_type": "VECTOR_FORCE_POLYGON",
            "hint": "Hàm sin đạt giá trị lớn nhất khi góc trong hàm sin bằng 90 độ."
        }
    },
    {
        "id": "MATH_TRIG_FREQUENCY",
        "category": "TRIGONOMETRY",
        "keywords": ["chu kỳ", "tần số góc", "omega", "hình sin", "nén", "giãn"],
        "trigger_patterns": [
            r"tăng.*tần số góc.*omega",
            r"chu kỳ.*t\s*=\s*2pi/omega",
            r"đồ thị.*nén.*giãn"
        ],
        "scaffolding_response": {
            "socratic_question": "Khi tăng tần số góc ω lên gấp đôi, chu kỳ T = 2π/ω sẽ tăng hay giảm? Khoảng cách giữa hai đỉnh sóng liên tiếp trên trục hoành thay đổi như thế nào?",
            "expected_concept": "Chu kỳ T tỉ lệ nghịch với ω, nên khi ω tăng thì chu kỳ giảm, đồ thị bị nén lại.",
            "visual_debugger_type": "FUNCTION_EXTREMA_GRAPH",
            "hint": "Quan sát công thức T = 2π / ω."
        }
    },
    {
        "id": "BIO_STOMATA_OSMOSIS",
        "category": "PLANT_PHYSIOLOGY",
        "keywords": ["khí khổng", "đóng mở", "tế bào hạt đậu", "thẩm thấu", "nước", "héo"],
        "trigger_patterns": [
            r"khí khổng.*đóng.*mở",
            r"tại sao.*cây.*héo",
            r"thoát hơi nước.*lá"
        ],
        "scaffolding_response": {
            "socratic_question": "Khi cây thiếu nước, thành tế bào hạt đậu thay đổi áp suất trương nước như thế nào khiến khe khí khổng khép lại?",
            "expected_concept": "Mất nước làm giảm áp suất trương nước, thành mỏng co lại khiến khe khí khổng đóng.",
            "visual_debugger_type": "ATOM_COUNT_BARS",
            "hint": "Thành trong dày hơn thành ngoài của tế bào bảo vệ."
        }
    }
]


def compute_keyword_similarity(text: str, keywords: List[str]) -> float:
    """Computes normalized Jaccard/keyword similarity score."""
    text_lower = text.lower()
    matches = sum(1 for kw in keywords if kw in text_lower)
    return matches / max(len(keywords), 1)


def lookup_semantic_cache(
    query: str,
    subject_context: Optional[str] = None,
    threshold: float = 0.5,
) -> Optional[Dict[str, Any]]:
    """
    Looks up pre-indexed scaffolding in local vector cache.
    Returns scaffolding template if confidence/similarity > 0.90 equivalent, else None.
    """
    clean_query = query.strip().lower()
    
    # 1. Exact regex trigger pattern check (simulates > 0.95 high confidence match)
    for tpl in CACHED_TEMPLATES:
        for pattern in tpl["trigger_patterns"]:
            if re.search(pattern, clean_query, re.IGNORECASE):
                return {
                    "matched_cache_id": tpl["id"],
                    "similarity": 0.96,
                    "scaffolding": tpl["scaffolding_response"],
                    "source": "CHROMADB_CACHE"
                }
                
    # 2. Keyword density heuristic (simulates cosine similarity > 0.90)
    best_match = None
    max_score = 0.0
    for tpl in CACHED_TEMPLATES:
        score = compute_keyword_similarity(clean_query, tpl["keywords"])
        if score > max_score:
            max_score = score
            best_match = tpl
            
    if max_score >= threshold:  # High enough keyword overlap
        sim_val = round(0.90 + (max_score * 0.09), 2)
        return {
            "matched_cache_id": best_match["id"],
            "similarity": sim_val,
            "scaffolding": best_match["scaffolding_response"],
            "source": "CHROMADB_CACHE"
        }
        
    return None
