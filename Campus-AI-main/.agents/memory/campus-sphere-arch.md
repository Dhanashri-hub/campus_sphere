---
name: CampusSphere Architecture
description: Key decisions and wiring for the CampusSphere virtual AI campus app.
---

## Stack
- Frontend: `artifacts/campus-sphere` (React + Vite, path `/`)
- API: `artifacts/api-server` (Express, port from `$PORT`, proxied at `/api`)
- DB: Replit PostgreSQL via Drizzle ORM (`lib/db`)
- Generated API client: `lib/api-client-react` (OpenAPI codegen, orval)
- Zod schemas: `lib/api-zod`

## AI Integrations
- **Gemini**: `@google/generative-ai` SDK, model `gemini-2.5-flash`, user-owned `GEMINI_API_KEY` secret. Do NOT use `@workspace/integrations-gemini-ai` — user declined account upgrade.
- **Cognee**: REST calls to `COGNEE_SERVICE_URL` with `Authorization: Bearer COGNEE_API_KEY`. Endpoints: `/api/v1/search`, `/api/v1/add`, `/api/v1/cognify`, `/api/v1/visualize`.

## SSE Chat
- `POST /api/chat/conversations/:id/messages` streams `data: {"content":"..."}` chunks, ends with `data: {"done":true}`.
- Frontend uses raw fetch + ReadableStream with buffered line parsing (carries partial lines across chunks). Do NOT use the generated `useSendMessage` hook for this endpoint.

## Query Hook TS Fix
- Generated hooks require `queryKey` explicitly in the `query` options object. Always pass `queryKey: get<X>QueryKey(...)` alongside `enabled`.

## DB Schema Tables
- `students`, `conversations`, `messages`, `memory_entries`
- Run `pnpm --filter @workspace/db run push` after schema changes.

## Seed Data
- 6 campus characters seeded directly via SQL: Dr. Ada Chen, Marcus Rivera, Zara Hassan, Leo Park, Sophia Müller, Dev Anand.
- 6 memory entries seeded covering ML, quantum, ethics, CV, NLP, RL topics.

**Why:** Gemini integration decision is permanent — do not attempt to switch back to Replit AI Integrations without user re-confirming account upgrade.
