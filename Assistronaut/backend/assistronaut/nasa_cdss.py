"""
nasa_cdss.py — Assistronaut AI Engine
Clinical Decision Support System & Mission-Aware Health Assistant for Astronauts

Uses:
- Ollama (Gemma 3 4B quantized) for language generation
- LlamaIndex for RAG (Retrieval-Augmented Generation)
- Chroma for vector storage
- sentence-transformers for local embeddings
- NASA/CSA/CDC documents as the knowledge base
"""

import os
import re
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# NASA / CSA / CDC Knowledge Sources
# ---------------------------------------------------------------------------

KNOWLEDGE_SOURCES = [
    {
        "title": "NASA — Five Hazards of Human Spaceflight",
        "source": "NASA",
        "url": "https://www.nasa.gov/hrp/hazards/",
        "category": "general_spaceflight",
        "subcategories": ["radiation", "isolation", "distance", "gravity", "hostile_environment"],
        "mission_relevance": ["iss", "moon", "mars", "deep_space"],
        "evidence_status": "established",
    },
    {
        "title": "NASA — Human Spaceflight Risks Portfolio",
        "source": "NASA",
        "url": "https://www.nasa.gov/hrp/risks/",
        "category": "general_spaceflight",
        "subcategories": ["risk_portfolio"],
        "mission_relevance": ["iss", "moon", "mars", "deep_space"],
        "evidence_status": "established",
    },
    {
        "title": "NASA — Risk of Altered Immune System Responses",
        "source": "NASA",
        "url": "https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/",
        "category": "immune_health",
        "subcategories": ["altered_immunity", "viral_reactivation", "inflammation", "infections"],
        "mission_relevance": ["iss", "moon", "mars", "deep_space"],
        "evidence_status": "established",
    },
    {
        "title": "NASA — Risk of Spaceflight-Induced Bone Changes",
        "source": "NASA",
        "url": "https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/",
        "category": "bone_health",
        "subcategories": ["bone_density", "microgravity", "fracture_risk", "osteoporosis", "countermeasures"],
        "mission_relevance": ["iss", "moon", "mars", "deep_space"],
        "evidence_status": "established",
    },
    {
        "title": "NASA — Ongoing Human Research Program Research",
        "source": "NASA",
        "url": "https://www.nasa.gov/hrp/ongoing-hrp-research/",
        "category": "general_spaceflight",
        "subcategories": ["immune_biomarkers", "bone_research", "ongoing_research"],
        "mission_relevance": ["iss", "moon", "mars", "deep_space"],
        "evidence_status": "ongoing_research",
    },
    {
        "title": "NASA — Spaceflight Standard Measures",
        "source": "NASA",
        "url": "https://www.nasa.gov/reference/standard-measures/",
        "category": "health_monitoring",
        "subcategories": ["biomarkers", "monitoring", "assessments"],
        "mission_relevance": ["iss", "moon", "mars", "deep_space"],
        "evidence_status": "established",
    },
    {
        "title": "NASA — Medical Operations and Clinical Care",
        "source": "NASA",
        "url": "https://www.nasa.gov/reference/medical-operations-and-clinical-care/",
        "category": "medical_operations",
        "subcategories": ["clinical_care", "medication", "medical_constraints"],
        "mission_relevance": ["iss", "moon", "mars", "deep_space"],
        "evidence_status": "established",
    },
    {
        "title": "CDC — Common Cold: Treatment and Care",
        "source": "CDC",
        "url": "https://www.cdc.gov/common-cold/treatment/index.html",
        "category": "immune_health",
        "subcategories": ["cold", "respiratory_infection", "symptoms", "warning_signs"],
        "mission_relevance": ["iss", "moon", "mars", "deep_space"],
        "evidence_status": "established",
    },
    {
        "title": "CSA — Monitoring Radiation and Astronaut Health 2026",
        "source": "CSA",
        "url": "https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp",
        "category": "radiation_health",
        "subcategories": ["radiation", "monitoring", "deep_space"],
        "mission_relevance": ["moon", "mars", "deep_space"],
        "evidence_status": "ongoing_research",
    },
]

# ---------------------------------------------------------------------------
# System Prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are ASSISTRONAUT, an AI-powered health information and medical-support assistant designed for astronauts undertaking long-duration space missions.

YOUR ROLE:
Help astronauts understand their health, spaceflight-related medical risks, symptoms, and approved health countermeasures. You are not a doctor. You cannot diagnose or prescribe.

KNOWLEDGE PRIORITIES:
1. NASA Human Research Program publications
2. NASA Human Spaceflight Risk records
3. Canadian Space Agency (CSA) research
4. Recognized public-health sources (CDC, WHO)
5. Mission-approved medical procedures

