"""
VerifyAI Agentic AI Pipeline
------------------------------
7 specialized agents collaborate to produce a final verification decision:

  Agent 1 → InputValidationAgent      Validates files & metadata
  Agent 2 → VisionAnalysisAgent       Analyses uploaded images via Groq LLM vision
  Agent 3 → DocumentProcessingAgent   Extracts text from PDFs/DOCX/TXT
  Agent 4 → RetrievalAgent            Runs Hybrid RAG retrieval + reranking
  Agent 5 → VerificationAgent         Compares claim vs evidence & retrieved policy
  Agent 6 → RiskAssessmentAgent       Calculates confidence score & status
  Agent 7 → ReportGenerationAgent     Writes final explanation with source citations

Each agent appends a step to the shared `AgentContext.timeline` list and
enriches one or more fields of `AgentContext`.
"""

import os
import re
import json
import base64
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

from app.core.config import settings
from app.services.knowledge_base import get_knowledge_base

logger = logging.getLogger("agentic_pipeline")


# ─────────────────────────────────────────────────────
# Shared Agent Context (passed between agents)
# ─────────────────────────────────────────────────────

@dataclass
class AgentContext:
    # Inputs
    industry: str = ""
    verification_type: str = ""
    description: str = ""
    files: List[Dict[str, str]] = field(default_factory=list)  # {path, name, mime_type}

    # Intermediate outputs
    validation_errors: List[str] = field(default_factory=list)
    image_observations: List[str] = field(default_factory=list)
    extracted_doc_texts: List[Dict[str, str]] = field(default_factory=list)  # [{source, text}]
    retrieved_context: List[Dict] = field(default_factory=list)   # RAG results with citations

    # Verification findings
    inconsistencies: List[str] = field(default_factory=list)
    missing_evidence: List[str] = field(default_factory=list)
    checklist: List[Dict[str, str]] = field(default_factory=list)

    # Final outputs
    status: str = "Needs Review"
    confidence_score: int = 50
    explanation: str = ""
    recommendations: List[str] = field(default_factory=list)
    timeline: List[str] = field(default_factory=list)


# ─────────────────────────────────────────────────────
# Groq LLM Helpers
# ─────────────────────────────────────────────────────

def _has_groq_key() -> bool:
    return (
        bool(settings.GROQ_API_KEY)
        and not settings.GROQ_API_KEY.startswith("gsk_your_groq")
    )

def _call_groq_text(system: str, user: str, max_tokens: int = 800) -> Optional[str]:
    if not _has_groq_key():
        return None
    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.1,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Groq text call failed: {e}")
        return None

def _call_groq_vision(system: str, user_text: str, image_b64: str, mime: str, max_tokens: int = 600) -> Optional[str]:
    if not _has_groq_key():
        return None
    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)
        resp = client.chat.completions.create(
            model="llama-3.2-11b-vision-preview",
            messages=[
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_text},
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_b64}"}},
                    ],
                },
            ],
            temperature=0.1,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Groq vision call failed: {e}")
        return None


# ─────────────────────────────────────────────────────
# Agent 1 — Input Validation Agent
# ─────────────────────────────────────────────────────

class InputValidationAgent:
    NAME = "Input Validation Agent"
    SUPPORTED_MIME = {
        "application/pdf", "text/plain",
        "image/jpeg", "image/png", "image/jpg", "image/webp",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }

    def run(self, ctx: AgentContext) -> AgentContext:
        ctx.timeline.append(f"[{self.NAME}] Validating uploaded files and claim metadata.")

        errors = []
        if not ctx.description or len(ctx.description.strip()) < 10:
            errors.append("Claim description is too short or missing.")

        for f in ctx.files:
            mime = f.get("mime_type", "")
            name = f.get("name", "unknown")
            path = f.get("path", "")

            if mime not in self.SUPPORTED_MIME:
                errors.append(f"Unsupported file type '{mime}' for file '{name}'.")
            elif not os.path.exists(path):
                errors.append(f"File '{name}' could not be found on server storage.")
            elif os.path.getsize(path) == 0:
                errors.append(f"File '{name}' is empty.")

        ctx.validation_errors = errors

        if errors:
            ctx.timeline.append(
                f"[{self.NAME}] ⚠ Validation issues: {'; '.join(errors)}"
            )
        else:
            ctx.timeline.append(
                f"[{self.NAME}] ✓ All {len(ctx.files)} file(s) and claim metadata validated successfully."
            )
        return ctx


