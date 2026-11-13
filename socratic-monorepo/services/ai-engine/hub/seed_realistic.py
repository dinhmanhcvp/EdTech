"""Dữ liệu thử nghiệm gần thực tế (chạy tay, không tự chạy khi khởi động):

    cd socratic-monorepo/services/ai-engine && python -m hub.seed_realistic

1 giáo viên (cô Lan, Vật lý + Toán), 3 lớp, 24 học sinh có mã đăng nhập, 3 giáo án, các buổi học đã kết thúc rải 3 tuần với sự kiện trả lời/gợi ý,
độ thành thạo (mastery) từng học sinh theo từng kĩ năng. Chạy lại không nhân đôi (đã có giáo viên thì bỏ qua). Không dùng khi triển khai thật.
"""
from __future__ import annotations

import random
import secrets
import sys
import time

from deploy_guard import is_production
from hub.auth import hash_pin
from hub.db import connect, dumps

TEACHER_ID, TEACHER_NAME, TEACHER_PIN = "gv-lan", "Cô Nguyễn Thị Lan", "135790"

KCS = {
    "PHYSICS": [("physics-cong-vector-rlc", "Cộng vector RLC"), ("physics-cong-luc-ma-sat", "Công của lực ma sát"), ("physics-dinh-luat-om", "Định luật Ôm")],
    "MATH": [("math-ham-so-bac-hai", "Hàm số bậc hai"), ("math-he-thuc-vi-et", "Hệ thức Vi-ét"), ("math-goc-noi-tiep", "Góc nội tiếp")],
}
CLASSES = [
    ("10a1", "10A1", "MATH", ["Nguyễn Hoàng Anh", "Trần Quốc Bảo", "Lê Thanh Chi", "Phạm Đức Duy", "Vũ Ngọc Hân", "Đặng Minh Khoa", "Bùi Thảo My", "Hoàng Gia Nam"]),
    ("11a2", "11A2", "PHYSICS", ["Ngô Phương Linh", "Đỗ Tiến Long", "Lý Khánh Ngân", "Trịnh Văn Phúc", "Mai Thu Quỳnh", "Dương Hải Sơn", "Phan Bảo Trâm", "Cao Anh Tuấn"]),
    ("12a3", "12A3", "PHYSICS", ["Nguyễn Thùy Uyên", "Tạ Quang Vinh", "Lương Hà Xuân", "Hồ Minh Yến", "Chu Đình Hiếu", "Kiều Mỹ Lệ", "Đinh Công Thành", "Vương Bích Ngọc"]),
]


def _plan(title: str, subject: str, kcs: list[tuple[str, str]]) -> dict:
    return {
        "title": title,
        "subject": subject,
        "boardContext": "Lớp hay nhầm giữa đại lượng vectơ và độ lớn; cần nhấn mạnh vẽ hình trước khi tính.",
        "sections": [
            {
                "id": f"sec-{i}",
                "title": label,
                "objective": f"Hiểu và vận dụng: {label.lower()}.",
                "kcs": [{"id": kc, "label": label}],
                "items": [
                    {"id": f"it-{i}-p1", "type": "problem", "text": f"Bài tập nhận biết về {label.lower()}. Nêu cách làm.", "answer": ""},
                    {"id": f"it-{i}-q1", "type": "poll", "question": f"Phát biểu nào đúng về {label.lower()}?", "options": ["Cách A", "Cách B", "Cách C"], "correct": 1},
                ],
            }
            for i, (kc, label) in enumerate(kcs, 1)
        ],
    }


