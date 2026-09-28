# Project Execution Checklist

Tracking progress across all phases of the **EchoGPT Backend REST API** development.

---

## 📌 Phase Progress Overview

| Phase | Description | Status | Commit / Notes |
|---|---|---|---|
| **Phase 0** | Project Scaffold & Containerization | ✅ **Completed** | NestJS 10, ConfigModule, Swagger UI (`/api/docs`), `/health` endpoint, Dockerfile, docker-compose, `.env.example`, automated tests |
| **Phase 1** | Database & Prisma Schema | ✅ **Completed** | Normalized PostgreSQL schema (8 core models), Prisma 6 ORM, migrations, seed script (`Roles`, `AI Providers`, `Admin`, `Demo User`), `PrismaModule` & `PrismaService` |
| **Phase 2** | Authentication Module | ✅ **Completed** | Registration, login, logout, dual JWT, refresh token rotation with replay detection, bcrypt password hashing, `JwtAuthGuard`, `RolesGuard` |
| **Phase 3** | User Management & Roles | ✅ **Completed** | Profile retrieval (`GET /api/users/profile`), profile update (`PATCH /api/users/profile`), password change with session invalidation, account deletion, RBAC guard verification |
| **Phase 4** | Subscription & Quota Management | ✅ **Completed** | Free (20/day) & Premium (500/day) plans, auto daily quota reset, upgrade/downgrade endpoints, quota decrementing, 429 enforcement |
| **Phase 5** | AI Provider Management & Encryption | ✅ **Completed** | AES-256-CBC encrypted API key storage, random IVs, provider CRUD, default selection, health checks, key leakage prevention |
| **Phase 6** | Chat API & Model Orchestration | ⏳ **Next** | Pluggable `AiProviderAdapter`, model routing (Gemini/OpenAI/Claude), conversation history, SSE streaming |
| **Phase 7** | Web Search API | ⏳ Upcoming | AI-assisted search, caching layer, query history, suggestions |
| **Phase 8** | Admin Panel APIs | ⏳ Upcoming | Analytics dashboard, user oversight, subscription management, request logs |
| **Phase 9** | Hardening & Security Pass | ⏳ Upcoming | Global exception filter, helmet, rate throttler, validation DTOs, full OpenAPI annotations |
| **Phase 10** | Test Coverage & Postman Collection | ⏳ Upcoming | Unit + E2E coverage (75-85%), Postman export, GitHub Actions CI workflow |
| **Phase 11** | Submission Polish & Clean Clone Test | ⏳ Upcoming | Final documentation verification, zero-config bootstrap verification |
| **Phase 12** | Live Deployment (Optional) | ⏳ Optional | Render/Railway free tier deployment with live Swagger URL |

---

## 📋 Detailed Phase Checklist

### Phase 0: Project Scaffold (COMPLETED)
- [x] Environment audit and virtual environment isolation (`.venv` with Node.js 22 LTS, npm 10, nest CLI 10, podman/docker aliases)
- [x] NestJS 10 application scaffolded in root
- [x] `@nestjs/config` centralized configuration setup
- [x] Swagger OpenAPI initialized at `/api/docs` with Bearer auth schema
- [x] `/health` endpoint implemented with system uptime and status
- [x] Multi-stage `Dockerfile` and `docker-compose.yml` (PostgreSQL 16 + Backend)
- [x] `.env.example` and `.env` template configured
- [x] Unit and E2E test suites created and passing (100% green)
- [x] Git repository initialized, configured, and pushed to GitHub

### Phase 1: Database & Schema (COMPLETED)
- [x] Installed Prisma 6 LTS ORM (`@prisma/client@^6.19.3`, `prisma@^6.19.3`) and `bcrypt`
- [x] Defined normalized PostgreSQL schema covering all 8 core entities
- [x] Configured PostgreSQL container on port `5433` avoiding host port `5432` collision
- [x] Generated initial migration `20260925121126_init`
- [x] Implemented seed script (`prisma/seed.ts`) populating default roles, providers, and test accounts
- [x] Created global `PrismaModule` and lifecycle-managed `PrismaService`
- [x] Verified full build and test suites (100% passing)

