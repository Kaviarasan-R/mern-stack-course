# AI Agent (RAG)

Express + Prisma (pgvector) + LangChain + Gemini + JWT (access/refresh token)

Upload PDF → extract text → chunk → embed (Gemini) → store in `chunk.vector` → similarity search → context to Gemini → answer

## Supabase

1. Create a new project at https://supabase.com/dashboard (save the database password, it's needed below)
2. Enable the vector extension: **Database → Extensions** → search `vector` → enable it (or run `create extension if not exists vector;` in the **SQL Editor**)
3. Click **Connect** (top bar) → **Direct connection** → copy the connection string:

```
postgresql://postgres:[YOUR-PASSWORD]@db.<project-ref>.supabase.co:5432/postgres
```

4. Split it into the `DB_*` envs in `.env` (`prisma.config.js` builds the URL from them):

```
DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
DB_HOST=db.<project-ref>.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USERNAME=postgres
DB_PASSWORD=<password>
```

5. `npm run db:push` → creates the `user`, `document`, `chunk` tables in Supabase (check them in **Table Editor**)
6. `npm run db:generate` → generates the Prisma client

> The direct connection is IPv6 only. If `db:push` can't reach the host, use the **Session pooler** connection string from the same **Connect** dialog instead.

## Setup

1. Copy `.env.example` to `.env` and fill it (generate secrets with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`). For the `DB_*` envs see [Supabase](#supabase)
2. `npm install`
3. `npm run db:push` (creates `user`, `document`, `chunk` tables, pgvector extension must be enabled)
4. `npm run db:push -- --force-reset` to drop the database before push. All data will be lost.
5. `npm run db:generate`
6. `npm run dev`

## Auth (JWT)

Same flow as `node/04_express_and_prisma`:

- `POST /api/auth/register` `{ username, password }` → password hashed with bcrypt
- `POST /api/auth/login` `{ username, password }` → `{ accessToken, user }` in the body + refresh token in an `httpOnly` cookie (`jwt`), also saved in `user.refreshToken`
- `GET /api/auth/refresh` → reads the cookie and returns a new `{ accessToken, user }` (when the access token expires)
- `POST /api/auth/logout` → removes the refresh token from db and clears the cookie

Every other route needs `Authorization: Bearer <accessToken>` (`middlewares/verifyToken.js`, `req.user = { id, username }`).
Each user only sees, searches and deletes **their own** documents. The agent's tools are created per user (`createUserAgent(userId)`), so its SQL can only read that user's rows and never the `user` table.

Frontend calls need `credentials: "include"` so the browser sends the refresh token cookie (`CLIENT_URL` is allowed by CORS).

## Endpoints

| Method | Route | Body |
|---|---|---|
| POST | `/api/documents/upload` | form-data `file` (PDF) |
| GET | `/api/documents` | - |
| DELETE | `/api/documents/:id` | - |
| POST | `/api/chat` | `{ query, limit?, documentId? }` |
| POST | `/api/agent` | `{ query }` |

## Workflow vs Agent

- `POST /api/chat` (workflow): **we** decide the steps, always search → prompt → answer
- `POST /api/agent` (agent): **Gemini** decides, `search_documents` (RAG), `query_database` (writes its own read-only SQL) or no tool at all. Response `steps` shows what it chose

## Reference

1. LangChain Chat Model Integration: https://docs.langchain.com/oss/python/integrations/chat
2. LangChain Google GenAI: https://docs.langchain.com/oss/javascript/integrations/chat/google_generative_ai
3. pgvector: https://github.com/pgvector/pgvector