def main() -> int:
    if is_production():
        print("Từ chối: đang ở chế độ production.")
        return 1
    rng = random.Random(20261113)
    now = time.time()
    pin_hash, pin_salt = hash_pin(TEACHER_PIN)
    with connect() as conn:
        if conn.execute("SELECT 1 FROM teachers WHERE id=?", (TEACHER_ID,)).fetchone():
            print(f"Đã có giáo viên {TEACHER_ID}, bỏ qua (xóa DB .data nếu muốn tạo lại).")
            return 0
        conn.execute("INSERT INTO teachers VALUES (?,?,?,?)", (TEACHER_ID, TEACHER_NAME, pin_hash, pin_salt))
        used = {r[0] for r in conn.execute("SELECT login_code FROM students")}
        roster: list[tuple[str, str, str, str]] = []  # (student_id, class_id, subject, name)
        for class_id, class_name, subject, names in CLASSES:
            conn.execute("INSERT INTO classes VALUES (?,?,?,?)", (class_id + "-lan", class_name, subject, TEACHER_ID))
            for n, name in enumerate(names, 1):
                sid = f"s-{class_id}-{n:02d}"
                code = ""
                while not code or code in used:
                    code = f"{class_name}{n:02d}{secrets.choice('ABCDEFGHJKMNPQRSTUVWXYZ')}".upper()
                used.add(code)
                conn.execute("INSERT INTO students VALUES (?,?,?,?)", (sid, class_id + "-lan", name, code))
                conn.execute("INSERT INTO parent_links VALUES (?,?,NULL)", (secrets.token_urlsafe(32), sid))
                roster.append((sid, class_id + "-lan", subject, name))
        plans = {
            "PHYSICS": ("plan-lan-ly", "Dòng điện xoay chiều và mạch RLC", KCS["PHYSICS"]),
            "MATH": ("plan-lan-toan", "Hàm số bậc hai và hệ thức Vi-ét", KCS["MATH"]),
        }
        for subject, (pid, title, kcs) in plans.items():
            conn.execute("INSERT INTO teaching_plans VALUES (?,?,?,?,1)", (pid, TEACHER_ID, subject, title))
            conn.execute("INSERT INTO teaching_plan_versions VALUES (?,?,?,?,?)", (pid, 1, dumps(_plan(title, subject, kcs)), now - 21 * 86400, "edit"))
        # buổi học đã kết thúc: mỗi lớp 3 buổi (3, 2, 1 tuần trước); sự kiện theo năng lực ẩn của từng học sinh
        ability = {sid: min(0.95, max(0.25, rng.gauss(0.6, 0.18))) for sid, *_ in roster}
        for class_id, class_name, subject, _ in CLASSES:
            pid, _, kcs = plans[subject]
            for week in (3, 2, 1):
                sess = f"sess-{class_id}-w{week}"
                start = now - week * 7 * 86400
                conn.execute("INSERT INTO class_sessions VALUES (?,?,?,?,?,'ended',?,?)", (sess, class_id + "-lan", pid, 1, f"board-{class_id}", start, start + 2700))
                for sid, cid, _subj, _name in [r for r in roster if r[1] == class_id + "-lan"]:
                    for k, (kc, _label) in enumerate(kcs):
                        for q in range(2):
                            p = ability[sid] - 0.05 * (week - 2) * (1 if k == 0 else 0)
                            ok = rng.random() < p
                            if rng.random() < 0.25:
                                conn.execute("INSERT OR IGNORE INTO learning_events VALUES (?,?,?,?,?,?,?,?,?,?)",
                                             (f"ev-{secrets.token_hex(6)}", sid, sess, f"sec-{k + 1}", kc, f"it-{k + 1}-p1", "hint", None, f"rq-{secrets.token_hex(5)}", start + 600 + 60 * q))
                            conn.execute("INSERT OR IGNORE INTO learning_events VALUES (?,?,?,?,?,?,?,?,?,?)",
                                         (f"ev-{secrets.token_hex(6)}", sid, sess, f"sec-{k + 1}", kc, f"it-{k + 1}-p{q + 1}", "correct" if ok else "incorrect",
                                          "đáp án của học sinh" if ok else "làm sai bước biến đổi", f"rq-{secrets.token_hex(5)}", start + 900 + 120 * (k * 2 + q)))
        # độ thành thạo hiện tại theo từng kĩ năng
        for sid, cid, subject, _name in roster:
            for kc, _label in KCS[subject]:
                p = min(0.98, max(0.1, ability[sid] + rng.uniform(-0.2, 0.2)))
                conn.execute("INSERT INTO mastery VALUES (?,?,?,?) ON CONFLICT(student_id, kc_id) DO UPDATE SET p_known=excluded.p_known", (sid, kc, p, now))
        codes = conn.execute("SELECT s.name, c.name, s.login_code FROM students s JOIN classes c ON c.id=s.class_id WHERE c.teacher_id=? ORDER BY c.name, s.id", (TEACHER_ID,)).fetchall()
    print(f"Giáo viên: {TEACHER_ID} / PIN {TEACHER_PIN}  ({TEACHER_NAME})")
    for name, cls, code in codes:
        print(f"  {cls:5} {name:22} mã: {code}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
