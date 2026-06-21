"""
VerifyAI Production RAG Knowledge Base Service
------------------------------------------------
Implements:
  1. Multi-format document ingestion (TXT, PDF, DOCX)
  2. Sliding-window semantic chunking with overlap
  3. BM25 keyword index (rank-bm25)
  4. TF-IDF cosine-similarity dense vector search (no torch needed)
  5. Hybrid score fusion (BM25 * 0.45 + TF-IDF * 0.55)
  6. LLM Cross-Encoder reranking via Groq to surface the best 2 chunks
  7. Knowledge base is initialized on backend startup from the /knowledge_base folder
"""

import os
import re
import json
import math
import logging
from typing import List, Dict, Tuple, Optional
from collections import Counter

from pypdf import PdfReader
from app.core.config import settings

logger = logging.getLogger("knowledge_base")

try:
    from docx import Document as DocxDocument
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    logger.warning("python-docx not installed. DOCX ingestion disabled.")

try:
    from rank_bm25 import BM25Okapi
    BM25_AVAILABLE = True
except ImportError:
    BM25_AVAILABLE = False
    logger.warning("rank-bm25 not installed. BM25 search disabled.")

# ─────────────────────────────────────────────────────
# Data types
# ─────────────────────────────────────────────────────

class DocumentChunk:
    def __init__(self, text: str, source: str, chunk_index: int, page: int = 0):
        self.text = text
        self.source = source          # filename
        self.chunk_index = chunk_index
        self.page = page              # approximate page number
        self.tokens: List[str] = []   # filled during indexing

    def as_dict(self) -> Dict:
        return {
            "text": self.text,
            "source": self.source,
            "chunk_index": self.chunk_index,
            "page": self.page,
        }


# ─────────────────────────────────────────────────────
# Text Extraction Helpers
# ─────────────────────────────────────────────────────

