"""
TF-IDF RAG engine for payer policy retrieval.
Adapted from ClinicalPriorAuthAgent/rag_engine.py with medication-specific policies.
"""

from __future__ import annotations

import re
import math
from collections import Counter
from typing import Optional

import numpy as np

from payer_policies import POLICY_DOCUMENTS, POLICY_KEY_MAP, MEDICATION_PAYER_POLICIES

_STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "have", "has",
    "had", "do", "does", "did", "will", "would", "shall", "should", "may",
    "might", "must", "can", "could", "of", "in", "to", "for", "with", "on",
    "at", "from", "by", "about", "as", "and", "but", "or", "not", "this",
    "that", "these", "those", "it", "its", "if", "when", "while",
}


def _tokenize(text: str) -> list[str]:
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return [t for t in tokens if t not in _STOPWORDS and len(t) > 1]


class RAGEngine:
    """TF-IDF vector search over medication payer policy documents."""

    def __init__(self) -> None:
        self.documents = POLICY_DOCUMENTS
        self.vocab: dict[str, int] = {}
        self.idf: dict[str, float] = {}
        self.doc_vectors: list[np.ndarray] = []
        self._initialized = False

    def initialize(self) -> None:
        if self._initialized:
            return

        doc_tokens = [_tokenize(doc["content"]) for doc in self.documents]

        all_tokens: set[str] = set()
        for tokens in doc_tokens:
            all_tokens.update(tokens)
        self.vocab = {t: i for i, t in enumerate(sorted(all_tokens))}

        n_docs = len(doc_tokens)
        doc_freq: Counter = Counter()
        for tokens in doc_tokens:
            doc_freq.update(set(tokens))
        self.idf = {
            t: math.log((n_docs + 1) / (df + 1)) + 1 for t, df in doc_freq.items()
        }

        for tokens in doc_tokens:
            vec = np.zeros(len(self.vocab))
            tf = Counter(tokens)
            for t, count in tf.items():
                if t in self.vocab:
                    vec[self.vocab[t]] = (1 + math.log(count)) * self.idf.get(t, 1.0)
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec /= norm
            self.doc_vectors.append(vec)

        self._initialized = True

    def _vectorize_query(self, query: str) -> np.ndarray:
        tokens = _tokenize(query)
        vec = np.zeros(len(self.vocab))
        tf = Counter(tokens)
        for t, count in tf.items():
            if t in self.vocab:
                vec[self.vocab[t]] = (1 + math.log(count)) * self.idf.get(t, 1.0)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec

    def search(self, query: str, top_k: int = 3) -> list[dict]:
        if not self._initialized:
            self.initialize()

        query_vec = self._vectorize_query(query)
        results = []
        for i, doc in enumerate(self.documents):
            score = float(np.dot(query_vec, self.doc_vectors[i]))
            results.append({**doc, "similarity_score": round(score, 4)})

        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:top_k]

    def find_policy(self, medication: str, payer: str) -> tuple[Optional[str], Optional[dict]]:
        """Return (policy_key, policy_dict) for a medication+payer pair, or (None, None)."""
        med_norm = medication.lower().strip()
        payer_norm = (
            payer.lower()
            .strip()
            .replace(" ", "")
            .replace("-", "")
        )
        # Direct lookup
        for payer_key in [payer_norm, payer_norm[:4], payer_norm[:6]]:
            for med_key in [med_norm, med_norm.split()[0]]:
                key = POLICY_KEY_MAP.get((payer_key, med_key))
                if key:
                    return key, MEDICATION_PAYER_POLICIES[key]

        # RAG fallback
        query = f"{payer} {medication} prior authorization policy"
        hits = self.search(query, top_k=1)
        if hits and hits[0]["similarity_score"] > 0.1:
            policy_key = hits[0].get("policy_key")
            if policy_key and policy_key in MEDICATION_PAYER_POLICIES:
                return policy_key, MEDICATION_PAYER_POLICIES[policy_key]

        return None, None


rag_engine = RAGEngine()
