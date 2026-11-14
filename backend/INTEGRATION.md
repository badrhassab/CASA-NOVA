# Assistronaut – Backend Integration Guide

This guide describes how to drop the `assistronaut` Django app into your existing `nasa-health-system` backend with **zero merge conflicts**.

---

## 1. Zero-Conflict Architecture

- **Unmanaged Models (`managed = False`)**: The `assistronaut` models map directly to your existing Supabase Postgres tables (`astronauts`, `missions`, `destinations`, `health_biometrics`, `eclss_telemetry`, `medical_chat_logs`). Assistronaut **never** creates migrations or alters your database structure.
- **Auto-logging**: Every conversation is automatically recorded into your existing `medical_chat_logs` Supabase table with appropriate `hrp_hazard_tag` and `triage_level`.
- **Dual Data Source**: If Supabase credentials are in `.env`, it queries Supabase REST API directly or via Django ORM. If offline, it gracefully falls back to an offline sample context.
- **Cloud LLM Intelligence**: Powered by Groq's high-speed cloud inference (`openai/gpt-oss-120b` or `openai/gpt-oss-20b`). Instant responses, no local GPU/Ollama required.

---

## 2. Drop-in Steps

### Step 1: Copy the `assistronaut` folder

Copy the `backend/assistronaut/` directory into your Django project's backend directory:

```bash
# Example assuming both repos are side-by-side:
cp -r Assistronaut/backend/assistronaut/ your-backend/assistronaut/
```

### Step 2: Install requirements

Install the minimal dependencies into your backend's Python environment:

```bash
pip install -r Assistronaut/backend/requirements_assistronaut.txt
```

*(Key libraries: `djangorestframework`, `django-cors-headers`, `supabase`, `requests`)*

### Step 3: Add to `INSTALLED_APPS`

In your Django `settings.py`:

```python
INSTALLED_APPS = [
    # ... your existing apps ...
    'rest_framework',
    'corsheaders',
    'assistronaut',  # <-- Add this single line
]
```

### Step 4: Add CORS Middleware (if not already configured)

In your `settings.py` `MIDDLEWARE`:

```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # <-- Place near the top
    # ... your other middlewares ...
]

CORS_ALLOW_ALL_ORIGINS = True  # Or specify your frontend URL (e.g. http://localhost:5173)
```

### Step 5: Register URL Routes

In your root `urls.py`:

```python
from django.urls import path, include

urlpatterns = [
    # ... your existing routes ...
    path('api/assistronaut/', include('assistronaut.urls')),
]
```

### Step 6: Environment Variables (`.env`)

Add the following to your backend `.env` file (see `.env.example` in repo root):

```env
# Free Groq API Key (get yours at https://console.groq.com/keys)
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=openai/gpt-oss-120b

# Your existing Supabase project credentials (used to pull real astronaut & ECLSS data)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-service-role-or-anon-key
```

### Step 7: DO NOT RUN MIGRATIONS

> **Important**: Do **NOT** run `python manage.py makemigrations assistronaut`.  
> All Assistronaut models have `managed = False`. They read and write directly to your existing Supabase tables without modifying schema.

---

## 3. Endpoints Provided

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/assistronaut/chat/` | Main conversational endpoint. Accepts `message`, optional `astronaut_id`, conversation history. Logs to `medical_chat_logs`. |
| `GET` | `/api/assistronaut/context/` | Returns live astronaut, mission, destination, and ECLSS telemetry context. Query param: `?astronaut_id=<uuid>` |
| `GET` | `/api/assistronaut/health/` | Service health status check. |
| `POST` | `/api/assistronaut/ingest/` | Knowledge base ingestion (optional, when vector RAG is active). |

---

## 4. Testing with cURL

```bash
# 1. Check health
curl http://localhost:8000/api/assistronaut/health/

# 2. Query chat with automatic Supabase lookup
curl -X POST http://localhost:8000/api/assistronaut/chat/ \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I am feeling a little dizziness. Is this normal on our transit to Mars?",
    "astronaut_id": "paste-real-astronaut-uuid-here"
  }'
```
