"""Dữ liệu mẫu cho demo: 1 giáo viên, 2 lớp, 8 học sinh, 1 giáo án Vật lý 2 phần."""
from __future__ import annotations

import os
import secrets
import sqlite3
import time

from deploy_guard import is_production
from hub.auth import hash_pin
from hub.db import dumps

TEACHER_ID = "gv-demo"
CLASSES = [
    ("12a1", "12A1", "PHYSICS", [("s-an000001", "Nguyễn Văn An", "AN2345"), ("s-bao00002", "Trần Gia Bảo", "BAO234"),
                                 ("s-chau0003", "Lê Minh Châu", "CHAU34"), ("s-dung0004", "Phạm Tiến Dũng", "DUNG45"),
                                 ("s-ha000005", "Vũ Thu Hà", "HA5678")]),
    ("11a2", "11A2", "MATH", [("s-kha00006", "Đỗ Minh Kha", "KHA234"), ("s-my000007", "Hoàng Trà My", "MY3456"),
                              ("s-phu00008", "Bùi Hữu Phú", "PHU456")]),
]

DEMO_PLAN = {
    "title": "Dòng điện xoay chiều và công của lực ma sát",
    "subject": "PHYSICS",
    "boardContext": "Lớp hay cộng đại số độ lớn điện áp thay vì cộng vector theo pha; hay quên dấu âm của công lực ma sát.",
    "sections": [
        {
            "id": "sec-rlc",
            "title": "Cộng vector trong mạch RLC",
            "objective": "Biết cộng điện áp theo giản đồ Fresnel, không cộng đại số độ lớn.",
            "kcs": [{"id": "physics-cong-vector-rlc", "label": "Cộng vector RLC"}],
            "items": [
                {"id": "it-rlc-f1", "type": "formula", "latex": "\\vec{U} = \\vec{U}_R + \\vec{U}_L + \\vec{U}_C", "caption": "Cộng theo pha"},
                {"id": "it-rlc-p1", "type": "problem", "text": "Cho U_R = 60 V, U_L = 120 V, U_C = 40 V. Tính điện áp hai đầu mạch U.", "answer": "U = 100"},
                {"id": "it-rlc-s1", "type": "sim", "templateId": "PHYS_RLC_PHASOR", "params": {"omega": 200, "R": 50}},
                {"id": "it-rlc-q1", "type": "poll", "question": "U_R = 30 V, U_L = 40 V, U_C = 0. U bằng bao nhiêu?", "options": ["70 V", "50 V", "10 V"], "correct": 1},
            ],
        },
        {
            "id": "sec-friction",
            "title": "Công của lực ma sát",
            "objective": "Hiểu dấu âm của công lực ma sát trên mặt phẳng nghiêng.",
            "kcs": [{"id": "physics-cong-luc-ma-sat", "label": "Công của lực ma sát"}],
            "items": [
                {"id": "it-fr-s1", "type": "sim", "templateId": "PHYS_INCLINED", "params": {"alpha": 30, "mu": 0.2}},
                {"id": "it-fr-p1", "type": "problem", "text": "Vì sao công của lực ma sát luôn âm khi vật trượt? Giải thích bằng lời."},
            ],
        },
    ],
}


def seed(conn: sqlite3.Connection) -> None:
    pin = os.getenv("HUB_DEMO_PIN", "").strip()
    if not pin:
        if is_production():
            return
        pin = "2468"
    pin_hash, pin_salt = hash_pin(pin)
    now = time.time()
    conn.execute("INSERT INTO teachers VALUES (?,?,?,?)", (TEACHER_ID, "GV Demo", pin_hash, pin_salt))
    for class_id, name, subject, students in CLASSES:
        conn.execute("INSERT INTO classes VALUES (?,?,?,?)", (class_id, name, subject, TEACHER_ID))
        for student_id, student_name, code in students:
            conn.execute("INSERT INTO students VALUES (?,?,?,?)", (student_id, class_id, student_name, code))
            conn.execute("INSERT INTO parent_links VALUES (?,?,NULL)", (secrets.token_urlsafe(32), student_id))
    conn.execute("INSERT INTO teaching_plans VALUES (?,?,?,?,1)", ("plan-demo-rlc", TEACHER_ID, "PHYSICS", DEMO_PLAN["title"]))
    conn.execute("INSERT INTO teaching_plan_versions VALUES (?,?,?,?,?)", ("plan-demo-rlc", 1, dumps(DEMO_PLAN), now, "edit"))
    print(f"[hub] seeded demo teacher {TEACHER_ID}")
