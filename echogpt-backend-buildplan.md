# EchoGPT Backend — Build Plan & Playbook

A phase-by-phase plan for building the EchoGPT backend assignment (NestJS + PostgreSQL + Swagger), designed to be executed mostly by an AI agent in **Google Antigravity**, with clearly marked human checkpoints, test criteria, and git push points for each phase.

---

## 0. Can this be done for free? — Yes

| Piece | Free option | Notes |
|---|---|---|
| Database | **PostgreSQL in Docker** (local) | Zero cost, fully under your control. Optional free hosted alternative: Neon or Supabase free tier if you want a cloud DB for the demo/deploy step. |
| AI Provider (real calls) | **Google Gemini API free tier** | Google gives free-tier quota for Gemini — enough to demo real chat/search calls at $0. Use this as your "real" default provider. |
| AI Provider (OpenAI / Claude) | **Implement the integration, but don't spend money to prove it works** | Both are behind the same `AiProvider` interface (see Phase 6). Cover them with **unit tests using mocked HTTP clients** — this proves the code is correct without real API calls. You only need one *real* working provider (Gemini) for the live demo. |
| Web search | **DuckDuckGo Instant Answer API** or **Brave Search API free tier** | Both have no-cost tiers sufficient for a demo. |
| Caching | In-memory (Nest `CacheModule`) or Redis via Docker | No paid service needed. |
| CI | GitHub Actions | Free minutes on public/private repos for personal accounts. |
| Deployment (optional) | Render or Railway free tier | Enough to host a demo instance; not strictly required — see Phase 12. |

**Bottom line:** you do not need to buy any API key. The only "cost" is signing up for a free Google AI Studio account to get a Gemini API key.

---

## 1. Tools & Accounts You Need to Set Up Yourself

These are the human-only steps — an agent cannot create accounts or hold secrets on your behalf.

1. **GitHub account** + a new empty repo (e.g. `echogpt-backend`). Clone it locally, open the folder in Antigravity.
2. **Node.js LTS** (v20+) and **Docker Desktop** installed on your machine.
3. **Google AI Studio account** → generate a free Gemini API key: https://aistudio.google.com/apikey
4. *(Optional, for completeness of the provider system, not required to spend money)* OpenAI and Anthropic developer accounts, just to have an API key format to test the "add provider" flow with a dummy/test key.
5. *(Optional)* Free account on Render or Railway, only if you decide to deploy a live demo (Phase 12).
6. A password manager or local `.env` file discipline — **you** paste real secrets into `.env`; the agent should only ever see `.env.example` with placeholder values.

That's the entire "hands-on, before I let the agent run" checklist.

---

## 2. Tech Stack

- **Framework:** NestJS (TypeScript)
- **ORM:** Prisma (recommended over TypeORM — better migration DX, better fit for an agent to reason about schema-first)
- **DB:** PostgreSQL 16 (Docker)
- **Auth:** `@nestjs/jwt`, `passport-jwt`, `bcrypt`, refresh-token rotation stored hashed in DB
- **Docs:** `@nestjs/swagger`
- **Validation:** `class-validator` + `class-transformer`
- **Testing:** Jest (unit) + Supertest (e2e), built into Nest's CLI scaffold
- **Security middleware:** `helmet`, `@nestjs/throttler` (rate limiting), `cors`
- **Logging:** `nestjs-pino` or Nest's built-in Logger
- **Secrets:** `@nestjs/config` + `.env`, AES-256 encryption (via Node `crypto`) for stored provider API keys
- **Containerization:** Docker + docker-compose (app + postgres + optional redis)
- **CI:** GitHub Actions (lint + test on every push)

---

## 3. How to Work With the Agent in Antigravity (workflow pattern)

Antigravity has an **Editor** surface and a **Manager** surface. Use this loop for *every* phase below:

