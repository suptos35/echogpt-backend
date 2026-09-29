# EchoGPT Backend REST API

> Production-ready NestJS 10 + PostgreSQL 16 + Swagger OpenAPI backend for the [EchoGPT Multi-AI Chrome Extension](https://chromewebstore.google.com/detail/echogpt-multi-ai-chat-sid/negimdcamohmoheiifgecbjgjepkcfhj).

[![CI](https://github.com/suptos35/echogpt-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/suptos35/echogpt-backend/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NestJS](https://img.shields.io/badge/NestJS-v10-red.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-v6-informational.svg)](https://www.prisma.io/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI%203.0-green.svg)](http://localhost:3000/api/docs)
[![Tests: 232 Passing](https://img.shields.io/badge/Tests-232%20Passing-brightgreen.svg)](#-testing--quality-assurance)
[![Coverage: 74%](https://img.shields.io/badge/Coverage-74%25-brightgreen.svg)](#-testing--quality-assurance)

---

## 🌟 Overview

The **EchoGPT Backend** powers a multi-model browser extension with enterprise-grade orchestration across **Google Gemini** (tested & operational on free tier), **OpenAI GPT-4o**, and **Anthropic Claude 3.5 Sonnet**. Built strictly adhering to **Test-Driven Development (TDD First)**, it features at-rest AES-256 encrypted credential management, dual-token JWT rotation, subscription quota tiers, real-time SSE token streaming, AI-assisted web search with TTL caching, administrative diagnostics, and comprehensive observability.

### Key Capabilities
- **Multi-AI Provider Engine:** Pluggable adapter architecture (`AiProviderAdapter`) supporting Google Gemini (verified live with `gemini-3.5-flash` / `gemini-flash-latest`), OpenAI, and Anthropic Claude with dynamic default provider switching, CRUD/delete provider management, and health probes.
- **Enterprise-Grade Encryption:** Provider API credentials are encrypted at rest using AES-256-CBC with cryptographically random initialization vectors (`<iv_hex>:<ciphertext_hex>`). Raw API keys are strictly redacted and never returned over HTTP.
- **JWT Authentication with Refresh Rotation:** Dual-token JWT architecture with SHA-256 hashed refresh tokens stored in PostgreSQL. Rotates tokens on each refresh and revokes entire token families upon replay detection.
- **Role-Based Access Control (RBAC):** Distinct `ADMIN` and `USER` roles enforced through declarative `@Roles()` decorators and `RolesGuard`.
- **Subscription Quota & Reset Logic:** Dual-tier subscription system (`FREE`: 20 requests/day, `PREMIUM`: 500 requests/day) with calendar-day automatic UTC resets and strict 429 quota exhaustion enforcement.
- **Real-Time Token Streaming:** Server-Sent Events (`POST /api/chat/stream`) delivering real-time streaming tokens to client extensions.
- **Web Search & In-Memory Caching:** Integrated DuckDuckGo Instant Answer search engine backed by a normalized 300-second TTL in-memory cache to minimize latency and external network requests.
- **Admin Panel & Diagnostics:** Protected administrative endpoints for real-time dashboard statistics, paginated user management, instant account deactivation, subscription tier analytics, chronological API audit logs, and PostgreSQL roundtrip latency diagnostics.
- **Hardening & Security:** HTTP security response headers (`helmet`), strict CORS for browser extension origins, request rate limiting (`@nestjs/throttler`), global DTO payload validation (`class-validator`), and a standardized error response envelope.

---

## 🏗 System Architecture

```mermaid
flowchart TD
    Client["Chrome Extension / Web Client"] -->|"HTTPS / Bearer JWT"| Gateway["NestJS API Gateway (:3000)"]
    
    subgraph Security ["Security & Middleware Layer"]
        Helmet["Helmet Security Headers"]
        Throttler["Throttler Rate Limiting (100 req/min)"]
        Cors["CORS Handler"]
        PinoLogger["Pino Structured Logger (x-request-id)"]
        ExceptionFilter["AllExceptionsFilter (Uniform Error Shape)"]
    end
    
    Gateway --> Helmet --> Throttler --> Cors --> PinoLogger --> ExceptionFilter
    
    subgraph Modules ["NestJS Core Modules"]
        AuthMod["AuthModule (JWT + Refresh Rotation)"]
        UsersMod["UsersModule (Profile & RBAC)"]
        SubMod["SubscriptionModule (Quotas & UTC Reset)"]
        ProvMod["ProvidersModule (AES-256 Encrypted Keys)"]
        ChatMod["ChatModule (Multi-Provider Orchestrator)"]
        SearchMod["SearchModule (DuckDuckGo + TTL Cache)"]
        AdminMod["AdminModule (Dashboard & Telemetry)"]
    end
    
    ExceptionFilter --> Modules
    
    subgraph DataLayer ["Data & Storage Layer"]
        PrismaORM["Prisma 6 ORM"]
        PostgresDB[("PostgreSQL 16 Database (:5433)")]
        SearchCache[("In-Memory Search Cache (300s TTL)")]
    end
    
    Modules --> PrismaORM --> PostgresDB
    SearchMod --> SearchCache
    
    subgraph ExternalAI ["AI Provider Adapters"]
        GeminiAdapt["GeminiAdapter (Google AI Studio)"]
        OpenAiAdapt["OpenAiAdapter (GPT-4o)"]
        ClaudeAdapt["ClaudeAdapter (Claude 3.5 Sonnet)"]
        DDGSearch["DuckDuckGo Instant Answer API"]
    end
    
    ChatMod --> GeminiAdapt
    ChatMod --> OpenAiAdapt
    ChatMod --> ClaudeAdapt
    SearchMod --> DDGSearch
```

---

## 🛠 Tech Stack

- **Runtime & Framework:** Node.js 22 LTS, NestJS 10 (TypeScript)
- **Database & ORM:** PostgreSQL 16 (Alpine), Prisma 6 ORM
- **API Documentation:** Swagger / OpenAPI 3.0 (`@nestjs/swagger`)
- **Authentication:** Passport JWT, Dual Tokens (Access + Rotated Refresh), Bcrypt password hashing
- **Security & Hardening:** `helmet@^8.3.0`, `@nestjs/throttler@^6.7.1`, AES-256-CBC (`node:crypto`), `class-validator`
- **Observability:** `nestjs-pino`, `pino-http`, cryptographic correlation IDs (`x-request-id`), automated DB usage interceptor
- **Containerization:** Docker & Docker Compose (or Podman)
- **Continuous Integration:** GitHub Actions (`.github/workflows/ci.yml`)
- **Testing:** Jest (Unit) & Supertest (E2E) — Built with strict **TDD First** methodology

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v20+ or v22+ LTS
- **Docker & Docker Compose** (or **Podman & podman-compose**)
- **Git**

### 2. Environment Configuration
Copy the template configuration file:
```bash
cp .env.example .env
```
*(The defaults are pre-configured to run PostgreSQL on host port `5433` to prevent port collisions with any local PostgreSQL instance).*

### 3. Running with Docker Compose (One-Command Bootstrap)
Start both PostgreSQL and the backend application in containers:
```bash
docker compose up -d
```
Access the application:
- **API Base URL:** `http://localhost:3000`
- **Health Check:** `http://localhost:3000/health`
- **Interactive Swagger UI:** `http://localhost:3000/api/docs`
- **OpenAPI 3.0 JSON Specification:** `http://localhost:3000/api/docs-json`

### 4. Running Locally for Development
1. Start the containerized PostgreSQL database:
```bash
docker compose up postgres -d
```

2. Install dependencies:
```bash
npm install
```

3. Run database migrations and seed default data:
```bash
npx prisma migrate dev
npm run seed
```

4. Start the development server with live reload:
```bash
npm run start:dev
```

### 5. Seeded Accounts & Authentication Credentials
The database seed script (`npm run seed` or production `npm run seed:prod`) initializes two pre-configured accounts:

| Account Type | Email | Password | Role | Plan Tier | Daily Quota | Intended Usage |
|---|---|---|---|---|---|---|
| **Administrator** | `admin@echogpt.app` | `Admin123!` | `ADMIN` | `PREMIUM` | 500 req/day | Provider configuration (AES-256 key management, deleting/disabling providers), user activation/deactivation, audit logs, system diagnostics |
| **Standard User** | `user@echogpt.app` | `User123!` | `USER` | `FREE` | 20 req/day | Standard extension interactions: AI chat inference, streaming, web search, conversation history, and tier upgrade/downgrade |

> [!TIP]
> **Which Login Should You Use?**
> - **For Admin Functions (`/api/admin/*`, `/api/providers` POST/PATCH/DELETE):** Log in with `admin@echogpt.app` / `Admin123!`.
> - **For Standard User / Quota Exhaustion Testing:** Log in with `user@echogpt.app` / `User123!`.

---

## 🤖 Live AI Chat Verification (Google Gemini)

The multi-model orchestrator is live-tested and verified with **Google Gemini (Google AI Studio)**.

### Verified Prompt Example
Send a `POST` request to `http://localhost:3000/api/chat/send-prompt` (or stream tokens via `/api/chat/stream`) with your Bearer JWT token:

```json
{
  "prompt": "Hello! What model are you, and who made you?",
  "model": "gemini-3.5-flash"
}
```

**Live Verification Output:**
```json
{
  "conversationId": "3499b9cf-82e1-45bc-8a71-6c24b6134b22",
  "messageId": "9b1ad8a9-4673-455c-a5b6-bc4097e30d10",
  "response": "I am a large language model, trained by Google.",
  "provider": "GEMINI",
  "modelUsed": "gemini-3.5-flash",
  "tokensUsed": {
    "prompt": 12,
    "completion": 11,
    "total": 23
  },
  "createdAt": "2026-09-29T01:50:12.338Z"
}
```

> [!IMPORTANT]
> **Gemini Free-Tier Model Naming:**
> - Live end-to-end integration is explicitly tested and verified using **`gemini-3.5-flash`** (or alias **`gemini-flash-latest`**).
> - Google AI Studio has retired legacy model aliases like `gemini-pro` and `gemini-1.5-flash` on free-tier keys, which will return `404 Not Found` or `400 Bad Request` from the Gemini API.
> - When testing with OpenAI or Claude, mock adapters are built-in for testing without incurring API billing unless live keys are configured.

---

## ⚙️ Environment Variables Reference

| Variable | Default Value | Required | Description |
|---|---|---|---|
| `PORT` | `3000` | No | Port on which the HTTP server listens |
| `NODE_ENV` | `development` | No | Application environment (`development`, `production`, `test`) |
| `DATABASE_URL` | `postgresql://echogpt:echogpt_password@localhost:5433/echogpt_db?schema=public` | **Yes** | PostgreSQL connection string |
| `POSTGRES_USER` | `echogpt` | No | PostgreSQL database user for Docker |
| `POSTGRES_PASSWORD` | `echogpt_password` | No | PostgreSQL database password for Docker |
| `POSTGRES_DB` | `echogpt_db` | No | PostgreSQL database name for Docker |
| `POSTGRES_PORT` | `5433` | No | Host port mapped to PostgreSQL container (5432) |
| `JWT_ACCESS_SECRET` | `echogpt_super_secret_jwt_access_key_change_in_production` | **Yes** | Secret key for signing short-lived access JWTs (min 32 chars) |
| `JWT_ACCESS_EXPIRATION` | `15m` | No | Access token expiration duration |
| `JWT_REFRESH_SECRET` | `echogpt_super_secret_jwt_refresh_key_change_in_production` | **Yes** | Secret key for signing long-lived refresh JWTs (min 32 chars) |
| `JWT_REFRESH_EXPIRATION` | `7d` | No | Refresh token expiration duration |
| `ENCRYPTION_KEY` | `01234567890123456789012345678901` | **Yes** | Exactly 32-character (256-bit) secret key for AES-256 encryption |
| `CORS_ORIGIN` | `*` | No | **Dev-only default (`*`)**. In production, restrict to your Chrome Extension ID (`chrome-extension://<id>`) and web origins |
| `RATE_LIMIT_TTL` | `60000` | No | Rate limit window in milliseconds (default: 1 minute) |
| `RATE_LIMIT_MAX` | `100` | No | Max requests allowed per rate limit window |
| `GEMINI_API_KEY` | `""` | No | Google AI Studio API key (tested with `gemini-3.5-flash` / `gemini-flash-latest`) |
| `OPENAI_API_KEY` | `""` | No | Optional OpenAI API key (falls back to mock adapter in test/dev) |
| `ANTHROPIC_API_KEY` | `""` | No | Optional Anthropic Claude API key |
| `BRAVE_SEARCH_API_KEY`| `""` | No | Optional Brave Search API key (DuckDuckGo is $0 zero-config default) |

---

## 🧪 Testing & Quality Assurance

Our test suite employs a strict **TDD First** methodology where tests were authored prior to implementation code:

```bash
# Run all unit tests (19 test suites, 124 tests)
npm test

# Run all E2E integration tests (9 test suites, 90 tests)
npm run test:e2e

# Run test coverage analysis (Target: 70–85%)
npm run test:cov

# Run ESLint linter & style validation
npm run lint

# Compile production build
npm run build
```

### Coverage Highlights (`npm run test:cov`)
- **Total Automated Tests:** **232 passing tests across 29 test suites (100% green)**
  - **130 Unit Tests** across 19 suites (`npm test`)
  - **102 End-to-End Integration Tests** across 10 suites (`npm run test:e2e`)
- **Statement Coverage:** **74.5%**
- **Line Coverage:** **73.8%**
- **Function Coverage:** **84.2%**

---

## 📬 Postman Collection & Local Environment

A complete Postman test suite is provided in the [`postman/`](./postman/) directory:

1. **Import into Postman:**
   - [EchoGPT_Backend.postman_collection.json](./postman/EchoGPT_Backend.postman_collection.json): Contains 30+ requests covering all feature modules.
   - [EchoGPT_Local.postman_environment.json](./postman/EchoGPT_Local.postman_environment.json): Contains pre-configured `baseUrl`, credentials, and token variables.

2. **Automated Token Management:**
   - Execute `02 - Authentication > Login User`: Automatically sets `accessToken` and `refreshToken` in your Postman environment.
   - Execute `02 - Authentication > Login Admin`: Automatically sets `adminToken`.
   - All subsequent authenticated requests automatically inherit credentials.

---

## 📚 API Endpoints Summary

| Module | Method | Endpoint | Description | Auth Guard |
|---|---|---|---|---|
| **System** | `GET` | `/` | API Overview, status, documentation link, and feature directory | Public |
| **System** | `GET` | `/health` | Server uptime and database connectivity probe | Public |
| **Auth** | `POST` | `/api/auth/register` | Register new account with FREE tier (returns clean 409 on duplicate) | Public |
| **Auth** | `POST` | `/api/auth/login` | Login and receive dual JWT tokens (Admin or Standard User) | Public |
| **Auth** | `POST` | `/api/auth/refresh` | Rotate refresh token; race-safe & revokes family on replay | Refresh JWT |
| **Auth** | `POST` | `/api/auth/logout` | Invalidate active refresh token session | JWT Bearer |
| **Users** | `GET` | `/api/users/profile` | Retrieve user profile & subscription tier | JWT Bearer |
| **Users** | `PATCH` | `/api/users/profile` | Update user first & last name | JWT Bearer |
| **Users** | `PATCH` | `/api/users/change-password` | Change password (instantly revokes all refresh token sessions) | JWT Bearer |
| **Users** | `DELETE`| `/api/users/account` | Deactivate account and revoke sessions | JWT Bearer |
| **Users** | `GET` | `/api/users/admin-only-test` | RBAC test route (403 for User, 200 for Admin) | Admin Bearer |
| **Subscription** | `GET` | `/api/subscription/status` | Current tier & remaining daily quota (evaluates UTC midnight reset) | JWT Bearer |
| **Subscription** | `POST`| `/api/subscription/upgrade` | Upgrade subscription to PREMIUM (500 req/day) | JWT Bearer |
| **Subscription** | `POST`| `/api/subscription/downgrade`| Downgrade subscription to FREE (20 req/day; clamps quota gracefully) | JWT Bearer |
| **Subscription** | `GET` | `/api/subscription/remaining-requests` | Get remaining daily query count (never negative) | JWT Bearer |
| **AI Providers**| `GET` | `/api/providers` | List available AI providers (API keys strictly excluded) | JWT Bearer |
| **AI Providers**| `GET` | `/api/providers/:id` | Get specific provider configuration (keys sanitized) | JWT Bearer |
| **AI Providers**| `POST` | `/api/providers` | Register new provider (AES-256 encrypted key) | Admin Bearer |
| **AI Providers**| `PATCH`| `/api/providers/:id` | Update provider, toggle status (`isEnabled: true/false`), or rotate key | Admin Bearer |
| **AI Providers**| `POST` | `/api/providers/:id/set-default` | Set global default AI provider | Admin Bearer |
| **AI Providers**| `DELETE`| `/api/providers/:id` | Permanently delete AI provider (cannot delete active default) | Admin Bearer |
| **AI Providers**| `GET` | `/api/providers/:id/health` | Health probe (graceful 200 unhealthy on bad key, no 500) | JWT Bearer |
| **Chat** | `POST` | `/api/chat/send-prompt` | Execute prompt through AI provider & persist thread | JWT Bearer |
| **Chat** | `GET` | `/api/chat/conversations` | List user conversation threads with message counts | JWT Bearer |
| **Chat** | `GET` | `/api/chat/conversations/:id` | Get full conversation thread with message history | JWT Bearer |
| **Chat** | `DELETE`| `/api/chat/conversations/:id`| Cascade delete conversation thread and messages | JWT Bearer |
| **Chat** | `POST` | `/api/chat/stream` | Stream AI completion via SSE (disconnect-safe) | JWT Bearer |
| **Search** | `POST` | `/api/search` | Execute web search with in-memory TTL caching | JWT Bearer |
| **Search** | `GET` | `/api/search/history` | Retrieve user web search history log | JWT Bearer |
| **Search** | `GET` | `/api/search/recent` | Retrieve recent distinct search queries | JWT Bearer |
| **Search** | `GET` | `/api/search/suggestions`| Autocomplete suggestions matching search prefix | JWT Bearer |
| **Admin** | `GET` | `/api/admin/dashboard` | Dashboard metrics & system-wide stats | Admin Bearer |
| **Admin** | `GET` | `/api/admin/users` | List users with pagination and role/status filters | Admin Bearer |
| **Admin** | `PATCH`| `/api/admin/users/:id/status` | Activate/deactivate user (revokes active sessions) | Admin Bearer |
| **Admin** | `GET` | `/api/admin/subscriptions` | Subscriptions breakdown across FREE & PREMIUM | Admin Bearer |
| **Admin** | `GET` | `/api/admin/logs` | Query chronological API request logs & audit trail | Admin Bearer |
| **Admin** | `GET` | `/api/admin/health` | Comprehensive system health & diagnostics | Admin Bearer |

---

## 🛡️ Security & Architecture Edge-Case Validations

The test suite validates rigorous edge-case defenses across the entire application lifecycle:

1. **AES-256 Key Secrecy & Database Verification:**
   - Provider API keys are encrypted at rest with AES-256-CBC using cryptographically random 16-byte IVs (`<iv_hex>:<ciphertext_hex>`).
   - Verified that `encryptedApiKey` is **strictly excluded** from all client-facing DTOs (not just masked, but absent from response payloads).
   - In PostgreSQL, keys are confirmed to be genuine ciphertext matching `/^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/`.

2. **Stateless JWT Access Token Window & Instant Refresh Revocation:**
   - In accordance with stateless dual-token design, access tokens remain valid until expiration (~15 minutes) for maximum API gateway throughput.
   - Upon password change, all stored refresh tokens for the user are immediately deleted in PostgreSQL, preventing token refresh on any device.

3. **Quota Clamping & Downgrade Behavior:**
   - If a user on `PREMIUM` uses 50 requests and downgrades to `FREE` (limit 20), `remainingRequests` is clamped to `0` (`Math.max(0, 20 - 50)`) rather than going negative.
   - Subsequent chat requests are cleanly blocked with `429 Too Many Requests` (never a 500 crash).

4. **UTC Midnight Quota Reset:**
   - Subscription limits evaluate against calendar day changes in UTC (`00:00:00 UTC`).
   - A request at `23:59:59 UTC` uses the current day's quota; any request at or after `00:00:00 UTC` the following day automatically resets `usedRequestsToday` to 0.

5. **Concurrency & Replay-Attack Protection:**
   - Simultaneous refresh token calls using the same token are serialized and protected against database race condition crashes. One request succeeds and the other receives `401 Unauthorized`.
   - Replay of an already-used or revoked refresh token immediately invalidates the entire token family.

6. **Provider Health Check Graceful Degradation:**
   - Probing `/api/providers/:id/health` for a provider with an invalid key or corrupted ciphertext returns a graceful `200 OK` with `{ status: "unhealthy", message: "..." }` instead of throwing an unhandled `500` server exception.

7. **Disabled Default Provider Handling:**
   - When the active default provider is disabled via `PATCH /api/providers/:id`, the chat engine automatically falls back to an alternative enabled provider, or returns a clean `404/400` error if no provider is active, avoiding silent failures.

8. **SSE Streaming Mid-Flight Disconnect:**
   - Client disconnects during `POST /api/chat/stream` are caught via `req.on('close')`, halting the token generation loop and closing the socket without unhandled write errors or dangling database connections.

---

## 📋 Build Plan Progress Checklist

- [x] **Phase 0:** Project Scaffold & Containerization (Commit `af2ffba`)
- [x] **Phase 1:** Database Modeling & Prisma Schema (Commit `2233578`)
- [x] **Phase 2:** Authentication Module & Refresh Rotation (Commit `3a8d557`)
- [x] **Phase 3:** User Management & Role Guards (Commit `e41c6e0`)
- [x] **Phase 4:** Subscription Management & Quota Limits (Commit `d20c652`)
- [x] **Phase 5:** AI Provider Management & AES-256 Key Encryption (Commit `3a56063`)
- [x] **Phase 6:** Chat API & Multi-Provider Orchestration (Commit `4cdfb34`)
- [x] **Phase 7:** Web Search API & In-Memory Caching (Commit `494e37a`)
- [x] **Phase 8:** Admin Panel APIs & Diagnostics (Commit `c84caaf`)
- [x] **Phase 9:** Hardening Pass, Security Headers & Rate Limiting (Commit `43c37e2`)
- [x] **Phase 10:** Test Coverage, Postman Collection & CI Workflow (Commit `cef99aa`)
- [x] **Phase 11:** Edge-Case Validations, DELETE Provider & Final Polish (Current Phase)
- [ ] **Phase 12:** Cloud Deployment (Optional bonus — Render/Railway/Fly.io)

---

## 📖 Project Documentation
- [CHECKLIST.md](./CHECKLIST.md): Detailed phase-by-phase acceptance checklist and test results.
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md): Architecture decisions, security validations, and implementation walkthrough.
- [echogpt-backend-buildplan.md](./echogpt-backend-buildplan.md): Original specification and phase playbook.