### Phase 2: Authentication Module (COMPLETED)
- [x] Installed `@nestjs/jwt@^10.2.0`, `@nestjs/passport@^10.0.3`, `passport-jwt`
- [x] Created validation DTOs (`RegisterDto`, `LoginDto`, `RefreshTokenDto`, `AuthResponseDto`)
- [x] Implemented `AuthService` with dual-token generation, bcrypt hashing, and refresh token rotation
- [x] Implemented `JwtStrategy`, `JwtAuthGuard`, and RBAC `RolesGuard`
- [x] Created `@CurrentUser()` and `@Roles()` decorators
- [x] Created `AuthController` at `/api/auth` with full OpenAPI/Swagger annotations
- [x] Unit test suite (`src/modules/auth/auth.service.spec.ts`) passing (100% green)
- [x] E2E integration test suite (`test/auth.e2e-spec.ts`) passing (100% green)

### Phase 3: User Management & Roles (COMPLETED — Built TDD First)
- [x] **TDD Unit Tests Written First**: Created `src/modules/users/users.service.spec.ts` covering profile retrieval, update, password change, and account deletion
- [x] **TDD E2E Tests Written First**: Created `test/users.e2e-spec.ts` testing authenticated profile flow, updates, password change, RBAC 403 vs 200, and account deactivation
- [x] Implemented `UpdateProfileDto`, `ChangePasswordDto`, `UserProfileDto`
- [x] Implemented `UsersService`:
  - `getProfile`: returns user profile and linked subscription status
  - `updateProfile`: safely updates first and last name
  - `changePassword`: validates current password with bcrypt, rejects identical password, hashes new password, revokes all active sessions for security
  - `deleteAccount`: sets `isActive: false` and revokes all refresh tokens
- [x] Implemented `UsersController` with Swagger docs and RBAC verification endpoint (`GET /api/users/admin-only-test`)
- [x] All 36 automated unit and E2E tests passing 100% green

### Observability & Structured Logging (Foundational — COMPLETED)
- [x] Installed `nestjs-pino@4.1.0`, `pino-http@^10.0.0`, and `pino-pretty` in isolated `.venv`
- [x] Configured `LoggerModule` in `AppModule` with dynamic correlation IDs (`x-request-id` header generation and propagation)
- [x] Implemented strict log redaction for sensitive credentials (`authorization`, `cookie`, `password`, `refreshToken`, `apiKey`)
- [x] Implemented `AllExceptionsFilter` (`src/common/filters/all-exceptions.filter.ts`) with standardized error response shape and automatic error/warn logging
- [x] Configured `PrismaService` warning and error logging
- [x] Retrofitted `AuthService` and `UsersService` with structured audit logs
- [x] Verified full unit and E2E test suites (100% green)

### Phase 4: Subscription Management (COMPLETED — Built TDD First)
- [x] **TDD Unit Tests Written First**: Created `src/modules/subscription/subscription.service.spec.ts` (10 passing tests) covering status, daily auto-reset, missing subscription fallback, upgrade (500 requests), downgrade (20 requests), remaining requests, quota decrementing, and 429 rate limit exception.
- [x] **TDD E2E Tests Written First**: Created `test/subscription.e2e-spec.ts` (10 passing tests) validating 401 unauthorized guards, initial free tier status, upgrade flow, downgrade flow, and remaining query counts.
- [x] Implemented `SubscriptionStatusDto` and `RemainingRequestsDto` with OpenAPI/Swagger annotations.
- [x] Implemented `SubscriptionService`:
  - `getSubscriptionStatus`: computes remaining requests, handles calendar-day auto-reset (`usedRequestsToday: 0`), and auto-initializes free tier if missing.
  - `upgradeSubscription`: upgrades user to `PREMIUM` with 500 requests/day and sets 30-day billing cycle.
  - `downgradeSubscription`: downgrades user to `FREE` with 20 requests/day and clears expiration.
  - `getRemainingRequests`: returns current query allowance for the day.
  - `consumeQuota`: increments used requests or throws 429 `TOO_MANY_REQUESTS` if daily limit reached.
