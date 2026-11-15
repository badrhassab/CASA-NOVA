# 🚀 Assistronaut — Mission-Aware Health Assistant

AI-powered medical health-support chatbot for astronauts on long-duration space missions.  
Built as a **drop-in module** for `nasa-health-system`.

## What It Does

Assistronaut is a chatbot that knows:
- **Who** it is talking to (astronaut profile)
- **Where** they are (mission phase, destination, gravity)
- **What health data** is available about them

It answers health questions, monitors symptoms, and escalates emergencies — using NASA/CSA/CDC scientific knowledge via RAG (Retrieval-Augmented Generation) + a local Gemma 3 4B language model (Ollama, free, offline).

## Project Layout

```
Assistronaut/
├── backend/assistronaut/     ← Django app → add to nasa-health-system/backend/
└── frontend/src/             ← React components → add to nasa-health-system/frontend/src/
```

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| Python 3.12+ | Backend | Already installed |
| Ollama | Local LLM runtime | https://ollama.com |
| Gemma 3 4B model | AI model | `ollama pull gemma3:4b` |
| Node 18+ | Frontend | Already installed |

## Quick Integration

### Backend
1. Copy `backend/assistronaut/` → `nasa-health-system/backend/assistronaut/`
2. Follow `backend/INTEGRATION.md`

### Frontend
1. Copy `frontend/src/components/Assistronaut*.jsx` → `nasa-health-system/frontend/src/components/`
2. Copy `frontend/src/services/assistronaut.js` → `nasa-health-system/frontend/src/services/`
3. Follow `frontend/INTEGRATION.md`

## Test Questions

Once running, try these in the chat:

| Question | Expected Behavior |
|----------|------------------|
| "Is my mission dangerous for my bones?" | Explains microgravity bone loss risk, cites NASA |
| "I'm having a cold. My nose is running." | Asks follow-up questions, connects to mission immune context |
| "I have severe chest pain." | 🚨 Immediate emergency escalation |
| "How much bone density have I lost?" | Says no data available, never invents a number |
| "Does Mars gravity protect my bones when I land?" | Distinguishes transit microgravity from 0.38g surface |

## Medical Disclaimer

Assistronaut is an informational support tool. It cannot diagnose medical conditions, prescribe treatment, or replace a licensed physician or flight surgeon. All medical decisions must follow mission-approved medical protocols.
