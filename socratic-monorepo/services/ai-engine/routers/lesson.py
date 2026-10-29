"""Board-derived conversational lessons: server grades, the LLM only words the reply."""
import hashlib
import json
from typing import Any, Dict, Iterator, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

import lesson_llm
import lesson_store as ls
import student_context as store
from hub import learning as hub_learning
from hub.auth import claims_from_header
from hub.grading import answer_text, grade_choice
from lesson_builder import build_lesson, lock_question_ids, public_view, title_for_student
from formula_check import check_formula
from security import require_roles
from symbolic.socratic_guard import evaluate_student_message

router = APIRouter(prefix="/api/v1/student/lesson", tags=["Board Lesson"])
POINTS_PER_QUESTION = 20


class TurnRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lesson_id: str = Field(min_length=1, max_length=120)
    scene_id: str = Field(min_length=1, max_length=120)
    question_id: str = Field(min_length=1, max_length=140)
    kind: str = Field(pattern="^(ANSWER|HINT|CHAT)$")
    message: str = Field(max_length=400)
    request_id: str = Field(min_length=1, max_length=80)


def _check_subject(student_id: str, claims: dict) -> None:
    if claims["role"] == "student" and claims["subject"] != student_id:
        raise HTTPException(403, "student_subject_mismatch")


def _check_hub_student(student_id: str, authorization: Optional[str]) -> None:
    """Bài học của một tiết hub ghi vào chỉ số lớp: luôn cần token học sinh của hub, kể cả khi chạy local."""
    if claims_from_header(authorization, {"student"})["subject"] != student_id:
        raise HTTPException(403, "student_subject_mismatch")