- [x] Implemented `SubscriptionController` at `/api/subscription` with JWT protection.
- [x] Registered `SubscriptionModule` in `AppModule` and exported `SubscriptionService`.
- [x] Full automated test suite passing: **56 tests total (28 unit, 28 E2E)**.

### Phase 5: AI Provider Management & Encryption (COMPLETED — Built TDD First)
- [x] **TDD Unit Tests Written First**:
  - `src/common/crypto/crypto.service.spec.ts` (5 tests): AES-256-CBC roundtrip, random IV generation uniqueness, corruption error handling, null handling.
  - `src/modules/providers/providers.service.spec.ts` (9 tests): list providers without leaking keys, get by ID, key encryption on creation, default provider switching, and mock health checks.
- [x] **TDD E2E Tests Written First**:
  - `test/providers.e2e-spec.ts` (11 tests): list providers, authenticated access, strict key confidentiality (no `apiKey` or `encryptedApiKey` leaked in response payload), admin-only RBAC protection (403 for standard user on create/update/set-default), key update encryption, and health checks.
- [x] Implemented `CryptoService` (`src/common/crypto/crypto.service.ts`) with AES-256-CBC and random 16-byte IVs.
- [x] Exported `CryptoModule` globally.
- [x] Implemented `CreateProviderDto`, `UpdateProviderDto`, `ProviderResponseDto`, and `ProviderHealthDto`.
- [x] Implemented `ProvidersService` and `ProvidersController` (`/api/providers`):
  - `GET /api/providers` (lists active AI providers with sanitized response)
  - `GET /api/providers/:id` (retrieves single provider configuration)
  - `POST /api/providers` (Admin-only: registers provider with AES-256 encrypted key)
  - `PATCH /api/providers/:id` (Admin-only: updates models/baseURL/rotates key)
  - `POST /api/providers/:id/set-default` (Admin-only: transactional default provider switch)
  - `GET /api/providers/:id/health` (diagnostics check without external network dependencies)
- [x] Verified database column storage: confirmed PostgreSQL column `encrypted_api_key` contains `<iv_hex>:<ciphertext_hex>` and never raw plaintext.
- [x] Full automated test suite passing: **81 tests total (42 unit, 39 E2E)**.

### Phase 6: Chat API & Model Orchestration (UPCOMING — TDD First)
- [ ] Write Unit tests for `AiProviderAdapter` implementations (OpenAI, Claude, Gemini) with mocked HTTP client.
- [ ] Write E2E tests for conversation creation, message persistence, history retrieval, and quota decrement integration.
- [ ] Implement `AiProviderAdapter` interface with `GeminiAdapter`, `OpenAiAdapter`, and `ClaudeAdapter`.
- [ ] Implement `ChatService` and `ChatController`:
  - `POST /api/chat/send-prompt`: Routes through default/selected provider, checks and decrements subscription quota (enforces 429), stores conversation & message history.
  - `GET /api/chat/conversations`: Retrieves user conversation list.
  - `GET /api/chat/conversations/:id`: Retrieves full conversation message history.
  - `DELETE /api/chat/conversations/:id`: Deletes conversation and messages.
  - Optional bonus: SSE (Server-Sent Events) streaming endpoint.

---

## 🔑 Human Input Requirements Checklist

| Requirement | Stage | Status | Notes |
|---|---|---|---|
| Review Database Schema | Phase 1 | 🔍 Ready for Review | Review `prisma/schema.prisma` |
| Review AES-256 Key Storage | Phase 5 | 🔍 Ready for Review | Verified PostgreSQL column `encrypted_api_key` stores ciphertext only |
| Google Gemini API Key | Phase 6 | ⏳ Pending | Free tier API key needed for optional real live test (unit/e2e use mocks) |
| OpenAI / Claude API Keys | Phase 5-6 | ⚪ Optional | Not required; unit/e2e tests use mocked HTTP adapters |
