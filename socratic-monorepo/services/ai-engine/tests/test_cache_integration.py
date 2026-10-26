import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from cache.chroma_cache import lookup_chroma_cache


def test_chroma_wrapper_falls_back_without_signature_error():
    result = lookup_chroma_cache("cân bằng Fe + O2 -> Fe2O3", "CHEMISTRY")

    assert result is not None
    assert result["matched_cache_id"] == "CHEM_REDOX_FE_O2"
    assert result["source"] == "CHROMADB_CACHE"
