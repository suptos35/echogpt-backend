# EchoGPT Backend — Engineering Architecture & Development Guide

This living document details the complete end-to-end engineering journey, system architecture, architectural decisions, technical challenges encountered, and resolution strategies for the **EchoGPT Backend REST API**.

---

## 🏛 System Architecture Overview

EchoGPT Backend serves as the backend for the EchoGPT Multi-AI Chrome Extension. It bridges user interactions in the browser with multiple Large Language Model providers (OpenAI, Anthropic Claude, Google Gemini), local/remote search APIs, and database persistence.

```
                              ┌─────────────────────────────────────────┐
                              │     EchoGPT Chrome Extension / Client    │
                              └────────────────────┬────────────────────┘
                                                   │ HTTPS / REST / SSE
                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 NestJS Application Layer                               │
│                                                                                        │
│  ┌───────────────────────┐   ┌──────────────────────────┐   ┌───────────────────────┐  │
│  │   Validation Pipe     │   │     Helmet & Throttler   │   │  Swagger UI Docs      │  │
│  │   (class-validator)   │   │     (Rate Limiting/CORS) │   │  (/api/docs)          │  │
│  └───────────┬───────────┘   └─────────────┬────────────┘   └───────────────────────┘  │
│              │                             │                                           │
│              ▼                             ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                 Controllers                                      │  │
│  │  HealthController │ AuthController │ UsersController │ SubscriptionController    │  │
│  │  ProvidersController │ ChatController │ SearchController │ AdminController        │  │
│  └─────────────────────────────────────────┬────────────────────────────────────────┘  │
│                                            │                                           │
│                                            ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                             Core Services & Adapters                             │  │
│  │                                                                                  │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────────────┐  │  │
│  │  │   AuthService    │  │  CryptoService   │  │       AiProviderFactory        │  │  │
│  │  │  (JWT + Refresh) │  │  (AES-256-CBC)   │  │  ┌──────────┬────────┬───────┐ │  │  │
│  │  └──────────────────┘  └──────────────────┘  │  │ OpenAI   │ Claude │ Gemini│ │  │  │
│  │                                              │  └──────────┴────────┴───────┘ │  │  │
│  │                                              └────────────────────────────────┘  │  │
│  └─────────────────────────────────────────┬────────────────────────────────────────┘  │
│                                            │                                           │
│                                            ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           Data Access Layer (Prisma ORM)                         │  │
│  └─────────────────────────────────────────┬────────────────────────────────────────┘  │
└────────────────────────────────────────────┼───────────────────────────────────────────┘
                                             │ SQL
                                             ▼
                              ┌─────────────────────────────────────────┐
                              │          PostgreSQL 16 Database          │
                              │  Users │ Subscriptions │ Encrypted Keys │
                              │  Chat History │ Usage Logs │ Searches   │
                              └─────────────────────────────────────────┘
```

---

## 🗄 Database Design & Entity Relationships