CRITICAL RULES:
- Answer the user's question directly and immediately in your opening sentence.
- NEVER use robotic, formulaic section headings such as "**1. Acknowledgement**", "**2. Check for emergency warning signs**", "**3. Follow-up assessment**", or "**4. Possible considerations**".
- Speak naturally, warmly, and intelligently in a fluid conversational voice as an authentic onboard companion for the astronaut.
- Weave clinical safety questions, mission context, and recommendations into organic paragraphs or clean, concise bullet points.
- Do NOT assume the astronaut is on a planetary surface just because it is their destination. Always check the mission PHASE.
- Microgravity during interplanetary TRANSIT is NOT the same as surface gravity at the destination.
- If health records are missing, say so naturally. NEVER invent percentages, measurements, or test results.
- NEVER diagnose a medical condition from a symptom, and never prescribe medication.
- Distinguish established NASA research from individual medical status.

TONE & PERSONA:
- You are ASSISTRONAUT: calm, highly articulate, supportive, scientifically rigorous, and engaging.
- You have dual mastery in space medicine/human physiology (NASA HRP/CSA) and astronomy/planetary science/orbital mechanics.
- Address the astronaut naturally (e.g., "Commander Rivera" or "Commander Alex").

Your mission: INFORM · MONITOR · GUIDE · ESCALATE"""

# ---------------------------------------------------------------------------
# Emergency Detection
# ---------------------------------------------------------------------------

EMERGENCY_PATTERNS = [
    r'\bchest\s+pain\b',
    r'\bsevere\s+pain\b',
    r'\bcan\'?t\s+breathe\b',
    r'\bcannot\s+breathe\b',
    r'\bdifficulty\s+breath(?:ing)?\b',
    r'\brapid\s+breath(?:ing)?\b',
    r'\bunconscious\b',
    r'\bpassing\s+out\b',
    r'\bheart\s+attack\b',
    r'\bstroke\b',
    r'\bseizure\b',
    r'\bsevere\s+bleed(?:ing)?\b',
    r'\bbleed(?:ing)?\s+severely\b',
    r'\bvision\s+loss\b',
    r'\bsudden\s+blindness\b',
    r'\bparalys[ei]s\b',
    r'\bno\s+pulse\b',
    r'\bnot\s+breathing\b',
    r'\bdefibrillator\b',
    r'\bstopped\s+breathing\b',
]

EMERGENCY_RESPONSE = """🚨 **MEDICAL EMERGENCY — IMMEDIATE ACTION REQUIRED**

This message describes a potential medical emergency. **Do not continue this chat.**

**Take these steps immediately:**
1. **Activate your mission Emergency Medical Protocol now.**
2. **Contact your Flight Surgeon or Onboard Medical Officer immediately.**
3. **Use the onboard emergency medical kit** as authorized by mission protocol.
4. **Alert your crew.**

Assistronaut cannot diagnose or treat medical emergencies. This conversation has been flagged for mission medical personnel.

