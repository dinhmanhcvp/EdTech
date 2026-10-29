import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
import student_context as store
from lesson_builder import build_lesson
import lesson_store


@pytest.fixture
def conn(tmp_path, monkeypatch):
    monkeypatch.setattr(store, 'DB_PATH', tmp_path / 'lesson.db')
    store.init_store()
    c = store._connect()
    lesson_store.init_lesson_tables(c)
    yield c
    c.close()


def snapshot():
    return store._fallback_snapshot('s1')


def test_builds_one_scene_per_board_snapshot():
    plan, keys = build_lesson(snapshot(), 's1')
    assert len(plan['scenes']) == 3
    for scene in plan['scenes']:
        kinds = [q['kind'] for q in scene['questions']]
        assert 'COMPUTE' in kinds and 'EXPLAIN_BACK' in kinds
    assert plan['lesson_id'] == 'demo-12a1-today:s1'
    assert plan['scenes'][0]['questions'][0]['id'] == 'board-rlc:q1'
    assert set(keys) == {q['id'] for s in plan['scenes'] for q in s['questions'] if q['kind'] == 'COMPUTE'}


def test_public_plan_has_no_answer_keys():
    plan, keys = build_lesson(snapshot(), 's1')
    for q in (q for s in plan['scenes'] for q in s['questions']):
        assert set(q) == {'id', 'scene_id', 'kind', 'prompt', 'hint_count'}
        assert q['hint_count'] == 4
        for expected in keys.values():
            assert expected not in q['prompt']


def test_error_work_adds_find_error_question():
    snap = snapshot()
    snap['studentWork'] = [{'id': 'w', 'title': 'Bài chữa', 'subject': 'PHYSICS', 'capturedAt': '09:58', 'confidence': .7,
                            'lines': [{'id': 'l1', 'latex': 'U = U_R + U_L', 'status': 'error', 'diagnosis': 'Cần cộng vector.'}], 'remediation': ''}]
    plan, _ = build_lesson(snap, 's1')
    physics = [s for s in plan['scenes'] if s['subject'] == 'PHYSICS']
    assert any(q['kind'] == 'FIND_ERROR' for q in physics[0]['questions'])
    chem = [s for s in plan['scenes'] if s['subject'] == 'CHEMISTRY']
    assert not any(q['kind'] == 'FIND_ERROR' for s in chem for q in s['questions'])


def test_empty_snapshot_gives_empty_plan_not_error():
    plan, keys = build_lesson({'boardSnapshots': [], 'studentWork': []}, 's1')
    assert plan['scenes'] == [] and keys == {}
    plan, keys = build_lesson({}, 's1')
    assert plan['scenes'] == [] and keys == {}


def test_store_roundtrip_and_mark_solved_only_once(conn):
    plan, keys = build_lesson(snapshot(), 's1')
    lesson_store.save_lesson(conn, 's1', plan, keys)
    loaded_plan, loaded_keys = lesson_store.load_lesson(conn, 's1', plan['lesson_id'])
    assert loaded_plan == json.loads(json.dumps(plan)) and loaded_keys == keys
    assert lesson_store.load_lesson(conn, 's2', plan['lesson_id']) is None
    qid = next(iter(keys))
    assert lesson_store.mark_solved(conn, 's1', plan['lesson_id'], qid) is True
    assert lesson_store.mark_solved(conn, 's1', plan['lesson_id'], qid) is False
    assert lesson_store.solved_questions(conn, 's1', plan['lesson_id']) == {qid}


def test_review_questions_from_the_teacher_become_extra_explain_questions():
    snap = {'sessionId': 'lesson-1', 'lessonTitle': 'Dao động', 'boardSnapshots': [
        {'id': 'sec-1', 'subject': 'PHYSICS', 'title': 'A', 'latex': 'x = A', 'note': ''},
        {'id': 'sec-2', 'subject': 'PHYSICS', 'title': 'B', 'latex': '', 'note': 'n'}],
        'studentWork': [], 'reviewQuestions': ['Q1?', 'Q2?', 'Q3?']}
    plan, keys = build_lesson(snap, 's1')
    extra = [(s['id'], q['prompt']) for s in plan['scenes'] for q in s['questions'] if q['prompt'] in ('Q1?', 'Q2?', 'Q3?')]
    # round-robin across scenes (Q1->sec-1, Q2->sec-2, Q3->sec-1), listed scene by scene
    assert extra == [('sec-1', 'Q1?'), ('sec-1', 'Q3?'), ('sec-2', 'Q2?')]
    assert all(q['kind'] == 'EXPLAIN_BACK' for s in plan['scenes'] for q in s['questions'] if q['prompt'] in ('Q1?', 'Q2?', 'Q3?'))
    ids = [q['id'] for s in plan['scenes'] for q in s['questions']]
    assert len(ids) == len(set(ids)) and set(keys) == {'sec-1:q1'}  # no answer key for free-form questions


def test_review_questions_are_ignored_when_malformed_or_without_scenes():
    plan, _ = build_lesson({'boardSnapshots': [], 'reviewQuestions': ['Q?']}, 's1')
    assert plan['scenes'] == []
    plan, _ = build_lesson({'boardSnapshots': [{'id': 'a', 'latex': 'x'}], 'reviewQuestions': ['', 5, None, 'ok?']}, 's1')
    assert [q['prompt'] for q in plan['scenes'][0]['questions']].count('ok?') == 1
