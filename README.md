# Multi-Agent AI Platform — Multi-Agent Pipeline

A multi-agent content creation system with **Researcher**, **Writer**, and **Editor** agents working in a collaborative loop.

## Architecture

```
┌─────────────────┐
│   Researcher    │  ← Runs ONCE (phase 0)
│   (generates    │
│   research)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│           WRITER-EDITOR LOOP                │
│         (up to 3 iterations)                 │
│                                             │
│   ┌──────────┐    ┌──────────┐              │
│   │  Writer  │───▶│  Editor  │              │
│   │ (draft)  │◀───│ (review) │              │
│   └──────────┘    └──────────┘              │
│        │               │                    │
│        │  if needs     │                    │
│        │  revision     │                    │
│        └───────────────┘                    │
│              │                              │
│              │ if approved or max=3        │
│              ▼                              │
└─────────────────────────────────────────────┘
```

## Pipeline Flow

1. **Researcher Agent** (runs once)
   - Analyzes topic, audience, content type, and tone
   - Generates key points, definitions, outline, examples, and sources
   - Output: structured research notes

2. **Writer-Editor Loop** (up to 3 iterations)
   - **Writer**: Creates/revises content based on research and editor feedback
   - **Editor**: Reviews draft and provides feedback or approval
   - Loop continues until Editor approves OR max iterations reached

## Setup

```bash
npm install
npm install --prefix server
npm install --prefix client
cp .env server/.env # optional; add your GROQ_API_KEY for full LLM support
npm run dev
```

Open `http://localhost:5173`.

## API Endpoints

### POST /api/pipeline/run

Start a new pipeline run.

```json
{
  "topic": "JavaScript Async/Await",
  "contentType": "blog post",
  "audience": "intermediate developers",
  "tone": "educational",
  "wordCount": 800
}
```

**Response:**
```json
{
  "success": true,
  "runId": "uuid-here",
  "message": "Pipeline started"
}
```

### GET /api/pipeline/status/:runId

Check pipeline status and get full results.

**Response includes:**
- `status`: "approved", "needs_revision", or "error"
- `totalIterations`: Number of Writer-Editor cycles (1-3)
- `maxIterations`: 3
- `reachedMaxIterations`: boolean
- `research`: Research agent output
- `draft`: Final approved/revised content
- `editorReview`: Final editor decision with quality score
- `iterations`: Array of all iteration logs
- `approved`: boolean

### GET /api/history

Returns prior pipeline runs.

## Modes

- **With GROQ_API_KEY**: All agents use the Groq LLM for intelligent content generation and review
- **Without a key**: Deterministic demo mode (useful for UI testing and development)

## Logging

Each iteration is logged with detailed visibility:

```
═══ RESEARCHER AGENT - STARTING ═══

▶ [RESEARCHER] started - Topic: JavaScript Async/Await
✓ [RESEARCHER] completed - 5 key points, 1 sources
   Summary: A research brief on JavaScript Async/Await...

═══ WRITER-EDITOR ITERATION 1/3 ═══

▶ [WRITER] started - Initial Draft
✓ [WRITER] completed - Generated 250 words
▶ [EDITOR] started
✓ [EDITOR] completed - Decision: approved (85/100)
   Strengths: Basic structure is present; Covers main topics...

═══ PIPELINE COMPLETED ═══

Total Writer-Editor Cycles: 1
Final Decision: approved
Quality Score: 85/100
Content Approved: YES ✓
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | API key for Groq LLM | (none) |
| `PORT` | Server port | 5000 |
| `MONGO_URI` | MongoDB connection string | (none) |
| `MODEL` | LLM model to use | `mixtral-8x7b-32768` |