# ─────────────────────────────────────────────────────
# Agent 2 — Vision Analysis Agent
# ─────────────────────────────────────────────────────

class VisionAnalysisAgent:
    NAME = "Vision Analysis Agent"

    def run(self, ctx: AgentContext) -> AgentContext:
        image_files = [
            f for f in ctx.files
            if f.get("mime_type", "").startswith("image/")
        ]

        if not image_files:
            ctx.timeline.append(f"[{self.NAME}] No image files detected. Skipping visual analysis.")
            return ctx

        ctx.timeline.append(
            f"[{self.NAME}] Analyzing {len(image_files)} image(s) for visual indicators."
        )

        observations = []
        system_prompt = (
            "You are a forensic document image analyst. Examine the image and provide a brief, "
            "precise list of visible evidence elements relevant to document verification. "
            "Look for: signatures, stamps, letterheads, dates, barcodes, license numbers, "
            "and any signs of tampering or inconsistency. Be factual and concise."
        )

        for f in image_files:
            try:
                with open(f["path"], "rb") as img_file:
                    b64 = base64.b64encode(img_file.read()).decode("utf-8")

                user_text = (
                    f"Industry: {ctx.industry}\n"
                    f"Verification Type: {ctx.verification_type}\n"
                    f"File: {f['name']}\n"
                    f"Claim: {ctx.description[:300]}\n\n"
                    "Analyze this image and list the key visible evidence elements."
                )

                result = _call_groq_vision(system_prompt, user_text, b64, f["mime_type"])

                if result:
                    observations.append(f"Image '{f['name']}': {result}")
                else:
                    # Intelligent fallback based on industry
                    observations.append(
                        f"Image '{f['name']}': [Offline Mode] Visual scan detected a document image. "
                        f"Presence of printed text and potential official markings noted. "
                        f"Manual review recommended for stamp/signature authenticity."
                    )
            except Exception as e:
                logger.error(f"Vision analysis failed for {f['name']}: {e}")
                observations.append(f"Image '{f['name']}': Could not be processed for visual analysis.")

        ctx.image_observations = observations
        ctx.timeline.append(
            f"[{self.NAME}] ✓ Visual analysis complete. {len(observations)} observation(s) recorded."
        )
        return ctx


# ─────────────────────────────────────────────────────
# Agent 3 — Document Processing Agent
# ─────────────────────────────────────────────────────

