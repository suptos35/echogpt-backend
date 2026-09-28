# EchoGPT Backend REST API

> Production-ready NestJS 10 + PostgreSQL 16 + Swagger OpenAPI backend for the [EchoGPT Multi-AI Chrome Extension](https://chromewebstore.google.com/detail/echogpt-multi-ai-chat-sid/negimdcamohmoheiifgecbjgjepkcfhj).

[![CI](https://github.com/suptos35/echogpt-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/suptos35/echogpt-backend/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NestJS](https://img.shields.io/badge/NestJS-v10-red.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-v6-informational.svg)](https://www.prisma.io/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI%203.0-green.svg)](http://localhost:3000/api/docs)
[![Tests: 214 Passing](https://img.shields.io/badge/Tests-214%20Passing-brightgreen.svg)](#-testing--quality-assurance)
[![Coverage: 74%](https://img.shields.io/badge/Coverage-74%25-brightgreen.svg)](#-testing--quality-assurance)

---

## 🌟 Overview

The **EchoGPT Backend** powers a multi-model browser extension with enterprise-grade orchestration across **Google Gemini**, **OpenAI GPT-4o**, and **Anthropic Claude 3.5 Sonnet**. Built strictly adhering to **Test-Driven Development (TDD First)**, it features at-rest AES-256 encrypted credential management, dual-token JWT rotation, subscription quota tiers, real-time SSE token streaming, AI-assisted web search with TTL caching, administrative diagnostics, and comprehensive observability.

### Key Capabilities
- **Multi-AI Provider Engine:** Pluggable adapter architecture (`AiProviderAdapter`) supporting Google Gemini (default $0 free tier), OpenAI, and Anthropic Claude with dynamic default provider switching and health probes.
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

### 5. Seeded Accounts for Testing
The seed script (`npm run seed`) automatically initializes default accounts:
- **Administrator Account:**
  - **Email:** `admin@echogpt.app`
  - **Password:** `Admin123!`
  - **Role:** `ADMIN` | **Plan:** `PREMIUM` (Unlimited requests)
- **Standard User Account:**
  - **Email:** `user@echogpt.app`
  - **Password:** `User123!`
  - **Role:** `USER` | **Plan:** `FREE` (20 requests/day quota)

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
| `CORS_ORIGIN` | `*` | No | Allowed CORS origin (supports Chrome Extension IDs or wildcards) |
| `RATE_LIMIT_TTL` | `60000` | No | Rate limit window in milliseconds (default: 1 minute) |
| `RATE_LIMIT_MAX` | `100` | No | Max requests allowed per rate limit window |
| `GEMINI_API_KEY` | `""` | No | Optional Google AI Studio Gemini API key for live provider tests |
| `OPENAI_API_KEY` | `""` | No | Optional OpenAI API key (unit/e2e tests use built-in mock adapters) |
| `ANTHROPIC_API_KEY` | `""` | No | Optional Anthropic API key |
| `BRAVE_SEARCH_API_KEY`| `""` | No | Optional Brave Search API key (DuckDuckGo is zero-cost default) |

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
- **Total Automated Tests:** **214 passing tests across 28 test suites (100% green)**
- **Statement Coverage:** **74.15%**
- **Line Coverage:** **73.23%**
- **Function Coverage:** **83.94%**

---

## 📬 Postman Collection & Local Environment

A complete Postman test suite is provided in the [`postman/`](file:///mnt/sda3/projects/Appifydevs/postman/) directory:

1. **Import into Postman:**
   - [EchoGPT_Backend.postman_collection.json](file:///mnt/sda3/projects/Appifydevs/postman/EchoGPT_Backend.postman_collection.json): Contains 30+ requests covering all 8 feature modules.
   - [EchoGPT_Local.postman_environment.json](file:///mnt/sda3/projects/Appifydevs/postman/EchoGPT_Local.postman_environment.json): Contains pre-configured `baseUrl`, credentials, and token variables.

2. **Automated Token Management:**
   - Execute `02 - Authentication > Login User`: Automatically sets `accessToken` and `refreshToken` in your Postman environment.
   - Execute `02 - Authentication > Login Admin`: Automatically sets `adminToken`.
   - All subsequent authenticated requests automatically inherit credentials.

---

## 📚 API Endpoints Summary

| Module | Method | Endpoint | Description | Auth Guard |
|---|---|---|---|---|
| **System** | `GET` | `/health` | Server uptime and database connectivity | Public |
| **Auth** | `POST` | `/api/auth/register` | Register new account with FREE tier | Public |
| **Auth** | `POST` | `/api/auth/login` | Login and receive dual JWT tokens | Public |
| **Auth** | `POST` | `/api/auth/refresh` | Rotate refresh token and issue new token pair | Refresh JWT |
| **Auth** | `POST` | `/api/auth/logout` | Invalidate active refresh token | JWT Bearer |
| **Users** | `GET` | `/api/users/profile` | Retrieve user profile & subscription tier | JWT Bearer |
| **Users** | `PATCH` | `/api/users/profile` | Update user first & last name | JWT Bearer |
| **Users** | `PATCH` | `/api/users/change-password` | Change password (revokes old sessions) | JWT Bearer |
| **Users** | `DELETE`| `/api/users/account` | Deactivate account and revoke sessions | JWT Bearer |
| **Users** | `GET` | `/api/users/admin-only-test` | RBAC test route (403 for User, 200 for Admin) | Admin Bearer |
| **Subscription** | `GET` | `/api/subscription/status` | Current tier & remaining quota count | JWT Bearer |
| **Subscription** | `POST`| `/api/subscription/upgrade` | Upgrade subscription to PREMIUM (500 req/day) | JWT Bearer |
| **Subscription** | `POST`| `/api/subscription/downgrade`| Downgrade subscription to FREE (20 req/day) | JWT Bearer |
| **Subscription** | `GET` | `/api/subscription/remaining-requests` | Get remaining daily query count | JWT Bearer |
| **AI Providers**| `GET` | `/api/providers` | List available AI providers (keys sanitized) | JWT Bearer |
| **AI Providers**| `GET` | `/api/providers/:id` | Get specific provider configuration | JWT Bearer |
| **AI Providers**| `POST` | `/api/providers` | Register new provider (AES-256 encrypted key) | Admin Bearer |
| **AI Providers**| `PATCH`| `/api/providers/:id` | Update provider models or rotate encrypted key | Admin Bearer |
| **AI Providers**| `POST` | `/api/providers/:id/set-default` | Set global default AI provider | Admin Bearer |
| **AI Providers**| `GET` | `/api/providers/:id/health` | Diagnostic health check | JWT Bearer |
| **Chat** | `POST` | `/api/chat/send-prompt` | Execute prompt through AI provider & persist thread | JWT Bearer |
| **Chat** | `GET` | `/api/chat/conversations` | List user conversation threads with message counts | JWT Bearer |
| **Chat** | `GET` | `/api/chat/conversations/:id` | Get full conversation thread with message history | JWT Bearer |
| **Chat** | `DELETE`| `/api/chat/conversations/:id`| Cascade delete conversation thread and messages | JWT Bearer |
| **Chat** | `POST` | `/api/chat/stream` | Stream AI completion in real-time via SSE | JWT Bearer |
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
- [x] **Phase 11:** README & Submission Polish (Current Phase)
- [ ] **Phase 12:** Cloud Deployment (Optional bonus — Render/Railway)

---

## 📖 Project Documentation
- [CHECKLIST.md](file:///mnt/sda3/projects/Appifydevs/CHECKLIST.md): Detailed phase-by-phase acceptance checklist and test results.
- [DEVELOPMENT_GUIDE.md](file:///mnt/sda3/projects/Appifydevs/DEVELOPMENT_GUIDE.md): Architecture decisions, security validations, and implementation walkthrough.
- [echogpt-backend-buildplan.md](file:///mnt/sda3/projects/Appifydevs/echogpt-backend-buildplan.md): Original specification and phase playbook.
