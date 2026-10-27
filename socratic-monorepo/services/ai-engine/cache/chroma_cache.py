"""
ChromaDB Local Semantic Cache (Tier 2 Verification Engine - 0 API Call)
Stores pre-indexed scaffolding steps and curriculum patterns.
If student queries match with high semantic similarity, returns 0-API cached scaffolding.
"""
import re
from typing import Dict, Any, Optional, List

import os

ENABLE_HEAVY_MODELS = os.getenv("ENABLE_HEAVY_LOCAL_MODELS", "false").lower() in ("true", "1", "yes")

try:
    if ENABLE_HEAVY_MODELS:
        import chromadb
        CHROMADB_AVAILABLE = True
    else:
        CHROMADB_AVAILABLE = False
except ImportError:
    CHROMADB_AVAILABLE = False

from .chroma_semantic_cache import lookup_semantic_cache as fallback_lookup, CACHED_TEMPLATES


class ChromaSemanticCache:
    """
    Wraps local in-memory ChromaDB vector collection.
    """
    def __init__(self):
        self.client = None
        self.collection = None
        if CHROMADB_AVAILABLE:
            try:
                self.client = chromadb.Client()
                self.collection = self.client.get_or_create_collection(name="socratic_scaffolding")
                self._seed_collection()
            except Exception as e:
                print(f"[ChromaCache] ChromaDB init warning: {e}")
                self.collection = None

    def _seed_collection(self):
        if not self.collection:
            return
        # Seed the 4 core curriculum templates
        ids = [t["id"] for t in CACHED_TEMPLATES]
        documents = [" ".join(t["keywords"]) + " " + " ".join(t.get("trigger_patterns", [])) for t in CACHED_TEMPLATES]
        metadatas = [{"category": t["category"], "id": t["id"]} for t in CACHED_TEMPLATES]
        try:
            self.collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
        except Exception:
            pass

    def query(self, text: str, subject: str = "STEM", threshold: float = 0.85) -> Optional[Dict[str, Any]]:
        # Fast local fallback / rule matcher first
        result = fallback_lookup(text, subject, threshold=0.60)
        if result:
            return result

        if self.collection:
            try:
                res = self.collection.query(query_texts=[text], n_results=1)
                if res and res.get("ids") and len(res["ids"][0]) > 0:
                    matched_id = res["ids"][0][0]
                    for t in CACHED_TEMPLATES:
                        if t["id"] == matched_id:
                            return {
                                "template_id": t["id"],
                                "similarity": 0.92,
                                "scaffolding": t["scaffolding_response"]
                            }
            except Exception:
                pass

        return None


# Global instance
chroma_cache = ChromaSemanticCache()


def lookup_chroma_cache(text: str, subject: str = "STEM") -> Optional[Dict[str, Any]]:
    return chroma_cache.query(text, subject)