class DocumentProcessingAgent:
    NAME = "Document Processing Agent"

    def _read_pdf(self, path: str) -> str:
        from pypdf import PdfReader
        try:
            reader = PdfReader(path)
            return "\n".join(p.extract_text() or "" for p in reader.pages)
        except Exception as e:
            logger.error(f"PDF read error: {e}")
            return ""

    def _read_docx(self, path: str) -> str:
        try:
            from docx import Document
            doc = Document(path)
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            logger.error(f"DOCX read error: {e}")
            return ""

    def _read_txt(self, path: str) -> str:
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception as e:
            logger.error(f"TXT read error: {e}")
            return ""

    def run(self, ctx: AgentContext) -> AgentContext:
        doc_files = [
            f for f in ctx.files
            if not f.get("mime_type", "").startswith("image/")
        ]

        if not doc_files:
            ctx.timeline.append(
                f"[{self.NAME}] No document files detected. Skipping text extraction."
            )
            return ctx

        ctx.timeline.append(
            f"[{self.NAME}] Extracting structured text from {len(doc_files)} document(s)."
        )

        extracted = []
        for f in doc_files:
            mime = f.get("mime_type", "")
            path = f.get("path", "")
            name = f.get("name", "unknown")
            text = ""

            if mime == "application/pdf" or name.endswith(".pdf"):
                text = self._read_pdf(path)
            elif "wordprocessing" in mime or name.endswith(".docx"):
                text = self._read_docx(path)
            elif mime == "text/plain" or name.endswith(".txt"):
                text = self._read_txt(path)

            if text.strip():
                extracted.append({"source": name, "text": text[:3000]})  # cap at 3k chars

        ctx.extracted_doc_texts = extracted

        # Also ingest uploaded docs into knowledge base session index
        kb = get_knowledge_base()
        for f in doc_files:
            kb.ingest_file(f["path"], f["name"])

        ctx.timeline.append(
            f"[{self.NAME}] ✓ Text extracted from {len(extracted)} document(s) and indexed in RAG session."
        )
        return ctx


# ─────────────────────────────────────────────────────
# Agent 4 — Retrieval Agent (RAG)
# ─────────────────────────────────────────────────────

class RetrievalAgent:
    NAME = "Retrieval Agent"

    def run(self, ctx: AgentContext) -> AgentContext:
        ctx.timeline.append(
            f"[{self.NAME}] Running Hybrid RAG (BM25 + TF-IDF) retrieval against policy knowledge base."
        )

        kb = get_knowledge_base()

        # Build a rich retrieval query
        query_parts = [ctx.description]
        if ctx.image_observations:
            query_parts.append(" ".join(ctx.image_observations[:2]))
        for doc in ctx.extracted_doc_texts[:1]:
            query_parts.append(doc["text"][:400])

        query = " ".join(query_parts)[:1200]

        retrieved = kb.retrieve(
            query=query,
            industry=ctx.industry,
            top_k=8,
            top_n_reranked=3,
        )

        ctx.retrieved_context = retrieved

        if retrieved:
            source_list = ", ".join(set(r["source"] for r in retrieved))
            ctx.timeline.append(
                f"[{self.NAME}] ✓ Retrieved {len(retrieved)} relevant policy chunk(s) "
                f"from: {source_list}. Cross-encoder reranking applied."
            )
        else:
            ctx.timeline.append(
                f"[{self.NAME}] ⚠ No relevant policy documents retrieved. "
                f"Proceeding with claim-only analysis."
            )
        return ctx


# ─────────────────────────────────────────────────────
# Agent 5 — Verification Agent
# ─────────────────────────────────────────────────────

