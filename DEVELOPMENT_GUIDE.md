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

### ER Diagram:
```
 Role (1) ─────────────< (N) User (1) ─────────────── (1) Subscription
                              │
                              ├───────────────< (N) RefreshToken
                              ├───────────────< (N) WebSearch
                              ├───────────────< (N) ApiUsageLog
                              │
                              └───────────────< (N) Conversation (1) ─────────< (N) Message
                                                         │
                                    AiProvider (1) ──────┘
```

---

## 🔐 Authentication & Session Security Architecture

### 1. Dual-Token Architecture
- **Access Token:** Short lifespan (`15 minutes`), signs `{ sub: userId, email, role }`. Used on every authenticated request via the `Authorization: Bearer <token>` HTTP header.
- **Refresh Token:** Long lifespan (`7 days`), signs `{ sub: userId, email, role, jti: UUID }`.
- **Database Storage:** The database stores **only the deterministic SHA-256 hash** of the refresh token (`token_hash`). If the database is compromised, active session refresh tokens cannot be reversed.

### 2. Refresh Token Rotation with Replay Attack Detection
When a user calls `POST /api/auth/refresh`:
1. The incoming refresh token is verified with `jwtService.verifyAsync()`.
2. The hash of the token is queried in `refresh_tokens`.
3. If the token is found and valid:
   - The token record is **immediately deleted** from the database (single-use semantics).
   - A brand-new pair of access token and refresh token is issued.
   - The new refresh token hash is saved to the database.
4. If a previously rotated token is replayed:
   - The system detects a potential session theft.
   - It **revokes all active sessions** for that user ID (`deleteMany({ where: { userId } })`), immediately cutting off both the attacker and alerting the user.

---

## 🛠 Architectural Decisions & Rationale

### 1. Framework: NestJS 10 (TypeScript)
- **Rationale:** Modular architecture, dependency injection, and clean separation of concerns.
- **TypeScript:** Strict type checking across DTOs, domain models, and service interfaces.

### 2. ORM: Prisma 6 LTS
- **Selection: Prisma 6 (`@prisma/client@^6.19.3`)**
- **Rationale:** Declarative schema, deterministic migrations, type-safe client, and avoiding Prisma 7 breaking configuration changes.

### 3. JWT Uniqueness via `jti` (JWT ID)
- **Rationale:** If a user signs in rapidly within the same second, JWT payloads without high-resolution timestamps or unique identifiers produce identical tokens. Including `jti: crypto.randomUUID()` in the refresh token payload guarantees 100% cryptographic uniqueness and eliminates database unique constraint collisions.

### 4. Zero-Leak Credential Security (AES-256)
- **Rationale:** Storing third-party AI API keys in plaintext in the database is prohibited. We use AES-256 encryption via Node's native `crypto` module.

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
- Configured `AuthController` at `/api/auth` with OpenAPI documentation.
- Created unit tests (`auth.service.spec.ts`) and end-to-end integration tests (`auth.e2e-spec.ts`) — all passing 100%.

---

## 🧭 Next Milestone: Phase 3 (User Management & Roles)
In Phase 3, we will implement:
1. `GET /api/users/profile` (returns current user profile + subscription plan status).
2. `PATCH /api/users/profile` (allows updating first name and last name).
3. `PATCH /api/users/change-password` (verifies current password and updates password hash).
4. `DELETE /api/users/account` (account deactivation / deletion).
5. Role-based guard tests proving `USER` cannot access `ADMIN`-only routes.