The schema is defined in [prisma/schema.prisma](file:///mnt/sda3/projects/Appifydevs/prisma/schema.prisma) with 8 core normalized models:

| Model | Table Name | Purpose | Key Relations |
|---|---|---|---|
| **`Role`** | `roles` | RBAC roles (`ADMIN`, `USER`) | Has many `User` |
| **`User`** | `users` | User credentials, profile, active status | Belongs to `Role`, Has one `Subscription`, Has many `RefreshToken`, `Conversation`, `WebSearch`, `ApiUsageLog` |
| **`RefreshToken`**| `refresh_tokens` | Hashed refresh tokens for JWT rotation | Belongs to `User` (cascade delete) |
| **`Subscription`**| `subscriptions` | Free vs. Premium tiers, daily request quota | Belongs to `User` (cascade delete) |
| **`AiProvider`** | `ai_providers` | OpenAI, Claude, Gemini configs & encrypted keys | Has many `Conversation` |
| **`Conversation`**| `conversations`| Threaded conversation sessions | Belongs to `User`, Belongs to `AiProvider`, Has many `Message` |
| **`Message`** | `messages` | Chat messages with role and token counts | Belongs to `Conversation` (cascade delete) |
| **`WebSearch`** | `web_searches` | Web search queries and cached JSON results | Belongs to `User` |
| **`ApiUsageLog`** | `api_usage_logs`| HTTP audit logs (status, latency, endpoint) | Belongs to `User` (optional) |

---

## 🧪 Test-Driven Development (TDD) Workflow

Starting from Phase 3, all modules adhere strictly to **Test-Driven Development (TDD)**:
1. **Red Stage:** Unit test specifications (`*.spec.ts`) and end-to-end test scenarios (`*.e2e-spec.ts`) are authored **before** any service or controller implementation code is written.
2. **Green Stage:** Services, DTOs, controllers, and modules are written to satisfy the exact acceptance criteria defined in the tests.
3. **Refactor Stage:** Code is optimized, typed, and structured cleanly while keeping tests 100% green.

---

## 🔐 Security & Identity Architecture

### 1. Dual-Token Architecture & Rotation
- **Access Token:** Short lifespan (`15 minutes`), signs `{ sub: userId, email, role }`. Used on every authenticated request via the `Authorization: Bearer <token>` HTTP header.
- **Refresh Token:** Long lifespan (`7 days`), signs `{ sub: userId, email, role, jti: UUID }`.
- **Database Storage:** The database stores **only the deterministic SHA-256 hash** of the refresh token (`token_hash`).

### 2. Password Change Session Revocation Pattern
When a user updates their password via `PATCH /api/users/change-password`:
- The current password is verified against `password_hash` using `bcrypt.compare`.
- A check prevents re-using the identical password (`BadRequestException`).
- The new password is encrypted with 10 salt rounds of bcrypt.
- **Crucial Security Step:** All active refresh tokens for this user are deleted (`refreshToken.deleteMany({ where: { userId } })`). Any active sessions on other devices are immediately terminated, requiring fresh login with the new credentials.

### 3. Role-Based Access Control (RBAC)
- Declarative `@Roles(RoleName.ADMIN, RoleName.USER)` decorator metadata.
- `RolesGuard` verifies the JWT `role` claim against handler metadata.
- Tested and proven via E2E: Non-admin tokens receive HTTP `403 Forbidden` on admin routes; admin tokens receive HTTP `200 OK`.

---

## 🚧 Problems Faced & Solutions Applied

### Challenge 1: Host Machine Environment Constraints
- **Problem:** `node`, `npm`, and `docker` missing from global `$PATH`; no `sudo` password.
- **Solution:** Initialized `.venv` using `uv`, installed Node.js 22 LTS and npm 10 via `nodeenv`, configured Podman aliases for Docker.

### Challenge 2: Nest CLI v11 Module Cycle / ESM Conflict
- **Problem:** `ERR_REQUIRE_CYCLE_MODULE` on Nest CLI v11.
- **Solution:** Pinned CLI to `@nestjs/cli@10.4.9`.

### Challenge 3: Peer Dependency Mismatch with Nest 10 Packages
- **Problem:** Installing `@nestjs/config` and `@nestjs/passport` without version constraints pulled v12 packages targeting Nest 11/12.
- **Solution:** Pinned `@nestjs/config@^3.2.3`, `@nestjs/jwt@^10.2.0`, `@nestjs/passport@^10.0.3`, and `@nestjs/swagger@^7.4.2`.

### Challenge 4: Prisma 7 Schema URL Deprecation Error (`P1012`)
- **Problem:** Prisma 7 removed `url = env("DATABASE_URL")` from `schema.prisma`.
- **Solution:** Pinned to Prisma 6 LTS (`6.19.3`).

### Challenge 5: Host PostgreSQL Port 5432 Collision
- **Problem:** Native PostgreSQL was already running on host port 5432 with peer authentication.
- **Solution:** Remapped container PostgreSQL to port `5433:5432`.

### Challenge 6: Podman Short-Name Image Resolution
- **Problem:** `Error: short-name "postgres:16-alpine" did not resolve to an alias`.
- **Solution:** Fully qualified the image to `docker.io/library/postgres:16-alpine`.

### Challenge 7: Refresh Token Hash Collision on Rapid Generation
- **Problem:** Fast back-to-back token issuance within the same second generated identical token strings, failing the database unique constraint on `token_hash`.
- **Solution:** Injected RFC 7519 `jti: crypto.randomUUID()` into every refresh token payload, guaranteeing unique hashes on every token creation.

---

## 📅 Chronological Step-by-Step Implementation Log

### Step 0: Environment Audit & Virtual Environment Setup
- Initialized `.venv` bundling Node.js 22.14.0, npm 10.9.2, and rootless Podman container support.

### Step 1: NestJS Application Scaffold
- Scaffolded project structure using Nest CLI 10.
- Installed Config and Swagger modules.

### Step 2: System Health & OpenAPI Setup
- Configured `/health` endpoint and Swagger at `/api/docs`.

### Step 3: Containerization & Docker Orchestration
- Created multi-stage Dockerfile and docker-compose.yml running PostgreSQL 16 on port 5433.

### Step 4: Database Modeling & Prisma Schema (Phase 1)
- Designed 8 core entities in `schema.prisma`.
- Ran migration `20260925121126_init`.
- Created database seed script with default roles, providers, and test accounts.

### Step 5: Authentication Module (Phase 2)
- Implemented `RegisterDto`, `LoginDto`, `RefreshTokenDto`, `AuthResponseDto`.
- Implemented `AuthService` with dual-token generation, bcrypt hashing, and refresh token rotation.
- Implemented `JwtStrategy`, `JwtAuthGuard`, and `RolesGuard`.
- Created unit tests (`auth.service.spec.ts`) and end-to-end integration tests (`auth.e2e-spec.ts`).

### Step 6: User Management & Roles (Phase 3 — TDD First)
- Wrote unit test suite `src/modules/users/users.service.spec.ts` first.
- Wrote E2E test suite `test/users.e2e-spec.ts` first.
- Implemented `UsersService` (profile lookup, update, password change, account deactivation).
- Implemented `UsersController` with full Swagger annotations and admin-only test route.
- Verified all 36 unit and E2E tests passing 100% green.

### Step 7: Observability, Structured Logging & Error Handling (Foundational Infrastructure)
- **Structured JSON Logging (`nestjs-pino`)**: Integrated Pino logger with environment-adaptive formatting (`pino-pretty` in development, structured JSON in production, `silent` in automated tests).
- **Request Correlation (`x-request-id`)**: Configured automatic `genReqId` generating cryptographic UUIDs and propagating `x-request-id` response headers for full request lifecycle tracing.
- **Strict Data Redaction**: Configured Pino redaction rules to censor sensitive fields (`authorization`, `cookie`, `password`, `currentPassword`, `newPassword`, `refreshToken`, `apiKey`) to prevent credential leakage in application logs.
- **Global Exception Filter (`AllExceptionsFilter`)**: Standardized all error responses with `statusCode`, `timestamp`, `path`, `method`, `requestId`, and `message`. Automatically logs server errors (>= 500) with complete stack traces and user context, and client errors (>= 400) as warnings.
- **Database Query Observability**: Enabled Prisma query warning and error logging in `PrismaService`.
- **Domain Audit Logging**: Integrated audit logs in `AuthService` (logins, registrations, token rotation, session revocations) and `UsersService` (password changes, profile updates, account deactivations).
- Verified test suite passes 100% green (36 tests passing).

---

### Step 8: Subscription & Quota Management (Phase 4 — TDD First)
- **TDD Tests First**:
  - Authored unit test suite `src/modules/subscription/subscription.service.spec.ts` (10 tests) covering quota limits, automatic daily resets, fallback for uninitialized subscriptions, upgrade, downgrade, remaining count queries, and 429 rate limit exceptions.
  - Authored E2E test suite `test/subscription.e2e-spec.ts` (10 tests) verifying endpoint security (401s), free tier initial status, upgrade to PREMIUM, downgrade back to FREE, and query balances.
- **Quota & Tier Architecture**:
  - Implemented `SubscriptionService`:
    - Free tier: 20 requests per day.
    - Premium tier: 500 requests per day with 30-day billing cycle tracking.
    - Automatic UTC day calendar check (`checkAndPerformDailyReset`): automatically resets `usedRequestsToday` to 0 when a new day begins.
    - Quota decrementing API (`consumeQuota`) that cleanly throws HTTP 429 `TOO_MANY_REQUESTS` if the daily limit is exhausted.
- **Subscription API Endpoints**:
  - `GET /api/subscription/status`: Returns plan tier, status, daily limit, used count today, and remaining requests.
  - `POST /api/subscription/upgrade`: Transitions user to `PREMIUM` with 500 requests/day.
  - `POST /api/subscription/downgrade`: Transitions user back to `FREE` with 20 requests/day.
  - `GET /api/subscription/remaining-requests`: Returns `{ remainingRequests: number }`.
- **System Verification**:
  - Total automated test suite expanded to **56 passing tests (28 unit, 28 E2E)** with 100% green pass rate.

---

### Step 9: AI Provider Management & AES-256 Key Encryption (Phase 5 — TDD First)
- **TDD Tests First**:
  - Authored unit test suite `src/common/crypto/crypto.service.spec.ts` (5 tests) verifying AES-256-CBC encryption/decryption roundtrip, non-deterministic ciphertext with random 16-byte initialization vectors (IV), and malformed ciphertext error handling.
  - Authored unit test suite `src/modules/providers/providers.service.spec.ts` (9 tests) testing provider listing, key sanitization, default switching with transactional exclusivity, and mock health checks.
  - Authored E2E test suite `test/providers.e2e-spec.ts` (11 tests) validating public/user read access, strict exclusion of raw and encrypted keys in HTTP payloads, admin-only RBAC protection (403 for non-admin on create/update/set-default), key update encryption, and health checks.
- **Security & Encryption Architecture**:
  - Implemented `CryptoService` (`src/common/crypto/crypto.service.ts`):
    - Uses Node.js native `crypto` module with `aes-256-cbc`.
    - Enforces strict 32-byte (256-bit) encryption key from environment.
    - Generates cryptographically secure 16-byte random IV per encryption operation.
    - Serializes output as `<iv_hex>:<ciphertext_hex>`.
  - Database Audit Verification:
    - Queried live PostgreSQL database directly to confirm column `encrypted_api_key` stores ciphertext only and never raw keys.
- **API Endpoints Implemented** (`/api/providers`):
  - `GET /api/providers`: Lists active providers with model options (keys redacted).
  - `GET /api/providers/:id`: Retrieves individual provider configuration.
  - `POST /api/providers`: Admin endpoint to register new providers with encrypted credentials.
  - `PATCH /api/providers/:id`: Admin endpoint to update model parameters or rotate encrypted keys.
  - `POST /api/providers/:id/set-default`: Admin endpoint to set system default provider.
  - `GET /api/providers/:id/health`: Diagnostics endpoint for provider operational status.
- **System Verification**:
  - Total automated test suite expanded to **81 passing tests (42 unit, 39 E2E)** across 12 test suites with 100% green pass rate.

---

## 🧭 Next Milestone: Phase 6 (Chat API & Model Orchestration — TDD First)
In Phase 6, we will implement:
1. Write Unit tests for `AiProviderAdapter` implementations (OpenAI, Claude, Gemini) with mocked HTTP client.
2. Write E2E tests for conversation creation, message persistence, history retrieval, and quota decrement integration.
3. Pluggable `AiProviderAdapter` interface with:
   - `GeminiAdapter` (Google Gemini 1.5 Flash / Pro)
   - `OpenAiAdapter` (OpenAI GPT-4o / GPT-4o-mini)
   - `ClaudeAdapter` (Anthropic Claude 3.5 Sonnet)
4. `ChatService` and `ChatController`:
   - `POST /api/chat/send-prompt`: Routes prompt through selected or default provider, verifies and decrements subscription quota (enforcing 429), stores conversation & message history.
   - `GET /api/chat/conversations`: Retrieves user conversation history.
   - `GET /api/chat/conversations/:id`: Retrieves full conversation thread.
   - `DELETE /api/chat/conversations/:id`: Deletes conversation and messages.
   - Bonus: SSE (Server-Sent Events) streaming endpoint.
