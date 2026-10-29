import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import student_context as store


def test_tests_never_write_to_the_real_runtime_database():
    # A test that wrote a class snapshot used to overwrite what a teacher had just published from the board.
    assert store.DB_PATH.parent != store.ROOT / '.data'
    assert store.DB_PATH.exists()  # the isolated store is initialised, not just redirected
