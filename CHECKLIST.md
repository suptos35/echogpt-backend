# Project Execution Checklist

Tracking progress across all phases of the **EchoGPT Backend REST API** development.

---

## 📌 Phase Progress Overview

| Phase | Description | Status | Commit / Notes |
|---|---|---|---|
| **Phase 0** | Project Scaffold & Containerization | ✅ **Completed** | NestJS 10, ConfigModule, Swagger UI (`/api/docs`), `/health` endpoint, Dockerfile, docker-compose, `.env.example`, automated tests |
| **Phase 1** | Database & Prisma Schema | ✅ **Completed** | Normalized PostgreSQL schema (8 core models), Prisma 6 ORM, migrations, seed script (`Roles`, `AI Providers`, `Admin`, `Demo User`), `PrismaModule` & `PrismaService` |
| **Phase 2** | Authentication Module | ✅ **Completed** | Registration, login, logout, dual JWT, refresh token rotation with replay detection, bcrypt password hashing, `JwtAuthGuard`, `RolesGuard` |
| **Phase 3** | User Management & Roles | ⏳ **Next** | Profile CRUD, password change, account deletion, Admin & User RBAC guards |
| **Phase 4** | Subscription & Quota Management | ⏳ Upcoming | Free & Premium tiers, remaining quota API, downgrade/upgrade, rate limiting |
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
- [x] Implemented `AuthService`:
  - Secure registration with email uniqueness constraint, bcrypt hashing (10 rounds), default `FREE` subscription creation
  - User login validating password hash and account active status
  - Refresh Token Rotation: invalidates old token on use, issues new token pair, includes `jti` to prevent token collisions
  - Invalidation of replayed/stolen refresh tokens (family revocation security pattern)
  - Logout endpoint with selective or global session token invalidation
- [x] Implemented `JwtStrategy`, `JwtAuthGuard`, and RBAC `RolesGuard`
- [x] Created `@CurrentUser()` and `@Roles()` decorators
- [x] Created `AuthController` at `/api/auth` with full OpenAPI/Swagger annotations
- [x] Unit test suite (`src/modules/auth/auth.service.spec.ts`) passing (100% green)
- [x] E2E integration test suite (`test/auth.e2e-spec.ts`) testing complete registration, login, rotation, replay rejection, and logout (100% green)

### Phase 3: User Management & Roles (UPCOMING)
- [ ] DTOs: `UpdateProfileDto`, `ChangePasswordDto`
- [ ] Endpoints:
  - `GET /api/users/profile` (current user profile with subscription details)
  - `PATCH /api/users/profile` (update first/last name)
  - `PATCH /api/users/change-password` (verify current password, hash new password)
  - `DELETE /api/users/account` (account self-deletion or soft-delete)
- [ ] RBAC verification test: `admin` vs `user` route access
- [ ] Unit & E2E tests for user management

---

## 🔑 Human Input Requirements Checklist

| Requirement | Stage | Status | Notes |
|---|---|---|---|
| Review Database Schema | Phase 1 | 🔍 Ready for Review | Review `prisma/schema.prisma` |
| Google Gemini API Key | Phase 6 | ⏳ Pending | Needed for live testing the free AI provider tier |
| OpenAI / Claude API Keys | Phase 5-6 | ⚪ Optional | Not required; unit tests use mocked HTTP adapters |
| Review AES-256 Key Storage | Phase 5 | ⏳ Pending | Security audit on database ciphertext storage |
