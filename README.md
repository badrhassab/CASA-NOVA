# 🚀 Assistronaut — Spaceflight Medical & Science AI Companion

**Assistronaut** is an onboard conversational AI assistant designed for astronauts on long-duration space missions (Moon, Mars transit, deep space). It provides personalized clinical decision support, symptom monitoring, and astronomy/orbital science knowledge.

Built specifically as a **zero-conflict, drop-in package** for a **Django + React + TypeScript + Supabase** application stack.

---

## 🌟 Key Features

- **Conversational & Mission-Aware**: Answers directly, naturally, and contextually. Understands the difference between transit microgravity and partial gravity surfaces (e.g. Moon 0.16g, Mars 0.38g).
- **Supabase Integration**: Connects directly to your PostgreSQL database (`astronauts`, `missions`, `destinations`, `health_biometrics`, `eclss_telemetry`).
- **Automatic Audit Logging**: Every conversation turn is saved to `medical_chat_logs` with triage level (`ROUTINE`, `URGENT`, `EMERGENCY`) and HRP hazard tags.
- **Zero Database Migrations (`managed = False`)**: Safe to drop into any existing Django project without schema changes or conflict risk.
- **Blazing Fast Cloud LLM**: Default inference via Groq Cloud API (`openai/gpt-oss-120b`), requiring zero local GPU memory or Docker daemon setup.
- **Full TypeScript Frontend**: Modern React components with Tailwind CSS styling (`AssistronautChat.tsx` full page & `AssistronautWidget.tsx` floating drawer).

---

## 📁 Project Structure

```
Assistronaut/
├── .env.example                         # Environment variable template
├── README.md                            # Main project overview (this file)
├── backend/
│   ├── INTEGRATION.md                   # Step-by-step backend drop-in guide
│   ├── requirements_assistronaut.txt    # Python dependencies
│   └── assistronaut/                    # Self-contained Django app
│       ├── __init__.py
│       ├── apps.py                      # App configuration
│       ├── urls.py                      # /chat/, /context/, /health/, /ingest/
│       ├── serializers.py              # DRF serializers
│       ├── views.py                     # API views + auto-logging to medical_chat_logs
│       ├── models.py                    # Unmanaged Django ORM models (managed=False)
│       ├── db.py                        # Supabase REST + ORM bidirectional sync
│       └── nasa_cdss.py                 # Core AI clinical & science engine
└── frontend/
    ├── INTEGRATION.md                   # Step-by-step frontend integration guide
    └── src/
        ├── types/
        │   └── assistronaut.ts          # TypeScript interfaces (schema-matched)
        ├── services/
        │   └── assistronaut.ts          # Axios API client
        └── components/
            ├── AssistronautChat.tsx     # Full command-center chat view with telemetry
            └── AssistronautWidget.tsx   # Floating modal widget for any page
```

---

## ⚡ Quick Start for Teammates

### Backend
1. Copy `backend/assistronaut/` into your Django project root.
2. Add `'assistronaut'` to `INSTALLED_APPS` and include `assistronaut.urls` in `urls.py`.
3. Add `GROQ_API_KEY` and Supabase keys to your `.env` (see `.env.example`).
4. Read [`backend/INTEGRATION.md`](backend/INTEGRATION.md) for full instructions.

### Frontend
1. Copy `frontend/src/` files into your React TypeScript project (`src/components/`, `src/services/`, `src/types/`).
2. Import `<AssistronautChat />` as a new route or `<AssistronautWidget />` into your layout.
3. Teammates can immediately customize the UI or styling in the `.tsx` components!
4. Read [`frontend/INTEGRATION.md`](frontend/INTEGRATION.md) for full instructions.

---

## 🩺 Clinical & Emergency Safeguards

- **Emergency Escalation**: Immediate alerts for life-threatening symptoms (e.g. acute chest pain, sudden vision loss, severe depressurization).
- **Scientific Sourcing**: Cites NASA Human Research Program (HRP), Canadian Space Agency (CSA), and CDC guidelines.
- **Truthfulness**: Never hallucinates personal biometric numbers if they are not recorded in Supabase.