def _sse(event: str, data: Dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _stream(result: Dict[str, Any]) -> StreamingResponse:
    def body() -> Iterator[str]:
        for chunk in lesson_llm.chunk_text(result["tutor_text"]):
            yield _sse("token", {"text": chunk})
        yield _sse("done", result)

    return StreamingResponse(body(), media_type="text/event-stream", headers={"Cache-Control": "no-store"})


@router.get("/{student_id}")
def get_lesson(student_id: str, class_id: str = "12A1", session_id: Optional[str] = None,
               authorization: Optional[str] = Header(default=None), claims: dict = Depends(require_roles({"student", "admin"}))):
    _check_subject(student_id, claims)
    if session_id:
        _check_hub_student(student_id, authorization)
        try:
            plan, keys = hub_learning.session_lesson(student_id, session_id)
        except KeyError:
            raise HTTPException(404, "not_found")
    else:
        plan, keys = build_lesson(store.context_snapshot(student_id, class_id), student_id)
    with store._LOCK, store._connect() as conn:
        ls.init_lesson_tables(conn)
        ls.save_lesson(conn, student_id, plan, keys)
        return public_view(plan, ls.solved_questions(conn, student_id, plan["lesson_id"]), keys)


@router.post("/{student_id}/turn")
def lesson_turn(student_id: str, req: TurnRequest, authorization: Optional[str] = Header(default=None),
                claims: dict = Depends(require_roles({"student", "admin"}))):
    _check_subject(student_id, claims)
    fingerprint = hashlib.sha256(req.model_dump_json().encode()).hexdigest()
    with store._LOCK, store._connect() as conn:
        ls.init_lesson_tables(conn)
        # đọc trước BEGIN IMMEDIATE: hub mở kết nối riêng (có thể tạo schema) nên không được chờ khóa ghi của kết nối này
        loaded = ls.load_lesson(conn, student_id, req.lesson_id)
        hub_session = hub_learning.is_hub_lesson(loaded[0]) if loaded else False
        if hub_session:
            _check_hub_student(student_id, authorization)
        conn.execute("BEGIN IMMEDIATE")
        cached = ls.get_turn(conn, student_id, req.request_id)
        if cached:
            if cached["fingerprint"] != fingerprint:
                raise HTTPException(409, "request_id_reused")
            result = cached["result"]
            if not str(result.get("tutor_text", "")).strip():  # reply never finished (crash/timeout): never replay silence
                result = {**result, "source": "FALLBACK", "tutor_text": lesson_llm.fallback_reply(
                    lesson_llm.TutorContext("", "", "", "EXPLAIN_BACK", result.get("status", "NONE"), ""))}
                ls.update_turn_result(conn, student_id, req.request_id, result)
            return _stream(result)
        if not loaded:
            raise HTTPException(404, "unknown_lesson_question")
        plan, keys = loaded
        scene = next((s for s in plan["scenes"] if s["id"] == req.scene_id), None)
        order = [q["id"] for s in plan["scenes"] for q in s["questions"]]
        question = next((q for q in (scene or {"questions": []})["questions"] if q["id"] == req.question_id), None)
        if not scene or not question:
            raise HTTPException(404, "unknown_lesson_question")

        expected: Optional[str] = keys.get(question["id"])
        message = req.message.strip()
        status, points, blocked_text = "NONE", 0, None
        llm_message = "" if req.kind == "HINT" else message
        keep_message = bool(message)
        if req.kind == "ANSWER" and expected is not None:
            llm_message = ""  # an expression answer is graded by the server, never forwarded to the model
            keep_message = False
            if message:
                correct = grade_choice(message, expected) if expected.startswith("choice:") else check_formula(message, expected)
                if correct is None:
                    status = "UNVERIFIED"
                elif correct:
                    status = "VERIFIED_CORRECT"
                    if ls.mark_solved(conn, student_id, req.lesson_id, question["id"]):
                        points = POINTS_PER_QUESTION
                else:
                    status = "VERIFIED_INCORRECT"
        elif req.kind != "HINT" and message:
            guard = evaluate_student_message(message, scene["subject"], 1)
            if guard.blocked:
                keep_message = False
                blocked_text = guard.message or lesson_llm.fallback_reply(
                    lesson_llm.TutorContext(scene["title"], scene["concept"], question["prompt"], question["kind"], "NONE", ""))

        hint_level = 0
        if req.kind == "HINT":
            hint_level = min(4, ls.count_hints(conn, student_id, req.lesson_id, question["id"]) + 1)

        advance = status == "VERIFIED_CORRECT" or (req.kind == "ANSWER" and expected is None and blocked_text is None and bool(message))
        position = order.index(question["id"])
        next_id = (order[position + 1] if position + 1 < len(order) else None) if advance else None
        result = {"status": status, "points": points, "tutor_text": "", "source": "FALLBACK", "next_question_id": next_id}
        ls.insert_turn(conn, student_id, req.request_id, fingerprint, req.lesson_id, question["id"], req.kind,
                       message if keep_message and req.kind != "HINT" else "", result)
        solved = ls.solved_questions(conn, student_id, req.lesson_id)
        order_of_scene = next(i for i, s in enumerate(plan["scenes"]) if s["id"] == scene["id"])
        scene_solved = all(qid in solved for qid in lock_question_ids(scene) if qid in keys)
        profile = store.get_profile(student_id)
        # only mistakes from the scene's own subject: a physics slip must not steer a maths lesson
        errors = [e["diagnosis"] for e in store.list_errors(student_id, 12) if str(e.get("subject", "")).upper() == scene["subject"]][:3]
        history = ls.recent_turns(conn, student_id, req.lesson_id, 2)
        conn.commit()
    if hub_session:  # tiết có giáo án: lượt này thành sự kiện học tập → mastery → chỉ số realtime cho giáo viên
        repeat_correct = status == "VERIFIED_CORRECT" and points == 0  # câu đã giải từ trước: không cộng thêm bằng chứng BKT
        hub_learning.record_turn(student_id, plan["session_id"], scene["id"], question["id"], req.kind, status, message,
                                 req.request_id, update_mastery=not repeat_correct)

    if blocked_text is not None:
        text, source = blocked_text, "FALLBACK"
    else:
        ctx = lesson_llm.TutorContext(
            scene_title=title_for_student(scene, order_of_scene, keys, solved), concept=scene["concept"] if scene_solved else "", question_prompt=question["prompt"], kind=question["kind"],
            status=status, subject=scene["subject"], student_message=llm_message, profile=profile, recent_errors=errors,
            recent_turns=history[:-1] if history and history[-1][0] == "student" else history, hint_level=hint_level)
        # The formula hidden by public_view must not leak through any question of its scene;
        # once the scene is solved it is on the student's screen, so the tutor may refer to it.
        # A plan exercise or poll of a hub lesson has its own key: it must not leak while that question is unsolved.
        leak_keys = [] if scene_solved else [keys[qid] for qid in lock_question_ids(scene) if qid in keys]
        if expected is not None and question["id"] not in solved:
            leak_keys.append(answer_text(expected))
        text, source = lesson_llm.generate_reply(ctx, leak_keys)
    result = {**result, "tutor_text": text, "source": source}
    with store._LOCK, store._connect() as conn:
        ls.update_turn_result(conn, student_id, req.request_id, result)
    return _stream(result)
