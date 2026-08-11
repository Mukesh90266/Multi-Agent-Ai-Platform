# Multi-Agent AI Platform

A configurable multi-agent content platform. It includes the original **Researcher → Writer → Editor** workflow as a built-in/default pipeline, and now also lets users create custom prompt-driven agents and arrange them into dynamic pipelines.

## What changed

- Built-in agents remain available:
  - **Researcher** — creates structured research notes (`web_search` tool)
  - **Writer** — creates/revises Markdown drafts
  - **Editor** — reviews drafts with a decision, quality score, and revision instructions (`verification_api` tool)
- Users can create custom agents with:
  - Agent name
  - Role
  - Personality
  - System prompt
  - Optional **tools** (capabilities, not pipeline steps)
- Custom agents are persisted in `server/data/customAgents.json` at runtime.
- The frontend includes:
  - Agent Builder (with tool assignment)
  - Agent Library
  - Pipeline Builder with reorder/remove controls
  - Live output for every executed agent, including tool-call traces
- The orchestrator now executes selected pipeline steps through a shared dynamic agent executor instead of a hardcoded `research() → writeContent() → reviewContent()` sequence.
- **Dynamic tool calling** runs *inside* whichever agent needs it (first, middle, or last). Tools are looked up from a registry; the LLM decides from the user input whether a tool is required.

## Dynamic tool calling

Tools are **agent capabilities**, not fixed pipeline positions.

```text
Any Agent
  → LLM (user input + role + prior outputs + allowed tools)
  → Tool needed?
       No  → final agent output
       Yes → Tool Registry → external tool/API → result → LLM continues
  → Agent output
  → Next pipeline agent
```

Built-in tools:

| Tool id | Name | Purpose |
|---|---|---|
| `web_search` | Web Search | Current/external information for a query |
| `verification_api` | Verification API | Check factual claims |

Assign tools when creating a custom agent, or rely on built-in defaults. Tool use does **not** depend on agent order in the pipeline.

## Default pipeline

The pre-built default pipeline is still:

```text
Researcher → Writer → Editor
```

For backwards compatibility, the default pipeline keeps the existing Writer ↔ Editor review loop:

```text
Researcher runs once
Writer ↔ Editor repeats up to 3 times until Editor quality score >= 80
```

This loop is attached to the default pipeline configuration and still runs through the same dynamic execution path used by custom pipelines.

## Custom pipeline examples

Users can now build and run pipelines such as:

```text
Researcher → Writer → Fact Checker → Editor
Writer → Translator → Editor
Custom Agent A → Custom Agent B
```

Each agent receives a shared pipeline context containing:

- Original user input
- Pipeline order
- Outputs from previous agents

Custom agents do **not** depend on Researcher, Writer, or Editor. They execute according to their saved role, personality, and system prompt.

## Setup

```bash
npm install
npm install --prefix server
npm install --prefix client
cp server/.env.example server/.env # optional; add GROQ_API_KEY for full LLM support
npm run dev
```

Open `http://localhost:5173`.

## API Endpoints

### Agents

#### GET `/api/agents`

Returns built-in and custom agents plus built-in pipeline templates.

#### POST `/api/agents`

Create a custom agent.

```json
{
  "name": "Fact Checker",
  "role": "Checks claims and flags uncertainty",
  "personality": "Skeptical and concise",
  "systemPrompt": "Review the original input and previous outputs. Identify factual claims and flag anything uncertain. Use tools when verification is needed.",
  "tools": ["web_search", "verification_api"]
}
```

#### GET `/api/tools`

Returns the tool registry (id, name, description, parameters) used by Agent Builder and the executor.

### Pipelines

#### GET `/api/pipeline/templates`

Returns pre-built pipeline templates. Currently includes the default Researcher → Writer → Editor pipeline.

#### POST `/api/pipeline/run`

Start a pipeline run. If no `pipeline` is supplied, the default pre-built pipeline is used.

```json
{
  "topic": "JavaScript Async/Await",
  "contentType": "Blog post",
  "audience": "Intermediate developers",
  "tone": "Educational",
  "wordCount": 800,
  "pipeline": {
    "agentIds": ["researcher", "writer", "editor"],
    "templateId": "default-rwe"
  }
}
```

A custom pipeline can omit `templateId`:

```json
{
  "topic": "Translate this article to Spanish",
  "contentType": "Translation",
  "audience": "General",
  "tone": "Clear",
  "wordCount": 800,
  "pipeline": {
    "agentIds": ["writer", "custom-translator-abc123"]
  }
}
```

#### GET `/api/pipeline/status/:runId`

Returns live state and final outputs, including:

- `pipeline.steps`
- `agentStatus`
- `agentOutputs`
- `iterations`
- `research`, `draft`, and `editorReview` when built-in agents are used
- `finalOutput`

### History

#### GET `/api/history`

Returns prior pipeline runs when MongoDB is connected.

## Modes

- **With `GROQ_API_KEY`**: Agents use the Groq-compatible OpenAI client.
- **Without a key**: Deterministic demo mode for development and UI testing.

## Configuration

| Variable | Description | Default |
|---|---|---|
| `GROQ_API_KEY` | API key for Groq LLM | none |
| `GROQ_MODEL` | Model name | `llama-3.3-70b-versatile` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/multi-agent-pipeline` |
