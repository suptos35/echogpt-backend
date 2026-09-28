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
| **Phase 4** | Subscription & Quota Management | ⏳ **Next** | Free & Premium tiers, remaining quota API, downgrade/upgrade, rate limiting |
| **Phase 5** | AI Provider Management & Encryption | ⏳ Upcoming | Dynamic provider management (OpenAI, Claude, Gemini), AES-256 encrypted key storage, health check |
| **Phase 6** | Chat API & Model Orchestration | ⏳ Upcoming | Pluggable `AiProviderAdapter`, model routing, conversation history, SSE streaming |
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

### Phase 4: Subscription Management (UPCOMING — TDD First)
- [ ] Write Unit tests for subscription quota calculations and limits
- [ ] Write E2E tests for subscription status, tier upgrade, tier downgrade, and remaining requests
- [ ] Implement `SubscriptionService` with usage decrementing and daily quota reset logic
- [ ] Implement `SubscriptionController` at `/api/subscription`:
  - `GET /api/subscription/status` (current tier, quota, remaining requests)
  - `POST /api/subscription/upgrade` (upgrade FREE to PREMIUM)
  - `POST /api/subscription/downgrade` (downgrade PREMIUM to FREE)
  - `GET /api/subscription/remaining-requests` (returns integer count of remaining queries today)

---

## 🔑 Human Input Requirements Checklist

| Requirement | Stage | Status | Notes |
|---|---|---|---|
| Review Database Schema | Phase 1 | 🔍 Ready for Review | Review `prisma/schema.prisma` |
| Google Gemini API Key | Phase 6 | ⏳ Pending | Needed for live testing the free AI provider tier |
| OpenAI / Claude API Keys | Phase 5-6 | ⚪ Optional | Not required; unit tests use mocked HTTP adapters |
| Review AES-256 Key Storage | Phase 5 | ⏳ Pending | Security audit on database ciphertext storage |