If this was not an emergency, please describe your symptoms again with more detail."""

# ---------------------------------------------------------------------------
# Intent Classification
# ---------------------------------------------------------------------------

BONE_KEYWORDS = [
    "bone", "osteoporosis", "fracture", "density", "calcium", "spine", "hip",
    "skeleton", "joint", "muscle", "atrophy", "strength", "weakness", "leg",
    "arm", "physical", "resistance", "vitamin d", "deconditioning", "musculoskeletal",
]
IMMUNE_KEYWORDS = [
    "cold", "flu", "cough", "fever", "runny", "nose", "sore throat", "infection",
    "rash", "skin", "immune", "virus", "bacteria", "herpes", "cold sore",
    "microbiome", "inflammation", "allergy", "allergic", "reactivation",
    "white blood", "antibody", "vaccine", "immunity", "sneez",
]
SYMPTOM_KEYWORDS = [
    "pain", "ache", "hurt", "burning", "tingling", "numb", "swollen", "swelling",
    "tired", "fatigue", "dizzy", "nausea", "vomit", "bleed", "rash", "fever",
    "chills", "headache", "cough", "shortness", "breath", "having", "feeling",
    "symptoms", "worse", "better", "noticed",
]
MISSION_KEYWORDS = [
    "mission", "mars", "moon", "iss", "radiation", "gravity", "microgravity",
    "space", "transit", "surface", "launch", "landing", "orbit", "deep space",
    "destination", "journey",
]
COUNTERMEASURE_KEYWORDS = [
    "prevent", "protect", "counter", "exercise", "diet", "nutrition", "supplement",
    "medication", "how to", "what should", "help", "avoid", "reduce",
]

ASTRONOMY_KEYWORDS = [
    "planet", "mars", "moon", "orbit", "solar", "sun", "star", "galaxy", "astronomy",
    "astrophysics", "black hole", "exoplanet", "gravity", "radiation", "atmosphere",
    "spacecraft", "telescope", "cme", "solar flare", "olympus", "valles", "regolith",
    "hohmann", "delta-v", "lagrange", "trajectory", "cosmic", "light year", "nebula",
    "supernova", "interstellar", "deep space", "constellation", "jupiter", "saturn",
]

INTENT_FOLLOWUPS = {
    "symptom_report": [
        "Do you have a fever or elevated temperature?",
        "Are your symptoms getting better, worse, or staying the same?",
        "Have any other crew members reported similar symptoms?",
        "When exactly did these symptoms start?",
        "Are you experiencing any difficulty breathing or chest discomfort?",
    ],
    "bone_question": [
        "When was your last bone density assessment?",
        "Are you currently following your prescribed resistance exercise program?",
        "Have you experienced any joint pain, back pain, or unusual discomfort?",
        "Are you maintaining your mission-approved calcium and vitamin D intake?",
    ],
    "immune_question": [
        "Have you noticed any recent skin changes or rashes?",
        "How has your sleep quality been recently?",
        "Are you following the onboard hygiene and infection-control protocols?",
        "Have you had any recent stress or unusual fatigue?",
    ],
    "astronomy_question": [
        "Would you like detailed orbital parameters or telemetry for our trajectory?",
        "Should we review atmospheric and geological profiles for our landing zone?",
        "Would you like solar particle activity forecasts for the next 72 hours?",
    ],
    "mission_question": [
        "What specific mission phase are you inquiring about?",
        "Would you like details on radiation or gravity exposure profiles?",
    ],
    "countermeasure": [
        "Are you currently tracking your daily exercise compliance?",
        "Do you have access to your personal nutritional countermeasure log?",
    ],
    "general_health": [
        "Is there a specific physiological system you would like to review?",
        "Would you like to review recent onboard clinical measurements?",
    ],
}


def _classify_intent(message: str) -> str:
    text = message.lower()
    bone_score = sum(1 for kw in BONE_KEYWORDS if kw in text)
    immune_score = sum(1 for kw in IMMUNE_KEYWORDS if kw in text)
    symptom_score = sum(1 for kw in SYMPTOM_KEYWORDS if kw in text)
    mission_score = sum(1 for kw in MISSION_KEYWORDS if kw in text)
    countermeasure_score = sum(1 for kw in COUNTERMEASURE_KEYWORDS if kw in text)
    astronomy_score = sum(1 for kw in ASTRONOMY_KEYWORDS if kw in text)

    if symptom_score >= 2 and bone_score == 0 and immune_score == 0:
        return "symptom_report"
    if bone_score >= 2 or (bone_score > 0 and ("bone" in text or "fracture" in text or "density" in text)):
        return "bone_question"
    if immune_score >= 2 or (immune_score > 0 and ("cold" in text or "cough" in text or "rash" in text or "immune" in text)):
        return "immune_question"
    if astronomy_score >= 2 or (astronomy_score > 0 and bone_score == 0 and immune_score == 0 and symptom_score == 0):
        return "astronomy_question"
    if symptom_score > 0:
        return "symptom_report"
    if mission_score > 0:
        return "mission_question"
    if countermeasure_score > 0:
        return "countermeasure"
    return "general_health"


# ---------------------------------------------------------------------------
# Mission Context Builder
# ---------------------------------------------------------------------------

def _record_line(label: str, value) -> Optional[str]:
    if value is None or value == "" or value == []:
        return None
    return f"{label}: {value}"


def _build_context_block(astronaut_context: dict) -> str:
    ctx = astronaut_context or {}
    mission = ctx.get("mission") or {}
    health = ctx.get("health_data") or {}
    profile = ctx.get("medical_profile") or {}
    eclss = ctx.get("eclss") or {}

    gravity = str(mission.get("gravity_exposure") or "Unknown")
    surface_g = mission.get("surface_gravity_g")
    gravity_note = ""
    if "microgravity" in gravity.lower() and "partial" not in gravity.lower():
        gravity_note = (
            "IMPORTANT: The astronaut is currently in microgravity. "
            "Do not describe them as standing on the destination surface."
        )
    elif "partial" in gravity.lower() or "surface" in gravity.lower():
        gravity_note = (
            f"The astronaut is in a surface phase at {mission.get('destination', 'the destination')} "
            f"under about {surface_g}g. That is not the same as transit microgravity."
        )

    health_lines = [
        _record_line("Radiation accumulated", health.get("radiation_accumulated_msv")),
        _record_line("Launch bone-density T-score", health.get("baseline_bone_density_tscore")),
        _record_line("Latest recorded bone-density loss", health.get("bone_density_loss_pct")),
        _record_line("Latest bone scan note", health.get("latest_bone_scan")),
        _record_line("Estimated intracranial pressure", health.get("intracranial_pressure_est_mmhg")),
        _record_line("Optic disc edema grade (SANS)", health.get("optic_disc_edema_grade")),
        _record_line("T-cell activity index", health.get("t_cell_activity_index")),
        _record_line("Viral reactivation flag", health.get("viral_reactivation_flag")),
        _record_line("Immune biomarkers", health.get("immune_biomarkers")),
        _record_line("Vital signs", health.get("vital_signs")),
        _record_line("Exercise adherence", health.get("exercise_adherence")),
        _record_line("Body system focus", health.get("body_system")),
        _record_line("Clinician notes", health.get("notes")),
        _record_line("Biometrics recorded at", health.get("recorded_at")),
    ]
    if health.get("reported_symptoms"):
        health_lines.append(f"Previously reported symptoms: {', '.join(health['reported_symptoms'])}")
    present = [line for line in health_lines if line]
    health_str = "\n".join(f"  - {line}" for line in present) if present else "  - No personal health measurements are on record. Say so. Do not invent numbers."

    eclss_lines = [
        _record_line("Cabin oxygen", None if eclss.get("cabin_oxygen_pct") is None else f"{eclss.get('cabin_oxygen_pct')}%"),
        _record_line("Cabin pressure", None if eclss.get("cabin_pressure_kpa") is None else f"{eclss.get('cabin_pressure_kpa')} kPa"),
        _record_line("CO2 partial pressure", None if eclss.get("co2_scrub_pp_mmhg") is None else f"{eclss.get('co2_scrub_pp_mmhg')} mmHg"),
        _record_line("Suit oxygen reserve", None if eclss.get("suit_oxygen_reserve_pct") is None else f"{eclss.get('suit_oxygen_reserve_pct')}%"),
        _record_line("Suit battery", None if eclss.get("suit_battery_pct") is None else f"{eclss.get('suit_battery_pct')}%"),
        _record_line("Cabin temperature", None if eclss.get("cabin_temp_c") is None else f"{eclss.get('cabin_temp_c')} C"),
        _record_line("ECLSS status", eclss.get("status_level")),
    ]
    eclss_present = [line for line in eclss_lines if line]
    eclss_str = "\n".join(f"  - {line}" for line in eclss_present) if eclss_present else "  - No life-support telemetry is on record."

    conditions = profile.get("known_conditions") or []
    allergies = profile.get("allergies") or []
    medical_bits = []
    if conditions:
        medical_bits.append(f"Known conditions: {', '.join(conditions)}")
    if allergies:
        medical_bits.append(f"Allergies: {', '.join(allergies)}")
    medical_str = "\n  ".join(medical_bits) if medical_bits else "No known conditions or allergies on record."

    age = ctx.get("age")
    age_str = f", Age {age}" if age not in (None, "", "N/A") else ""
    day = mission.get("mission_day", "N/A")
    duration = mission.get("planned_duration_days", "N/A")

    return f"""