def _extract_txt(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

def _extract_pdf(path: str) -> Tuple[str, List[Tuple[int, str]]]:
    """Returns (full_text, [(page_no, page_text), ...])"""
    reader = PdfReader(path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append((i + 1, text))
    return "\n".join(t for _, t in pages), pages

def _extract_docx(path: str) -> str:
    if not DOCX_AVAILABLE:
        return ""
    doc = DocxDocument(path)
    return "\n".join(para.text for para in doc.paragraphs if para.text.strip())


# ─────────────────────────────────────────────────────
# Chunker – Sliding Window with Overlap
# ─────────────────────────────────────────────────────

def _chunk_text(
    text: str,
    source: str,
    chunk_size: int = 400,
    overlap: int = 80,
    page_offset: int = 1,
) -> List[DocumentChunk]:
    """Splits text into overlapping chunks of approximately chunk_size words."""
    words = text.split()
    chunks: List[DocumentChunk] = []
    start = 0
    chunk_idx = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk_words = words[start:end]
        chunk_text = " ".join(chunk_words).strip()

        if chunk_text:
            # Approximate page: assume 250 words per page
            approx_page = page_offset + (start // 250)
            chunks.append(DocumentChunk(
                text=chunk_text,
                source=source,
                chunk_index=chunk_idx,
                page=approx_page,
            ))
            chunk_idx += 1

        if end >= len(words):
            break
        start += chunk_size - overlap

    return chunks


def _tokenize(text: str) -> List[str]:
    """Lowercase word tokenizer, removes punctuation."""
    return re.findall(r"[a-z0-9]+", text.lower())


# ─────────────────────────────────────────────────────
# TF-IDF Dense Vector Implementation (Pure Python)
# ─────────────────────────────────────────────────────

class TFIDFIndex:
    """
    Lightweight TF-IDF index for dense cosine similarity retrieval.
    No torch, no sklearn required.
    """

    def __init__(self):
        self.chunks: List[DocumentChunk] = []
        self.idf: Dict[str, float] = {}
        self.tfidf_matrix: List[Dict[str, float]] = []  # per-doc TF-IDF vectors

    def fit(self, chunks: List[DocumentChunk]):
        self.chunks = chunks
        N = len(chunks)
        if N == 0:
            return

        # Build token lists
        token_lists = []
        for chunk in chunks:
            tokens = _tokenize(chunk.text)
            chunk.tokens = tokens
            token_lists.append(tokens)

        # Compute IDF
        df: Dict[str, int] = Counter()
        for tokens in token_lists:
            for t in set(tokens):
                df[t] += 1
        self.idf = {
            term: math.log((N + 1) / (count + 1)) + 1.0
            for term, count in df.items()
        }

        # Compute TF-IDF vectors
        self.tfidf_matrix = []
        for tokens in token_lists:
            tf = Counter(tokens)
            total = len(tokens) or 1
            vec = {
                term: (count / total) * self.idf.get(term, 0.0)
                for term, count in tf.items()
            }
            self.tfidf_matrix.append(vec)

    def _cosine(self, query_vec: Dict[str, float], doc_vec: Dict[str, float]) -> float:
        dot = sum(query_vec.get(t, 0.0) * v for t, v in doc_vec.items())
        norm_q = math.sqrt(sum(v * v for v in query_vec.values())) or 1e-9
        norm_d = math.sqrt(sum(v * v for v in doc_vec.values())) or 1e-9
        return dot / (norm_q * norm_d)

    def search(self, query: str, top_k: int = 10) -> List[Tuple[float, DocumentChunk]]:
        if not self.chunks:
            return []
        tokens = _tokenize(query)
        tf = Counter(tokens)
        total = len(tokens) or 1
        query_vec = {
            term: (count / total) * self.idf.get(term, 0.0)
            for term, count in tf.items()
            if term in self.idf
        }
        scores = [
            (self._cosine(query_vec, doc_vec), self.chunks[i])
            for i, doc_vec in enumerate(self.tfidf_matrix)
        ]
        scores.sort(key=lambda x: x[0], reverse=True)
        return scores[:top_k]


# ─────────────────────────────────────────────────────
# Hybrid Knowledge Base
# ─────────────────────────────────────────────────────

class KnowledgeBase:
    """
    Manages:
      - Document ingestion from /knowledge_base directory
      - BM25 keyword index
      - TF-IDF dense vector index
      - Hybrid retrieval (BM25 + TF-IDF fusion)
      - LLM cross-encoder reranking
    """

    def __init__(self):
        self.all_chunks: List[DocumentChunk] = []
        self.bm25: Optional[BM25Okapi] = None
        self.tfidf_index = TFIDFIndex()
        self._initialized = False

    # ── Ingestion ──────────────────────────────────────

    def ingest_directory(self, directory: str):
        if not os.path.isdir(directory):
            logger.warning(f"Knowledge base directory not found: {directory}")
            return

        new_chunks: List[DocumentChunk] = []
        files_loaded = 0

        for filename in os.listdir(directory):
            filepath = os.path.join(directory, filename)
            ext = os.path.splitext(filename)[1].lower()
            text = ""

            try:
                if ext == ".txt":
                    text = _extract_txt(filepath)
                elif ext == ".pdf":
                    text, _ = _extract_pdf(filepath)
                elif ext in (".docx", ".doc"):
                    text = _extract_docx(filepath)
                else:
                    continue

                if text.strip():
                    chunks = _chunk_text(text, source=filename)
                    new_chunks.extend(chunks)
                    files_loaded += 1
                    logger.info(f"Ingested {filename} → {len(chunks)} chunks")
            except Exception as e:
                logger.error(f"Error ingesting {filename}: {e}")

        if not new_chunks:
            logger.warning("No documents ingested into knowledge base.")
            return

        self.all_chunks.extend(new_chunks)
        self._build_indexes()
        logger.info(
            f"Knowledge base ready: {files_loaded} files, "
            f"{len(self.all_chunks)} total chunks."
        )
        self._initialized = True

    def ingest_file(self, filepath: str, source_name: str):
        """Dynamically ingest a single uploaded evidence file into the session index."""
        ext = os.path.splitext(filepath)[1].lower()
        text = ""
        try:
            if ext == ".txt":
                text = _extract_txt(filepath)
            elif ext == ".pdf":
                text, _ = _extract_pdf(filepath)
            elif ext in (".docx", ".doc"):
                text = _extract_docx(filepath)
        except Exception as e:
            logger.error(f"Error ingesting uploaded file {source_name}: {e}")
            return

        if text.strip():
            chunks = _chunk_text(text, source=source_name)
            self.all_chunks.extend(chunks)
            self._build_indexes()
            logger.info(f"Session ingest: {source_name} → {len(chunks)} chunks")

    # ── Index Building ─────────────────────────────────

    def _build_indexes(self):
        if not self.all_chunks:
            return

        # TF-IDF index
        self.tfidf_index.fit(self.all_chunks)

        # BM25 index
        if BM25_AVAILABLE:
            tokenized = [_tokenize(c.text) for c in self.all_chunks]
            self.bm25 = BM25Okapi(tokenized)

    # ── Retrieval ──────────────────────────────────────

    def hybrid_search(
        self,
        query: str,
        top_k: int = 8,
        bm25_weight: float = 0.45,
        tfidf_weight: float = 0.55,
    ) -> List[Tuple[float, DocumentChunk]]:
        """
        Fuses BM25 and TF-IDF scores with min-max normalisation.
        Returns top_k candidates sorted by fused score.
        """
        if not self.all_chunks:
            return []

        n = len(self.all_chunks)

        # TF-IDF scores
        tfidf_results = {
            i: 0.0 for i in range(n)
        }
        for score, chunk in self.tfidf_index.search(query, top_k=n):
            idx = self.all_chunks.index(chunk)
            tfidf_results[idx] = score

        # BM25 scores
        bm25_raw = {}
        if BM25_AVAILABLE and self.bm25:
            tokens = _tokenize(query)
            scores = self.bm25.get_scores(tokens)
            for i, s in enumerate(scores):
                bm25_raw[i] = float(s)

        # Min-max normalise
        def normalize(d: Dict[int, float]) -> Dict[int, float]:
            if not d:
                return d
            mn, mx = min(d.values()), max(d.values())
            rng = mx - mn or 1e-9
            return {k: (v - mn) / rng for k, v in d.items()}

        bm25_norm = normalize(bm25_raw)
        tfidf_norm = normalize(tfidf_results)

        fused: Dict[int, float] = {}
        for i in range(n):
            fused[i] = (
                bm25_weight * bm25_norm.get(i, 0.0)
                + tfidf_weight * tfidf_norm.get(i, 0.0)
            )

        top_items = sorted(fused.items(), key=lambda x: x[1], reverse=True)[:top_k]
        return [(score, self.all_chunks[idx]) for idx, score in top_items]

    # ── LLM Cross-Encoder Reranker ─────────────────────

    def rerank_with_llm(
        self,
        query: str,
        candidates: List[Tuple[float, DocumentChunk]],
        top_n: int = 3,
    ) -> List[Dict]:
        """
        Sends retrieved candidates to Groq LLM to rerank them by
        relevance to the query. Falls back to score-sorted order
        if the API key is unavailable.
        """
        if not candidates:
            return []

        has_key = (
            settings.GROQ_API_KEY
            and settings.GROQ_API_KEY.strip()
            and not settings.GROQ_API_KEY.startswith("gsk_your_groq")
        )

        if not has_key:
            # Fallback: return top_n by hybrid score
            return [
                {
                    **c.as_dict(),
                    "relevance_score": round(s, 4),
                    "citation": f"[Source: {c.source}, Chunk {c.chunk_index + 1}]",
                }
                for s, c in candidates[:top_n]
                if s > 0.01
            ]

        # Build candidate listing for LLM prompt
        candidate_lines = "\n".join(
            f"[{i+1}] {c.source} (chunk {c.chunk_index+1}): {c.text[:300]}..."
            for i, (_, c) in enumerate(candidates)
        )

        prompt = (
            f"You are a document relevance reranker. Given the QUERY below and a "
            f"list of document CANDIDATES, output a JSON array of the indices "
            f"(1-based) of the top {top_n} most relevant candidates in order of "
            f"descending relevance. Output ONLY valid JSON like: [2, 1, 4]\n\n"
            f"QUERY: {query}\n\nCANDIDATES:\n{candidate_lines}"
        )

        try:
            from groq import Groq
            client = Groq(api_key=settings.GROQ_API_KEY)
            resp = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=64,
            )
            raw = resp.choices[0].message.content.strip()
            # Extract JSON array from response
            match = re.search(r"\[[\d,\s]+\]", raw)
            indices = json.loads(match.group()) if match else list(range(1, top_n + 1))
            # Clamp and build result
            result = []
            seen = set()
            for idx in indices:
                i = idx - 1
                if 0 <= i < len(candidates) and i not in seen:
                    score, chunk = candidates[i]
                    result.append({
                        **chunk.as_dict(),
                        "relevance_score": round(score, 4),
                        "citation": f"[Source: {chunk.source}, Chunk {chunk.chunk_index + 1}, ~Page {chunk.page}]",
                    })
                    seen.add(i)
                    if len(result) >= top_n:
                        break
            # Fill remaining slots if needed
            for i, (score, chunk) in enumerate(candidates):
                if len(result) >= top_n:
                    break
                if i not in seen and score > 0.01:
                    result.append({
                        **chunk.as_dict(),
                        "relevance_score": round(score, 4),
                        "citation": f"[Source: {chunk.source}, Chunk {chunk.chunk_index + 1}, ~Page {chunk.page}]",
                    })
            return result
        except Exception as e:
            logger.error(f"LLM reranker error: {e}. Falling back to score sort.")
            return [
                {
                    **c.as_dict(),
                    "relevance_score": round(s, 4),
                    "citation": f"[Source: {c.source}, Chunk {c.chunk_index + 1}, ~Page {c.page}]",
                }
                for s, c in candidates[:top_n]
                if s > 0.01
            ]

    # ── Public Entry Point ─────────────────────────────

    def retrieve(
        self,
        query: str,
        industry: str = "",
        top_k: int = 8,
        top_n_reranked: int = 3,
    ) -> List[Dict]:
        """
        Full RAG retrieval pipeline:
          1. Hybrid search (BM25 + TF-IDF)
          2. Filter by industry keyword relevance (soft filter)
          3. LLM cross-encoder rerank
          4. Return top_n_reranked with citation badges
        """
        if not self.all_chunks:
            return []

        # Build query incorporating industry context
        enriched_query = f"{industry} {query}".strip() if industry else query

        candidates = self.hybrid_search(enriched_query, top_k=top_k)

        # Soft industry filter: boost chunks from matching policy doc
        if industry:
            ind_lower = industry.lower()
            boosted = []
            for score, chunk in candidates:
                # Boost chunks whose source filename matches the industry keyword
                if ind_lower in chunk.source.lower() or ind_lower in chunk.text.lower():
                    boosted.append((min(score * 1.4, 1.0), chunk))
                else:
                    boosted.append((score, chunk))
            boosted.sort(key=lambda x: x[0], reverse=True)
            candidates = boosted

        return self.rerank_with_llm(query, candidates, top_n=top_n_reranked)


# ─────────────────────────────────────────────────────
# Singleton Knowledge Base instance (lazy-loaded at startup)
# ─────────────────────────────────────────────────────

_kb_instance: Optional[KnowledgeBase] = None

def get_knowledge_base() -> KnowledgeBase:
    global _kb_instance
    if _kb_instance is None:
        _kb_instance = KnowledgeBase()
        kb_dir = os.path.join(os.path.dirname(__file__), "..", "..", "knowledge_base")
        kb_dir = os.path.normpath(kb_dir)
        _kb_instance.ingest_directory(kb_dir)
    return _kb_instance