1. In the **Manager** view, give the agent the phase's goal + acceptance criteria (copy them straight from this doc).
2. Let it produce a **plan artifact** first — review it before it writes code. Reject/adjust if it's scope-creeping into a later phase.
3. Let it implement, run tests, and fix its own failures (it can use the terminal surface for `npm test`, `docker compose up`, `prisma migrate`, etc.).
4. **You** do the checkpoint review (see each phase's "Your review" box) — this is the one step that stays manual on purpose.
5. Ask the agent to update `README.md` (progress checklist + any new setup step) and write a descriptive commit.
6. You run/approve `git push`. Don't let phases pile up uncommitted — one phase = one (or a few) focused commits, not one giant commit at the end.

Prompt template to reuse per phase:
> "Implement Phase N as described: [paste goal]. Acceptance criteria: [paste]. Write unit + e2e tests for it, run them, fix failures until green. Update `.env.example` if new variables are introduced. Update the README's setup section and progress checklist. Do not touch modules from later phases."

---

## 4. Database Schema (design this before Phase 1 implementation)

Minimum entities: `User`, `RefreshToken`, `Role`, `Subscription`, `AiProvider`, `Conversation`, `Message`, `WebSearch`, `ApiUsageLog`. Have the agent draft the Prisma schema in Phase 1 from this list — review relations (esp. `User 1—N Conversation 1—N Message`, `User 1—1 Subscription`, `AiProvider` scoped per-user or global+per-user override) before it generates migrations.

---

## 5. Phased Build Plan

Each phase = one independently runnable, independently testable, independently pushable slice.

### Phase 0 — Project Scaffold
**Agent does:** `nest new`, folder structure (`modules/`, `common/`, `config/`), ESLint/Prettier, `@nestjs/config`, Swagger bootstrap at `/api/docs`, a `/health` endpoint, Dockerfile + docker-compose with a Postgres service, `.env.example`, initial `README.md` skeleton (title, stack, "how to run" placeholder).
**Test:** `docker compose up`, app boots, `GET /health` → 200, Swagger UI loads at `/api/docs`.
**Your review:** confirm it actually boots on your machine, not just in the agent's sandbox.
**Push:** `chore: project scaffold, docker, swagger, health check`

### Phase 1 — Database & Schema
**Agent does:** Prisma schema for all entities above, first migration, a seed script (creates roles: `admin`/`user`, a free/premium subscription plan row).
**Test:** `prisma migrate dev` succeeds, `prisma studio` shows tables, seed script populates roles/plans.
**Your review:** read the schema once yourself — this is the backbone of everything else; catch modeling mistakes now, not in Phase 6.
**Push:** `feat: database schema, migrations, seed data`

### Phase 2 — Authentication
**Scope:** register, login, logout, JWT access + refresh tokens (refresh stored hashed, rotated on use), bcrypt password hashing, guards.
**Test:** e2e — register → login → access protected route with JWT → refresh → old refresh token rejected (rotation working) → logout invalidates refresh token. Unit — password never stored/returned in plaintext.
**Your review:** literally try to log in with a wrong password via Swagger; try replaying an old refresh token.
**Push:** `feat: authentication module with JWT + refresh rotation`

### Phase 3 — User Management & Roles
**Scope:** get/update profile, change password, delete account, `admin`/`user` role guard.
**Test:** e2e for each endpoint, plus a role-guard test proving a `user` role gets 403 on an admin-only stub route.
**Push:** `feat: user profile management + role-based guards`

### Phase 4 — Subscription Management
**Scope:** free/premium plans, subscription status endpoint, upgrade/downgrade, usage-limit tracking, "remaining requests" endpoint.
**Test:** unit test the usage-limit decrement logic directly (edge case: limit hit → next request blocked with a clear 429/403 + message). e2e for upgrade/downgrade.
**Push:** `feat: subscription plans + usage limits`

### Phase 5 — AI Provider Management
**Scope:** CRUD for providers, enable/disable, default-provider selection, **AES-256 encrypted** API key storage (never return decrypted key in any response), health-check endpoint per provider.
**Test:** unit test encryption round-trip; e2e confirm API responses never leak a raw key; health-check endpoint hits a mocked provider client in tests (no real network calls in automated tests).
**Your review:** this is the highest-security module — actually check the DB column value is ciphertext, not plaintext.
**Push:** `feat: AI provider management with encrypted key storage`

### Phase 6 — Chat API
**Scope:** a single `AiProviderAdapter` interface with three implementations (OpenAI, Anthropic, Gemini), send-prompt endpoint routes through the user's selected/default provider, conversation history persisted, bonus: SSE streaming.
**Test:** unit tests per adapter using a **mocked HTTP client** (no real key needed) + one **integration test that hits real Gemini** using your free key, gated behind an env flag so CI doesn't require secrets. e2e: conversation history correctly ordered/paginated.
**Your review:** actually send a real chat message through Swagger against Gemini once, to prove the whole chain works end-to-end.
**Push:** `feat: chat API with pluggable AI provider adapters`

### Phase 7 — Web Search API
**Scope:** search query endpoint (via DuckDuckGo/Brave free tier), search history, recent searches, suggestions, bonus: result caching (in-memory or Redis).
**Test:** unit test the cache hit/miss path; e2e for history/recent/suggestions.
**Push:** `feat: web search API with caching`

### Phase 8 — Admin Panel APIs
**Scope:** dashboard stats, user management, subscription management, provider management, usage analytics, request logs, system health — all `admin`-role guarded.
**Test:** e2e proving every admin route 403s for a non-admin token; happy-path e2e for stats/logs endpoints.
**Push:** `feat: admin panel APIs`

### Phase 9 — Hardening Pass
**Scope:** global exception filter with a consistent error-response shape, `class-validator` DTOs on every endpoint, `helmet`, `@nestjs/throttler` rate limiting, CORS config, structured logging, full Swagger annotations (request/response examples, auth requirements) on every route.
**Test:** e2e for a rate-limit-exceeded response; e2e for a malformed-body validation error shape; manually skim Swagger UI to confirm every endpoint is documented, not just present.
**Push:** `chore: security hardening, error handling, full swagger docs`

### Phase 10 — Test Coverage & Postman
**Scope:** fill any coverage gaps, generate a Postman collection (Swagger → Postman export, or hand-built), add a GitHub Actions workflow running lint+test on push.
**Test:** `npm run test:cov` — target realistic coverage (70–85% is a credible, defensible number; 100% is not expected and can look fabricated).
**Push:** `test: coverage improvements, postman collection, CI workflow`

### Phase 11 — README & Submission Polish
**Agent does:** finalize README (setup, env vars table, run/test commands, architecture diagram/description, Swagger link, Postman link, progress checklist all checked off), finalize `.env.example`, verify `docker-compose up` is a true one-command bootstrap.
**Your review:** clone the repo into a *fresh* folder and follow your own README from scratch — this catches "works on my machine" gaps before a reviewer finds them.
**Push:** `docs: finalize README and submission materials`

### Phase 12 — Deploy (optional but strengthens the submission)
**Scope:** deploy to Render or Railway free tier (app + managed Postgres), add live Swagger URL to README.
**This step is genuinely optional** — a clean local Docker setup with a great README is a complete, credible submission on its own. Only do this if you have time left before the deadline.
**Push:** `chore: deployment config + live demo link`

---

## 6. Testing Summary (applies throughout)

- **Unit tests** (Jest): business logic in services — auth hashing, usage-limit math, encryption, provider adapters (mocked).
- **e2e tests** (Supertest): full HTTP flows against a real test database (use a separate `docker-compose.test.yml` Postgres instance or a schema reset between runs).
- **Manual tests**: Swagger UI (`/api/docs`) for exploratory checks, Postman collection for a repeatable click-through before submission.
- **CI**: GitHub Actions running `lint` + `test` + `test:e2e` on every push, so broken code never sits on `main`.
- Run tests **at the end of every phase**, not just at the end of the project — this is what makes each phase genuinely "independently done."

---

## 7. What You Must Do By Hand (recap)

- Create the GitHub repo, Google AI Studio account, get the free Gemini key.
- Paste real secrets into your local `.env` only — never let the agent commit them (`.gitignore` should exclude `.env` from Phase 0 onward).
- Review the DB schema (Phase 1) and the provider key-encryption code (Phase 5) yourself — these two are worth a human's attention even if you trust the agent everywhere else.
- Approve each phase's plan before implementation, and do the checkpoint review before pushing.
- Actually run the app from a clean clone once near the end (Phase 11) to sanity-check the README.
- Decide on and execute deployment (Phase 12) if you choose to do it.
- Final read-through of the whole README + a manual click through Swagger before you submit, since this is what a human reviewer sees first.