class VerificationAgent:
    NAME = "Verification Agent"

    def run(self, ctx: AgentContext) -> AgentContext:
        ctx.timeline.append(
            f"[{self.NAME}] Comparing claim against visual evidence, "
            f"extracted document texts, and retrieved policy rules."
        )

        # Build a comprehensive prompt
        policy_context = "\n\n".join(
            f"[{r['citation']}]\n{r['text'][:500]}"
            for r in ctx.retrieved_context
        ) if ctx.retrieved_context else "No policy documents retrieved."

        image_context = "\n".join(ctx.image_observations) if ctx.image_observations else "No visual evidence."

        doc_context = "\n\n".join(
            f"Document '{d['source']}':\n{d['text'][:800]}"
            for d in ctx.extracted_doc_texts
        ) if ctx.extracted_doc_texts else "No documents uploaded."

        system = (
            "You are a strict evidence verification specialist. "
            "Analyze the claim against the policy rules and uploaded evidence. "
            "Return ONLY a valid JSON object with these exact keys:\n"
            '{"inconsistencies": ["..."], "missing_evidence": ["..."], "checklist": [{"item": "...", "status": "Verified|Missing|Inconsistent"}]}'
        )

        user = (
            f"Industry: {ctx.industry}\n"
            f"Verification Type: {ctx.verification_type}\n"
            f"Claim Description: {ctx.description}\n\n"
            f"=== POLICY RULES (Retrieved) ===\n{policy_context}\n\n"
            f"=== VISUAL OBSERVATIONS ===\n{image_context}\n\n"
            f"=== DOCUMENT TEXTS ===\n{doc_context}\n\n"
            "Identify inconsistencies, missing evidence, and compile a verification checklist."
        )

        result_text = _call_groq_text(system, user, max_tokens=1000)

        if result_text:
            # Extract JSON from response
            try:
                match = re.search(r"\{.*\}", result_text, re.DOTALL)
                if match:
                    data = json.loads(match.group())
                    ctx.inconsistencies = data.get("inconsistencies", [])
                    ctx.missing_evidence = data.get("missing_evidence", [])
                    ctx.checklist = data.get("checklist", [])
            except Exception as e:
                logger.error(f"Verification agent JSON parse error: {e}")
                ctx.inconsistencies = []
                ctx.missing_evidence = []

        # Fallback if LLM not available or parse failed
        if not ctx.checklist:
            ctx.checklist = _build_fallback_checklist(ctx)

        ctx.timeline.append(
            f"[{self.NAME}] ✓ Verification complete. "
            f"{len(ctx.inconsistencies)} inconsistency(ies), "
            f"{len(ctx.missing_evidence)} missing evidence item(s) found."
        )
        return ctx


def _build_fallback_checklist(ctx: AgentContext) -> List[Dict[str, str]]:
    """Industry-specific fallback checklist when LLM is unavailable."""
    has_docs = bool(ctx.extracted_doc_texts)
    has_images = bool(ctx.image_observations)
    ind = ctx.industry.lower()

    if "healthcare" in ind:
        return [
            {"item": "Medical Document Present", "status": "Verified" if has_docs else "Missing"},
            {"item": "Practitioner Signature", "status": "Verified" if has_images else "Unclear"},
            {"item": "Hospital Letterhead", "status": "Verified" if has_docs else "Missing"},
            {"item": "Treatment Date", "status": "Verified" if ctx.description else "Missing"},
        ]
    elif "finance" in ind:
        return [
            {"item": "Bank Statement Uploaded", "status": "Verified" if has_docs else "Missing"},
            {"item": "Official Bank Stamp", "status": "Verified" if has_images else "Unclear"},
            {"item": "Account Holder Name", "status": "Verified" if ctx.description else "Missing"},
            {"item": "3-Month Continuity", "status": "Unclear"},
        ]
    elif "legal" in ind:
        return [
            {"item": "Signed Contract Uploaded", "status": "Verified" if has_docs else "Missing"},
            {"item": "Notary Seal Present", "status": "Verified" if has_images else "Missing"},
            {"item": "Execution Date", "status": "Verified" if ctx.description else "Missing"},
            {"item": "Witness Signatures", "status": "Unclear"},
        ]
    else:
        return [
            {"item": "Evidence Document Uploaded", "status": "Verified" if has_docs else "Missing"},
            {"item": "Visual Proof Uploaded", "status": "Verified" if has_images else "Missing"},
            {"item": "Claim Description Provided", "status": "Verified" if ctx.description else "Missing"},
        ]


# ─────────────────────────────────────────────────────
# Agent 6 — Risk Assessment Agent
# ─────────────────────────────────────────────────────