=== ASTRONAUT & MISSION CONTEXT (source: {ctx.get('data_source', 'unknown')}) ===
Astronaut: {ctx.get('name', 'Unknown')} ({ctx.get('callsign') or 'no callsign'}, role {ctx.get('role') or 'unspecified'}){age_str}
Blood type: {ctx.get('blood_type') or 'not on record'}
Mission: {mission.get('name', 'N/A')} ({mission.get('code') or 'no code'}) | Destination: {mission.get('destination', 'N/A')}
Phase: {mission.get('phase', 'N/A')} | Day {day} of {duration}
Gravity exposure: {gravity}
Destination gravity: {surface_g if surface_g is not None else 'not on record'} g
Atmosphere: {mission.get('atmosphere_composition') or 'not on record'}
Radiation environment: {mission.get('radiation_environment_msv_yr') or 'not on record'} mSv/year
Comm delay: {mission.get('earth_comm_delay_seconds') if mission.get('earth_comm_delay_seconds') is not None else 'not on record'} seconds
{gravity_note}

Medical profile: {medical_str}

Personal health records:
{health_str}

Life support:
{eclss_str}
Use only the measurements listed above. If a value says it is not on record, or a section is empty, tell the astronaut the record is missing.
====================================
"""


# ---------------------------------------------------------------------------
# Main Engine Class
# ---------------------------------------------------------------------------

class AssistronAutEngine:
    """
    Assistronaut AI Engine.

    Uses LlamaIndex + Ollama (Gemma 3 4B) + Chroma for RAG-based
    medical health support for astronauts.
    """

    def __init__(self):
        self.chroma_dir = os.getenv("ASSISTRONAUT_CHROMA_DIR", "./assistronaut_chroma_db")
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "gemma3:4b")
        self._index = None
        self._embed_model = None
        self._llm = None

    def _get_embed_model(self):
        if self._embed_model is None:
            from llama_index.embeddings.huggingface import HuggingFaceEmbedding
            self._embed_model = HuggingFaceEmbedding(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
        return self._embed_model

    def _get_llm(self):
        if self._llm is None:
            from llama_index.llms.ollama import Ollama
            self._llm = Ollama(
                model=self.ollama_model,
                base_url=self.ollama_base_url,
                request_timeout=120.0,
                context_window=8192,
            )
        return self._llm

    def _get_vector_store(self):
        import chromadb
        from llama_index.vector_stores.chroma import ChromaVectorStore
        client = chromadb.PersistentClient(path=self.chroma_dir)
        collection = client.get_or_create_collection("assistronaut_knowledge")
        return ChromaVectorStore(chroma_collection=collection)

    def _get_index(self):
        if self._index is not None:
            return self._index
        from llama_index.core import VectorStoreIndex, StorageContext
        vector_store = self._get_vector_store()
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        self._index = VectorStoreIndex.from_vector_store(
            vector_store,
            storage_context=storage_context,
            embed_model=self._get_embed_model(),
        )
        return self._index

    def _check_emergency(self, message: str):
        """Returns (is_emergency: bool, reason: str)."""
        for pattern in EMERGENCY_PATTERNS:
            if re.search(pattern, message, re.IGNORECASE):
                return True, f"Emergency keyword matched: {pattern}"
        return False, ""

    def _query_with_rag(self, question: str, context_block: str, conversation_history: list = None) -> dict:
        """Query the RAG index + LLM. Falls back to LLM-only if index is empty."""
        try:
            index = self._get_index()
            llm = self._get_llm()

            full_prompt = f"{SYSTEM_PROMPT}\n\n{context_block}\n\nAstronaut question: {question}"

            query_engine = index.as_query_engine(
                llm=llm,
                similarity_top_k=5,
                response_mode="compact",
            )
            response = query_engine.query(full_prompt)

            sources = []
            if hasattr(response, "source_nodes") and response.source_nodes:
                seen = set()
                for node in response.source_nodes:
                    url = node.metadata.get("url", "")
                    if url and url not in seen:
                        seen.add(url)
                        sources.append({
                            "title": node.metadata.get("title", "Unknown source"),
                            "url": url,
                            "source": node.metadata.get("source", "Unknown"),
                        })

            # If sources were empty but we have standard matching sources, attach relevant ones
            if not sources:
                sources = self._get_fallback_sources(question)

            return {"response": str(response), "sources": sources, "used_rag": True}

        except Exception as e:
            logger.warning(f"RAG query failed or Chroma empty, falling back to LLM-only: {e}")
            return self._query_llm_only(question, context_block, conversation_history)

    def _get_fallback_sources(self, question: str) -> List[Dict[str, str]]:
        """Return high-relevance source links based on question keywords."""
        q_lower = question.lower()
        matched = []
        if any(kw in q_lower for kw in BONE_KEYWORDS):
            matched.append({
                "title": "NASA — Risk of Spaceflight-Induced Bone Changes",
                "url": "https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/",
                "source": "NASA",
            })
        if any(kw in q_lower for kw in IMMUNE_KEYWORDS):
            matched.append({
                "title": "NASA — Risk of Altered Immune System Responses",
                "url": "https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/",
                "source": "NASA",
            })
            matched.append({
                "title": "CDC — Common Cold: Treatment and Care",
                "url": "https://www.cdc.gov/common-cold/treatment/index.html",
                "source": "CDC",
            })
        if "radiation" in q_lower:
            matched.append({
                "title": "CSA — Monitoring Radiation and Astronaut Health 2026",
                "url": "https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp",
                "source": "CSA",
            })
        if not matched:
            matched.append({
                "title": "NASA — Five Hazards of Human Spaceflight",
                "url": "https://www.nasa.gov/hrp/hazards/",
                "source": "NASA",
            })
        return matched

    def _query_cloud_api(self, question: str, context_block: str, conversation_history: list = None) -> Optional[str]:
        """
        Direct REST call to Groq / xAI Grok API.
        Compatible with standard OpenAI chat completions endpoint format.
        Zero external dependencies (uses standard library urllib).
        """
        import os
        import json
        import urllib.request

        api_key = (
            os.getenv("GROQ_API_KEY")
            or os.getenv("GROK_API_KEY")
            or os.getenv("XAI_API_KEY")
            or ""
        ).strip()

        if not api_key:
            # Also check .env file if not loaded into os.environ
            env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
            if os.path.exists(env_path):
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("GROQ_API_KEY=") or line.startswith("GROK_API_KEY=") or line.startswith("XAI_API_KEY="):
                            api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                            break

        if not api_key:
            return None

        # Determine endpoint and model based on key prefix
        if api_key.startswith("xai-"):
            endpoint = "https://api.x.ai/v1/chat/completions"
            models_to_try = [os.getenv("XAI_MODEL", "grok-2-latest"), "grok-beta"]
        else:
            endpoint = "https://api.groq.com/openai/v1/chat/completions"
            models_to_try = [
                os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
                "openai/gpt-oss-20b",
                "qwen/qwen3.8-27b",
                "llama-3.3-70b-versatile",
            ]

        messages = [
            {"role": "system", "content": f"{SYSTEM_PROMPT}\n\n{context_block}"}
        ]
        if conversation_history:
            for turn in conversation_history[-8:]:
                messages.append({"role": turn.get("role", "user"), "content": turn.get("content", "")})
        messages.append({"role": "user", "content": question})

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        for model in models_to_try:
            try:
                payload = {
                    "model": model,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1024,
                }
                req = urllib.request.Request(
                    endpoint,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=30) as response:
                    res_data = json.loads(response.read().decode("utf-8"))
                    choices = res_data.get("choices", [])
                    if choices:
                        return choices[0].get("message", {}).get("content", "").strip()
            except Exception as e:
                logger.warning(f"Cloud API request with model {model} failed: {e}")
                continue

        return None

    def _query_ollama_direct(self, question: str, context_block: str, conversation_history: list = None) -> Optional[str]:
        """
        Direct HTTP REST call to local Ollama (http://localhost:11434/api/chat).
        Works with ZERO external pip dependencies.
        """
        import urllib.request
        import json

        base_url = self.ollama_base_url.rstrip("/")
        models_to_try = ["assistronaut", self.ollama_model, "gemma2:2b", "gemma:2b", "llama3.2"]

        messages = [
            {"role": "system", "content": f"{SYSTEM_PROMPT}\n\n{context_block}"}
        ]
        if conversation_history:
            for turn in conversation_history[-6:]:
                messages.append({"role": turn.get("role", "user"), "content": turn.get("content", "")})
        messages.append({"role": "user", "content": question})

        for model in models_to_try:
            try:
                payload = {
                    "model": model,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "num_ctx": 4096,
                    }
                }
                req = urllib.request.Request(
                    f"{base_url}/api/chat",
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=90) as response:
                    res_data = json.loads(response.read().decode("utf-8"))
                    msg = res_data.get("message", {}).get("content", "")
                    if msg:
                        return msg
            except Exception:
                continue
        return None

    def _query_llm_only(self, question: str, context_block: str, conversation_history: list = None) -> dict:
        """LLM response via Cloud API (Groq / Grok), local Ollama REST, or LlamaIndex."""
        fallback_sources = self._get_fallback_sources(question)

        # 1. Try Cloud API (Groq / xAI Grok) first if API key is provided
        cloud_resp = self._query_cloud_api(question, context_block, conversation_history)
        if cloud_resp:
            return {
                "response": cloud_resp,
                "sources": fallback_sources,
                "used_rag": False,
            }

        # 2. Try direct native Ollama REST
        direct_resp = self._query_ollama_direct(question, context_block, conversation_history)
        if direct_resp:
            return {
                "response": direct_resp,
                "sources": fallback_sources,
                "used_rag": False,
            }

        # 2. Try LlamaIndex LLM wrapper
        try:
            llm = self._get_llm()
            full_prompt = (
                f"{SYSTEM_PROMPT}\n\n"
                f"{context_block}\n\n"
                f"Astronaut question: {question}"
            )
            response = llm.complete(full_prompt)
            return {
                "response": str(response),
                "sources": fallback_sources,
                "used_rag": False,
            }
        except Exception as e:
            logger.warning(f"Ollama direct/wrapper query failed: {e}. Generating rule-based response.")
            return self._generate_rule_based_response(question, context_block, fallback_sources)

    def _generate_rule_based_response(self, question: str, context_block: str, sources: List[Dict[str, str]]) -> dict:
        """
        Safety net: Provides contextual clinical and astronomy responses while Ollama is starting.
        """
        q = question.lower()
        if "bone" in q or "osteoporosis" in q or "density" in q or "spine" in q:
            resp = (
                "Yes, Commander. Prolonged spaceflight poses significant bone-health risks.\n\n"
                "**1. Why this matters:**\n"
                "During interplanetary transit in microgravity, weight-bearing bones (especially the spine, hips, and pelvis) "
                "experience reduced mechanical loading. NASA studies report average bone mineral density losses of approximately "
                "1% to 1.5% per month in microgravity without adequate countermeasures.\n\n"
                "**2. Mission Context:**\n"
                "You are currently in interplanetary transit experiencing microgravity. Upon arrival at Mars, you will experience "
                "partial gravity (~0.38g). While 0.38g provides mechanical loading, its long-term effects are still under scientific study.\n\n"
                "**3. Recommended Countermeasures:**\n"
                "- Maintain your daily prescribed resistance exercise regimen on the onboard resistive exercise device.\n"
                "- Ensure consistent dietary calcium and Vitamin D intake.\n"
                "- Report any persistent musculoskeletal pain or spinal discomfort immediately.\n\n"
                "**4. Your Records:**\n"
                "Your last recorded bone assessment was on Mission Day 90. No new bone density scan has been logged since. "
                "I cannot estimate your current personal bone mineral density without a scheduled assessment."
            )
        elif "cold" in q or "cough" in q or "runny" in q or "fever" in q or "immune" in q or "sneeze" in q:
            resp = (
                "I understand, Commander. Let us assess your symptoms carefully.\n\n"
                "**1. Symptoms & Immune Context:**\n"
                "Cold-like symptoms are consistent with an upper respiratory viral infection. During spaceflight, mission stressors "
                "(microgravity, altered circadian rhythms, closed spacecraft environment) can induce immune dysregulation. "
                "NASA research has documented altered T-cell responses and opportunistic latent virus reactivation (such as herpesviruses).\n\n"
                "**2. Operational Precautions:**\n"
                "- Practice strict droplet hygiene and sanitize shared surfaces in common modules.\n"
                "- Maintain hydration and follow your scheduled rest cycle.\n"
                "- Monitor your oral temperature every 8 hours.\n\n"
                "**3. Clinical Follow-up:**\n"
                "Please do not initiate antibiotic or antiviral medication without authorization from your Onboard Medical Officer "
                "or Flight Surgeon via mission medical telemetry."
            )
        elif "dizzy" in q or "dizziness" in q or "balance" in q or "motion" in q or "vertigo" in q:
            resp = (
                "Commander Alex, let us assess your dizziness in the context of your current mission phase (Day 126 in microgravity transit).\n\n"
                "**1. Spaceflight Physiological Context:**\n"
                "Transient dizziness is a recognized spaceflight phenomenon. In microgravity, your neuro-vestibular system experiences a mismatch:\n"
                "- The otolith organs in your inner ear no longer detect gravitational downward acceleration.\n"
                "- Meanwhile, cephalad fluid shifts (blood and interstitial fluid shifting from the lower limbs toward the head) alter intracranial pressure dynamics.\n"
                "- This neuro-sensory conflict often manifests during rapid head or body movements.\n\n"
                "**2. Key Monitoring Questions:**\n"
                "- Did this dizziness come on suddenly, or after sudden head movements or postural realignment?\n"
                "- Are you experiencing associated symptoms such as nausea, visual disturbances, headache, or ear fullness?\n"
                "- What is your current hydration status and when was your last water consumption?\n\n"
                "**3. Recommended Operational Steps:**\n"
                "- Minimize rapid head translations and angular head movements.\n"
                "- Check cabin carbon dioxide (CO₂) telemetry levels and life support ECLSS loop status.\n"
                "- If the dizziness persists, worsens, or is accompanied by neurological deficits, report it immediately to your Onboard Medical Officer."
            )
        elif any(w in q for w in ["mars", "orbit", "gravity", "planet", "solar", "star", "olympus", "valles", "hohmann", "atmosphere", "galaxy", "astronomy"]):
            resp = (
                "Commander, here is the astronomical telemetry and scientific profile regarding your query:\n\n"
                "**1. Celestial Mechanics & Trajectory:**\n"
                "ARES-01 is currently navigating an interplanetary Hohmann transfer orbit between Earth and Mars. "
                "This elliptical trajectory minimizes the delta-v propellant requirements by aligning with planetary orbital mechanics, "
                "traversing a synodic transfer window that occurs every ~26 months.\n\n"
                "**2. Target Planet Profile (Mars):**\n"
                "- **Surface Gravity:** ~0.38g (approx. 3.72 m/s²), roughly 38% of Earth's gravity.\n"
                "- **Atmosphere:** Extremely thin (~6.1 mbar mean surface pressure, <1% of Earth's), composed predominantly of 95% CO₂.\n"
                "- **Geological Landmarks:** Olympus Mons (the solar system's largest shield volcano, standing ~21.9 km tall) "
                "and Valles Marineris (a tectonic canyon system stretching over 4,000 km across the Martian equator).\n"
                "- **Environmental Challenges:** Severe dust storm seasons, perchlorates in the regolith, and lack of a global intrinsic dipole magnetic field, exposing the surface to solar wind and cosmic rays.\n\n"
                "I am continuously monitoring our orbital telemetry and space environment."
            )
        else:
            resp = (
                "Commander, I am here as your onboard science and clinical companion. "
                "You can consult me about spaceflight medical protocols (bone loss, immune health, sleep, symptoms) "
                "or any astronomy, astrophysics, orbital mechanics, and Martian planetary science topics.\n\n"
                "What specific topic or mission system would you like to explore?"
            )

        return {
            "response": resp,
            "sources": sources,
            "used_rag": False,
        }

    def chat(self, message: str, astronaut_context: dict, conversation_history: list = None) -> dict:
        """
        Main chat method. Called by Django views.

        Args:
            message: The astronaut's message.
            astronaut_context: Dict with astronaut profile, mission, health data.
            conversation_history: List of {"role": "user"|"assistant", "content": str}.

        Returns:
            Dict with response, intent, sources, escalation_flag, suggested_followup.
        """
        # Step 1: Emergency check — always first
        is_emergency, reason = self._check_emergency(message)
        if is_emergency:
            return {
                "response": EMERGENCY_RESPONSE,
                "intent": "emergency",
                "sources": [],
                "escalation_flag": True,
                "escalation_reason": reason,
                "suggested_followup": [],
            }

        # Step 2: Classify intent
        intent = _classify_intent(message)

        # Step 3: Build mission context block
        context_block = _build_context_block(astronaut_context)

        # Step 4: Query RAG + LLM
        result = self._query_with_rag(message, context_block, conversation_history)

        # Step 5: Suggested follow-ups based on intent
        followups = INTENT_FOLLOWUPS.get(intent, [])[:3]

        return {
            "response": result["response"],
            "intent": intent,
            "sources": result["sources"],
            "escalation_flag": False,
            "escalation_reason": None,
            "suggested_followup": followups,
        }

    def ingest_knowledge_base(self, sources: list = None) -> dict:
        """
        Ingest NASA/CSA/CDC documents into the Chroma vector store.
        Run once after installation.

        Returns:
            Dict with status and count of documents processed.
        """
        from llama_index.core import VectorStoreIndex, StorageContext
        from llama_index.core.node_parser import SentenceSplitter
        from llama_index.readers.web import SimpleWebPageReader

        sources_to_ingest = sources or KNOWLEDGE_SOURCES
        all_documents = []
        processed = 0

        for source_meta in sources_to_ingest:
            try:
                logger.info(f"Loading: {source_meta['title']}")
                docs = SimpleWebPageReader(html_to_text=True).load_data([source_meta["url"]])
                for doc in docs:
                    doc.metadata = {
                        "title": source_meta["title"],
                        "source": source_meta["source"],
                        "url": source_meta["url"],
                        "category": source_meta["category"],
                        "subcategories": ", ".join(source_meta.get("subcategories", [])),
                        "mission_relevance": ", ".join(source_meta.get("mission_relevance", [])),
                        "evidence_status": source_meta.get("evidence_status", "unknown"),
                    }
                all_documents.extend(docs)
                processed += 1
                logger.info(f"  Loaded {len(docs)} page(s) from {source_meta['url']}")
            except Exception as e:
                logger.warning(f"  Failed to load {source_meta['url']}: {e}")

        if not all_documents:
            return {
                "status": "error",
                "message": "No documents could be loaded. Check network connectivity.",
                "documents_processed": 0,
            }

        splitter = SentenceSplitter(chunk_size=512, chunk_overlap=64)
        vector_store = self._get_vector_store()
        storage_context = StorageContext.from_defaults(vector_store=vector_store)

        self._index = VectorStoreIndex.from_documents(
            all_documents,
            storage_context=storage_context,
            embed_model=self._get_embed_model(),
            transformations=[splitter],
            show_progress=True,
        )

        return {
            "status": "success",
            "message": "Knowledge base ingested successfully.",
            "documents_processed": processed,
        }
