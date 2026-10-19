"""
Router: POST /api/v1/companion/evaluate-step & POST /api/v1/companion/verify-voice-gate
Feature 6: Socratic AI Companion (3-Tier Symbolic-First, LLM-Last Architecture)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import time
import re

from symbolic.sympy_verifier import verify_algebraic_equivalence
from symbolic.chem_balancer import verify_chemical_equation
from symbolic.socratic_guard import evaluate_student_message, normalize_text
from cache.chroma_semantic_cache import lookup_semantic_cache
from llm.provider_adapter import generate_socratic_guidance

router = APIRouter(prefix="/api/v1/companion", tags=["Socratic Student Companion"])


class EvaluateStepRequest(BaseModel):
    student_id: Optional[str] = "student_default"
    session_id: Optional[str] = "session_default"
    subject: str = "CHEMISTRY" # MATH | PHYSICS | CHEMISTRY | BIOLOGY
    step_index: int = 1
    total_steps: Optional[int] = 4
    input_type: str = "FORMULA" # FORMULA | TEXT | EQUATION
    student_answer: Optional[str] = None
    student_input: Optional[str] = None
    expected_answer: Optional[str] = None
    problem_context: Optional[str] = None
    concept: Optional[str] = None
    conversation_history: Optional[List[Any]] = None


class VisualDebuggerConfig(BaseModel):
    widget_type: str
    payload: Dict[str, Any]


class SocraticStepEvaluation(BaseModel):
    verification_source: str # SYMPY_DETERMINISTIC | CHROMADB_CACHE | LLM_FALLBACK | GUARDRAIL_RULES
    is_step_correct: bool
    error_category: Optional[str] = None
    step_status: str # IN_PROGRESS | UNLOCKED_NEXT | CONCEPT_CHECK_REQUIRED | COMPLETED | RETRY
    socratic_feedback: str
    feedback: Optional[str] = None
    status: Optional[str] = None
    visual_debugger: Optional[VisualDebuggerConfig] = None
    eureka_points_delta: int


class VoiceGateRequest(BaseModel):
    student_id: Optional[str] = "student_default"
    session_id: Optional[str] = "session_default"
    transcribed_speech: Optional[str] = None
    transcript: Optional[str] = None
    expected_keywords: Optional[List[str]] = None
    concept: Optional[str] = None
    # Number of FAILED attempts the student overcame in the scaffolding steps before reaching the gate.
    scaffold_attempts: Optional[int] = None


class VoiceGateResponse(BaseModel):
    passed: bool
    matched_keywords: List[str]
    missing_keywords: List[str]
    eureka_points_multiplier: float
    eureka_awarded: int
    eureka_points_awarded: int = 0
    feedback: str


# Grit economy: productive struggle is rewarded more than a lucky one-shot answer.
EUREKA_GRIT_AWARD = 50      # overcame >= 1 failed scaffolding attempt (or legacy request)
EUREKA_ONESHOT_AWARD = 20   # solved everything on the first try
EUREKA_PARTIAL_AWARD = 10   # explanation incomplete


def compute_gate_award(scaffold_attempts: Optional[int]) -> int:
    if scaffold_attempts is None or scaffold_attempts >= 1:
        return EUREKA_GRIT_AWARD
    return EUREKA_ONESHOT_AWARD


def enforce_socratic_anti_cheat_guardrail(
    feedback: str,
    expected_answer: Optional[str],
    step_index: int,
    total_steps: int = 4
) -> str:
    """
    Socratic Anti-Cheat Guardrail (Intentional Cognitive Friction) — OUTPUT side.
    Strictly blocks any output leaking final answers or numerical results.
    NOTE: `step_index` is client-controlled, so it is NEVER used to skip sanitisation
    (previously step_index >= total_steps disabled the filter = trivial bypass).
    """
    clean = feedback or ""
    if expected_answer:
        exp_clean = expected_answer.strip()
        nums = re.findall(r'\d+(?:\.\d+)?', exp_clean)
        for num in nums:
            pattern = re.compile(rf'(?:đáp án|kết quả|bằng|là|chính là|=)\s*{re.escape(num)}', re.IGNORECASE)
            if pattern.search(clean):
                clean = pattern.sub("hãy tự tính toán theo công thức", clean)
            # Multi-digit / decimal tokens are unambiguous answers -> scrub wherever they appear
            if len(num) >= 2 or '.' in num:
                clean = re.sub(rf'(?<![\d.]){re.escape(num)}(?![\d.])', '[…]', clean)

        if exp_clean and exp_clean in clean:
            clean = clean.replace(exp_clean, "[Dữ liệu cần suy luận]")

    # Check for direct answer leaks
    leak_pattern = re.compile(r'(?:đáp án là|đáp số là|kết quả cuối cùng là|kết quả là)\s*[^.,?!]+', re.IGNORECASE)
    if leak_pattern.search(clean):
        clean = leak_pattern.sub("hãy quan sát hiện tượng và từng bước chứng minh", clean)

    return clean


@router.post("/evaluate-step", response_model=SocraticStepEvaluation)
async def evaluate_step(req: EvaluateStepRequest):
    """
    Tier 0 (Input Guard, <1ms, 0 API Call) ->
    Tier 1 (SymPy / ChemBalancer, <10ms, 0 API Call) ->
    Tier 2 (ChromaDB Vector Cache, >0.90 similarity, 0 API Call) ->
    Tier 3 (Socratic LLM Fallback)
    """
    answer = (req.student_answer or req.student_input or "").strip()
    subj = req.subject.upper()

    # =========================================================================
    # TIER 0: RED-TEAM INPUT GUARD (prompt injection / answer extraction / oracle / urgency)
    # Deterministic: never reaches the LLM, never echoes the expected answer.
    # =========================================================================
    verdict = evaluate_student_message(answer, subject=subj, step_index=req.step_index)
    if verdict.blocked:
        sanitized = enforce_socratic_anti_cheat_guardrail(verdict.message, req.expected_answer, req.step_index)
        return SocraticStepEvaluation(
            verification_source="GUARDRAIL_RULES",
            is_step_correct=False,
            error_category=verdict.category,
            step_status="IN_PROGRESS",
            status="RETRY",
            socratic_feedback=sanitized,
            feedback=sanitized,
            visual_debugger=None,
            eureka_points_delta=0,
        )

    is_conversational = req.input_type == "TEXT" or any(kw in answer.lower() for kw in ["đáp án", "giúp", "không hiểu", "tại sao", "như thế nào", "?"])
    
    # =========================================================================
    # TIER 1: SYMBOLIC / DETERMINISTIC VERIFICATION (0 API CALL, <10ms)
    # =========================================================================
    if not is_conversational and ("CHEM" in subj or "->" in answer or "=" in answer and ("Fe" in answer or "O" in answer or "H" in answer)):
        chem_res = verify_chemical_equation(answer)
        is_correct = chem_res["is_balanced"]
        debugger = None
        if chem_res.get("visual_debugger"):
            debugger = VisualDebuggerConfig(
                widget_type=chem_res["visual_debugger"]["widget_type"],
                payload=chem_res["visual_debugger"]["payload"]
            )
            
        status = "UNLOCKED_NEXT" if is_correct else "IN_PROGRESS"
        pts = 20 if is_correct else 5
        sanitized_feedback = enforce_socratic_anti_cheat_guardrail(chem_res["feedback"], req.expected_answer, req.step_index)
        
        return SocraticStepEvaluation(
            verification_source="SYMPY_DETERMINISTIC",
            is_step_correct=is_correct,
            error_category=chem_res["error_category"],
            step_status=status,
            socratic_feedback=sanitized_feedback,
            visual_debugger=debugger,
            eureka_points_delta=pts
        )
        
    elif not is_conversational and ("MATH" in subj or "PHYS" in subj) and req.expected_answer:
        sym_res = verify_algebraic_equivalence(answer, req.expected_answer)
        is_correct = sym_res["is_equivalent"]
        status = "UNLOCKED_NEXT" if is_correct else "IN_PROGRESS"
        pts = 20 if is_correct else 5
        sanitized_feedback = enforce_socratic_anti_cheat_guardrail(sym_res["feedback"], req.expected_answer, req.step_index)
        
        return SocraticStepEvaluation(
            verification_source="SYMPY_DETERMINISTIC",
            is_step_correct=is_correct,
            error_category=sym_res["error_category"],
            step_status=status,
            socratic_feedback=sanitized_feedback,
            visual_debugger=None,
            eureka_points_delta=pts
        )
        
    # =========================================================================
    # TIER 2: CHROMADB SEMANTIC CACHE LOOKUP (0 API CALL, >0.90 SIMILARITY)
    # =========================================================================
    cache_hit = lookup_semantic_cache(answer, subj)
    if cache_hit:
        scaff = cache_hit["scaffolding"]
        debugger = None
        if scaff.get("visual_debugger_type"):
            debugger = VisualDebuggerConfig(
                widget_type=scaff["visual_debugger_type"],
                payload={"hint": scaff.get("hint", "")}
            )
        sanitized_feedback = enforce_socratic_anti_cheat_guardrail(scaff["socratic_question"], req.expected_answer, req.step_index)
            
        return SocraticStepEvaluation(
            verification_source="CHROMADB_CACHE",
            is_step_correct=False,
            error_category="CONCEPTUAL_MISALIGNMENT",
            step_status="IN_PROGRESS",
            socratic_feedback=sanitized_feedback,
            visual_debugger=debugger,
            eureka_points_delta=10
        )
        
    # =========================================================================
    # TIER 3: SOCRATIC LLM FALLBACK (Intentional Cognitive Friction)
    # =========================================================================
    llm_res = generate_socratic_guidance(answer, req.step_index, subj)
    sanitized_feedback = enforce_socratic_anti_cheat_guardrail(llm_res["socratic_question"], req.expected_answer, req.step_index)
    return SocraticStepEvaluation(
        verification_source="LLM_FALLBACK",
        is_step_correct=False,
        error_category=None,
        step_status="IN_PROGRESS",
        socratic_feedback=sanitized_feedback,
        visual_debugger=None,
        eureka_points_delta=5
    )


@router.post("/verify-voice-gate", response_model=VoiceGateResponse)
async def verify_voice_gate(req: VoiceGateRequest):
    """
    Feature 6.4: Reverse-Questioning Gate (Chốt chặn Giọng nói)
    Validates that student verbally articulated the underlying concept before Eureka boost.
    Matching is diacritic-insensitive (speech-to-text often drops tone marks).
    """
    raw_speech = req.transcribed_speech or req.transcript or ""
    speech_norm = normalize_text(raw_speech)

    keywords = req.expected_keywords or []
    if not keywords and req.concept:
        c_low = req.concept.lower()
        if "bảo toàn" in c_low or "khối lượng" in c_low:
            keywords = ["bảo toàn", "nguyên tố", "bằng nhau"]
        elif "vận tốc" in c_low or "chu kì" in c_low:
            keywords = ["vận tốc", "chu kì"]
        else:
            keywords = [req.concept]
    if not keywords:
        keywords = ["bảo toàn", "nguyên tố"]

    matched = []
    missing = []

    for kw in keywords:
        if normalize_text(kw) in speech_norm:
            matched.append(kw)
        else:
            missing.append(kw)

    # Need at least 60% keyword concept coverage
    pass_threshold = 0.6
    coverage = len(matched) / max(len(keywords), 1)
    passed = coverage >= pass_threshold

    if passed:
        awarded = compute_gate_award(req.scaffold_attempts)
        multiplier = 2.0 if awarded >= EUREKA_GRIT_AWARD else 1.0
        if awarded >= EUREKA_GRIT_AWARD:
            feedback = f"Thuyết phục tuyệt vời! Em đã kiên trì vượt qua các bước và nắm vững bản chất ({', '.join(matched)}). Thưởng Grit +{awarded} Eureka!"
        else:
            feedback = f"Chính xác! Em giải thích đúng bản chất ({', '.join(matched)}). +{awarded} Eureka — thử thách khó hơn sẽ nhận thêm điểm Grit!"
    else:
        multiplier = 1.0
        awarded = EUREKA_PARTIAL_AWARD
        feedback = f"Em đã nói đúng một phần, nhưng còn thiếu các từ khóa then chốt: {', '.join(missing)}. Hãy thử giải thích rõ hơn!"

    return VoiceGateResponse(
        passed=passed,
        matched_keywords=matched,
        missing_keywords=missing,
        eureka_points_multiplier=multiplier,
        eureka_awarded=awarded,
        eureka_points_awarded=awarded,
        feedback=feedback
    )