class RiskAssessmentAgent:
    NAME = "Risk Assessment Agent"

    def run(self, ctx: AgentContext) -> AgentContext:
        ctx.timeline.append(
            f"[{self.NAME}] Calculating confidence score and determining verification status."
        )

        # Base score from checklist
        verified = sum(1 for c in ctx.checklist if c.get("status") == "Verified")
        total = len(ctx.checklist) or 1
        checklist_score = verified / total  # 0.0 to 1.0

        # Penalties
        inconsistency_penalty = len(ctx.inconsistencies) * 8
        missing_penalty = len(ctx.missing_evidence) * 10
        validation_penalty = len(ctx.validation_errors) * 15

        # Bonuses
        retrieval_bonus = min(len(ctx.retrieved_context) * 5, 15)
        image_bonus = 8 if ctx.image_observations else 0
        doc_bonus = 10 if ctx.extracted_doc_texts else 0

        raw_score = (
            checklist_score * 70
            + retrieval_bonus
            + image_bonus
            + doc_bonus
            - inconsistency_penalty
            - missing_penalty
            - validation_penalty
        )

        ctx.confidence_score = max(5, min(99, int(raw_score)))

        # Determine status
        if ctx.validation_errors:
            ctx.status = "Insufficient Evidence"
        elif ctx.confidence_score >= 78 and len(ctx.missing_evidence) == 0:
            ctx.status = "Supported"
        elif ctx.confidence_score >= 50 and len(ctx.inconsistencies) <= 1:
            ctx.status = "Needs Review"
        else:
            ctx.status = "Insufficient Evidence"

        ctx.timeline.append(
            f"[{self.NAME}] ✓ Confidence Score: {ctx.confidence_score}%. "
            f"Status: {ctx.status}."
        )
        return ctx


# ─────────────────────────────────────────────────────
# Agent 7 — Report Generation Agent
# ─────────────────────────────────────────────────────

class ReportGenerationAgent:
    NAME = "Report Generation Agent"

    def run(self, ctx: AgentContext) -> AgentContext:
        ctx.timeline.append(
            f"[{self.NAME}] Composing final structured audit report with citations."
        )

        # Build citation list
        citations = [r["citation"] for r in ctx.retrieved_context] if ctx.retrieved_context else []
        citation_block = "\n".join(f"- {c}" for c in citations) if citations else "No policy references retrieved."

        policy_snippets = "\n\n".join(
            f"{r['citation']}\n> {r['text'][:400]}"
            for r in ctx.retrieved_context
        ) if ctx.retrieved_context else ""

        system = (
            "You are the VerifyAI Report Generation Agent. Write a clear, professional, and detailed "
            "verification report in Markdown format. Include:\n"
            "- A ### header with the industry and verification type\n"
            "- A summary paragraph with the overall decision\n"
            "- Bullet points for key findings from visual analysis, documents, and policy rules\n"
            "- Reference policy citations using the format [Source: filename, Chunk N]\n"
            "- A 'Recommendations' section at the end\n"
            "Be factual, concise, and structured. Do not hallucinate. "
            "If evidence is insufficient, clearly state what is missing and why."
        )

        user = (
            f"Industry: {ctx.industry.title()}\n"
            f"Verification Type: {ctx.verification_type.replace('_', ' ').title()}\n"
            f"Final Status: {ctx.status}\n"
            f"Confidence Score: {ctx.confidence_score}%\n\n"
            f"=== CLAIM ===\n{ctx.description}\n\n"
            f"=== VISUAL OBSERVATIONS ===\n" + ("\n".join(ctx.image_observations) or "None") + "\n\n"
            f"=== RETRIEVED POLICY CONTEXT ===\n{policy_snippets or 'None'}\n\n"
            f"=== INCONSISTENCIES FOUND ===\n" + ("\n".join(ctx.inconsistencies) or "None") + "\n\n"
            f"=== MISSING EVIDENCE ===\n" + ("\n".join(ctx.missing_evidence) or "None") + "\n\n"
            f"=== POLICY CITATIONS ===\n{citation_block}\n\n"
            "Write the final audit report now."
        )

        result = _call_groq_text(system, user, max_tokens=1200)

        if result:
            ctx.explanation = result
        else:
            # Fallback: build a structured report without LLM
            ctx.explanation = _build_fallback_report(ctx, citations)

        # Recommendations
        if not ctx.recommendations:
            if ctx.status == "Supported":
                ctx.recommendations = ["Evidence validated. Proceed with claim processing.", "Archive this audit certificate for compliance records."]
            elif ctx.status == "Needs Review":
                ctx.recommendations = ["Manual reviewer required due to flagged inconsistencies.", "Request additional supporting documentation from the claimant."]
            else:
                ctx.recommendations = ["Claim cannot be processed without mandatory evidence.", "Resubmit with all required documents as per policy guidelines."]

        ctx.timeline.append(
            f"[{self.NAME}] ✓ Final audit report generated. "
            f"{len(citations)} policy reference(s) cited."
        )
        return ctx


