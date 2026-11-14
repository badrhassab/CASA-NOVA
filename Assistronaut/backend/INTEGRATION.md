# Backend Integration Guide

## Steps to integrate Assistronaut into nasa-health-system

### 1. Copy the Django app

```bash
cp -r Assistronaut/backend/assistronaut/ nasa-health-system/backend/assistronaut/
```

### 2. Install dependencies

```bash
cd nasa-health-system/backend
pip install -r ../Assistronaut/backend/requirements_assistronaut.txt
```

### 3. Add to INSTALLED_APPS

In `nasa-health-system/backend/core/settings.py` (or your settings file):

```python
INSTALLED_APPS = [
    # ... existing apps ...
    'rest_framework',
    'corsheaders',
    'assistronaut',
]
```

### 4. Add CORS middleware (if not already present)

In `settings.py`, add to `MIDDLEWARE` (before `CommonMiddleware`):

```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # ... other middleware ...
]

CORS_ALLOW_ALL_ORIGINS = True  # For local development
```

### 5. Register URL routes

In `nasa-health-system/backend/core/urls.py`:

```python
from django.urls import path, include

urlpatterns = [
    # ... existing urls ...
    path('api/assistronaut/', include('assistronaut.urls')),
]
```

### 6. Run migrations

```bash
python manage.py makemigrations assistronaut
python manage.py migrate
```

### 7. Install Ollama and pull the model

```bash
# Install Ollama from https://ollama.com
# Then pull Gemma 3 4B (quantized, ~2.5GB):
ollama pull gemma3:4b
```

### 8. Ingest the NASA/CSA/CDC knowledge base (run once)

```bash
python manage.py shell -c "
from assistronaut.nasa_cdss import AssistronAutEngine
engine = AssistronAutEngine()
result = engine.ingest_knowledge_base()
print(result)
"
```

This downloads and indexes NASA, CSA, and CDC documents into your local Chroma database (`./assistronaut_chroma_db`).

### 9. Test the endpoint

```bash
curl -X POST http://localhost:8000/api/assistronaut/chat/ \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Is my mission dangerous for my bones?",
    "astronaut_context": {
      "id": "AST-001",
      "name": "Commander Alex Rivera",
      "age": 35,
      "mission": {
        "name": "ARES-01",
        "destination": "Mars",
        "phase": "Interplanetary transit",
        "mission_day": 126,
        "planned_duration_days": 900,
        "gravity_exposure": "Microgravity during transit"
      },
      "medical_profile": {"known_conditions": [], "allergies": []},
      "health_data": {
        "latest_bone_scan": "Mission Day 90",
        "exercise_adherence": "85% adherence",
        "immune_biomarkers": "No recent result"
      }
    },
    "conversation_history": []
  }'
```

---

## API Reference

### POST /api/assistronaut/chat/

**Request Body:**
```json
{
  "message": "string",
  "astronaut_context": {
    "id": "string",
    "name": "string",
    "age": 0,
    "mission": {
      "name": "string",
      "destination": "string",
      "phase": "string",
      "mission_day": 0,
      "planned_duration_days": 0,
      "gravity_exposure": "string"
    },
    "medical_profile": {
      "known_conditions": [],
      "allergies": []
    },
    "health_data": {
      "latest_bone_scan": "string or null",
      "exercise_adherence": "string or null",
      "immune_biomarkers": "string or null"
    }
  },
  "conversation_history": [
    {"role": "user", "content": "string"},
    {"role": "assistant", "content": "string"}
  ],
  "conversation_id": "string (optional)"
}
```

**Response:**
```json
{
  "response": "string",
  "intent": "bone_question | immune_question | symptom_report | mission_question | countermeasure | general_health | emergency",
  "sources": [
    {"title": "string", "url": "string", "source": "string"}
  ],
  "escalation_flag": false,
  "escalation_reason": null,
  "suggested_followup": ["string"],
  "conversation_id": "string"
}
```

### POST /api/assistronaut/ingest/

Triggers knowledge base ingestion. No request body needed.

**Response:**
```json
{
  "status": "success",
  "message": "Knowledge base ingested successfully.",
  "documents_processed": 9
}
```
