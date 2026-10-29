"""SQLite tables for board-derived lessons (answer keys stay server-side)."""
from __future__ import annotations

import json
import sqlite3
from typing import Any, Dict, Optional, Set, Tuple


def init_lesson_tables(conn: sqlite3.Connection) -> None:
    conn.executescript(
        "CREATE TABLE IF NOT EXISTS lesson_plans(student TEXT, lesson TEXT, plan TEXT, keys TEXT, PRIMARY KEY(student,lesson));"
        "CREATE TABLE IF NOT EXISTS lesson_solved(student TEXT, lesson TEXT, question TEXT, PRIMARY KEY(student,lesson,question));"
        "CREATE TABLE IF NOT EXISTS lesson_turns(student TEXT, request TEXT, fingerprint TEXT, lesson TEXT, question TEXT, kind TEXT, message TEXT, result TEXT, PRIMARY KEY(student,request));"
    )


def save_lesson(conn: sqlite3.Connection, student_id: str, plan: Dict[str, Any], keys: Dict[str, str]) -> None:
    conn.execute(
        "INSERT INTO lesson_plans(student,lesson,plan,keys) VALUES(?,?,?,?) ON CONFLICT(student,lesson) DO UPDATE SET plan=excluded.plan,keys=excluded.keys",
        (student_id, plan["lesson_id"], json.dumps(plan, ensure_ascii=False), json.dumps(keys, ensure_ascii=False)),
    )


def load_lesson(conn: sqlite3.Connection, student_id: str, lesson_id: str) -> Optional[Tuple[Dict[str, Any], Dict[str, str]]]:
    row = conn.execute("SELECT plan,keys FROM lesson_plans WHERE student=? AND lesson=?", (student_id, lesson_id)).fetchone()
    return (json.loads(row["plan"]), json.loads(row["keys"])) if row else None


def solved_questions(conn: sqlite3.Connection, student_id: str, lesson_id: str) -> Set[str]:
    rows = conn.execute("SELECT question FROM lesson_solved WHERE student=? AND lesson=?", (student_id, lesson_id)).fetchall()
    return {r["question"] for r in rows}


def mark_solved(conn: sqlite3.Connection, student_id: str, lesson_id: str, question_id: str) -> bool:
    """True only the first time; the caller awards points only then."""
    cur = conn.execute("INSERT OR IGNORE INTO lesson_solved(student,lesson,question) VALUES(?,?,?)", (student_id, lesson_id, question_id))
    return cur.rowcount == 1


def get_turn(conn: sqlite3.Connection, student_id: str, request_id: str) -> Optional[Dict[str, Any]]:
    row = conn.execute("SELECT fingerprint,result FROM lesson_turns WHERE student=? AND request=?", (student_id, request_id)).fetchone()
    return {"fingerprint": row["fingerprint"], "result": json.loads(row["result"])} if row else None


def insert_turn(conn: sqlite3.Connection, student_id: str, request_id: str, fingerprint: str, lesson_id: str,
                question_id: str, kind: str, message: str, result: Dict[str, Any]) -> None:
    conn.execute("INSERT INTO lesson_turns(student,request,fingerprint,lesson,question,kind,message,result) VALUES(?,?,?,?,?,?,?,?)",
                 (student_id, request_id, fingerprint, lesson_id, question_id, kind, message[:400], json.dumps(result, ensure_ascii=False)))


def update_turn_result(conn: sqlite3.Connection, student_id: str, request_id: str, result: Dict[str, Any]) -> None:
    conn.execute("UPDATE lesson_turns SET result=? WHERE student=? AND request=?", (json.dumps(result, ensure_ascii=False), student_id, request_id))


def count_hints(conn: sqlite3.Connection, student_id: str, lesson_id: str, question_id: str) -> int:
    row = conn.execute("SELECT COUNT(*) AS n FROM lesson_turns WHERE student=? AND lesson=? AND question=? AND kind='HINT'",
                       (student_id, lesson_id, question_id)).fetchone()
    return int(row["n"])


def recent_turns(conn: sqlite3.Connection, student_id: str, lesson_id: str, limit: int = 2) -> list:
    """Last `limit` exchanges as [(who, text), ...] oldest first."""
    rows = conn.execute("SELECT message,result FROM lesson_turns WHERE student=? AND lesson=? ORDER BY rowid DESC LIMIT ?",
                        (student_id, lesson_id, limit)).fetchall()
    out = []
    for row in reversed(rows):
        if row["message"]:
            out.append(("student", row["message"]))
        text = json.loads(row["result"]).get("tutor_text")
        if text:
            out.append(("tutor", text))
    return out