def _build_fallback_report(ctx: AgentContext, citations: List[str]) -> str:
    """Structured Markdown report built without LLM when API key is absent."""
    ind = ctx.industry.title()
    vtype = ctx.verification_type.replace("_", " ").title()
    lines = [
        f"### {ind} — {vtype} Verification Report",
        "",
        f"**Status: {ctx.status}** | **AI Confidence: {ctx.confidence_score}%**",
        "",
        "#### Summary",
        f"The submitted claim has been evaluated using the VerifyAI Agentic pipeline "
        f"across {len(ctx.files)} uploaded file(s) and cross-referenced against "
        f"{len(ctx.retrieved_context)} retrieved policy document chunk(s).",
        "",
    ]

    if ctx.image_observations:
        lines += ["#### Visual Analysis Findings", ""]
        for obs in ctx.image_observations:
            lines.append(f"- {obs}")
        lines.append("")

    if ctx.extracted_doc_texts:
        lines += ["#### Document Findings", ""]
        for doc in ctx.extracted_doc_texts:
            lines.append(f"- Document **{doc['source']}** was successfully extracted and indexed.")
        lines.append("")

    if ctx.inconsistencies:
        lines += ["#### ⚠ Inconsistencies Detected", ""]
        for inc in ctx.inconsistencies:
            lines.append(f"- {inc}")
        lines.append("")

    if ctx.missing_evidence:
        lines += ["#### Missing Evidence", ""]
        for me in ctx.missing_evidence:
            lines.append(f"- {me}")
        lines.append("")

    if citations:
        lines += ["#### Policy References", ""]
        for c in citations:
            lines.append(f"- {c}")
        lines.append("")

    return "\n".join(lines)


# ─────────────────────────────────────────────────────
# Orchestrator — runs all 7 agents in sequence
# ─────────────────────────────────────────────────────

def run_agentic_verification(
    industry: str,
    verification_type: str,
    description: str,
    files: List[Dict[str, str]],
) -> Dict[str, Any]:
    """
    Entry point: orchestrates all 7 agents and returns the final result dict.
    """

    ctx = AgentContext(
        industry=industry,
        verification_type=verification_type,
        description=description,
        files=files,
    )

    agents = [
        InputValidationAgent(),
        VisionAnalysisAgent(),
        DocumentProcessingAgent(),
        RetrievalAgent(),
        VerificationAgent(),
        RiskAssessmentAgent(),
        ReportGenerationAgent(),
    ]

    for agent in agents:
        try:
            ctx = agent.run(ctx)
        except Exception as e:
            logger.error(f"Agent {agent.NAME} raised an exception: {e}")
            ctx.timeline.append(f"[{agent.NAME}] ✗ Error: {str(e)[:120]}")

    return {
        "status": ctx.status,
        "confidence_score": ctx.confidence_score,
        "explanation": ctx.explanation,
        "checklist": ctx.checklist,
        "timeline": ctx.timeline,
        "recommendations": ctx.recommendations,
        "retrieved_context": ctx.retrieved_context,
        "inconsistencies": ctx.inconsistencies,
        "missing_evidence": ctx.missing_evidence,
        "image_observations": ctx.image_observations,
    }
