# Multi-Agent AI Platform — Researcher MVP

This implementation intentionally makes only the **Researcher agent** operational. Writer and Editor are placeholders for the next stages.

## Setup
```bash
npm install
npm install --prefix server
npm install --prefix client
cp .env server/.env # optional; add your OPENAI_API_KEY to server/.env
npm run dev
```
Open `http://localhost:5173`.

## Modes
- With `OPENAI_API_KEY`: the Researcher calls OpenAI and validates its structured JSON.
- Without a key: deterministic demo research is returned, so the app, API, history, and logs still work.

`POST /api/pipeline/run` accepts `topic`, `contentType`, `audience`, and `tone`. `GET /api/history` returns prior runs.
