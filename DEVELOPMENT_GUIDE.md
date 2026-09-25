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

## 🛠 Architectural Decisions & Rationale

### 1. Framework: NestJS 10 (TypeScript)
- **Rationale:** NestJS enforces modular architecture, dependency injection, and clean separation of concerns (Controllers, Services, Modules).
- **TypeScript:** Guarantees strict typing across DTOs, domain models, and service interfaces, minimizing runtime crashes.

### 2. ORM: Prisma 6 LTS
- **Selection: Prisma 6 (`@prisma/client@^6.19.3`)**
- **Rationale:** 
  1. Declarative, single source of truth schema file (`prisma/schema.prisma`).
  2. Automatic, deterministic migration generation (`prisma migrate`).
  3. Fully type-safe generated client (`@prisma/client`).
  4. Prisma Studio provides an instant local visual database dashboard for inspection.
  5. Pinned to Prisma 6 to preserve universal `url = env("DATABASE_URL")` standard support, avoiding the breaking architectural shift of Prisma 7 (`prisma.config.ts` requirement).

### 3. Dual-Token JWT Authentication with Refresh Token Rotation
- **Rationale:**
  - Access tokens have a short lifespan (15 minutes), mitigating the impact of token interception.
  - Refresh tokens have a longer lifespan (7 days) and are **stored as bcrypt hashes in PostgreSQL**.
  - On every refresh request, the old refresh token is immediately invalidated and a new one is issued (Refresh Token Rotation).

### 4. Zero-Leak Credential Security (AES-256)
- **Rationale:** 
  - Storing third-party AI API keys in plaintext in the database is a critical vulnerability.
  - We use AES-256 encryption via Node's native `crypto` module.
  - Provider keys are encrypted before database insertion. The secret encryption key is loaded only from `.env`.
  - API responses mask all keys (e.g. `sk-proj-****`), completely preventing raw key leakage.

---

## 🚧 Problems Faced & Solutions Applied

### Challenge 1: Host Machine Environment Constraints
- **Problem:**
  - System audit revealed that `node`, `npm`, and `docker` were not available in the global system `$PATH`.
  - Global `sudo` access was password-protected and unavailable.
  - The machine had `python3` and `uv` installed, and `podman 4.9.3` available.
- **Solution:**
  - Created a virtualized environment [`.venv`](file:///mnt/sda3/projects/Appifydevs/.venv) using `uv`.
  - Integrated `nodeenv` to install **Node.js LTS v22.14.0** and **npm 10.9.2** directly within `.venv/bin`.
  - Installed `podman-compose` inside the environment and established symlinks for `docker` -> `podman` and `docker-compose` -> `podman-compose`.
  - **Result:** Complete standalone workspace capable of compiling TypeScript, installing packages, running Nest CLI, and managing containers with zero root permissions required.

### Challenge 2: Nest CLI v11 Module Cycle / ESM Conflict
- **Problem:**
  - When installing `@nestjs/cli` latest (v11), running `nest --version` resulted in an `ERR_REQUIRE_CYCLE_MODULE` error caused by an upstream ESM import issue between `@angular-devkit/schematics` and `ora`.
- **Solution:**
  - Pinned the CLI to stable `@nestjs/cli@10.4.9`.

### Challenge 3: Peer Dependency Mismatch with `@nestjs/config`
- **Problem:**
  - Running `npm install @nestjs/config` attempted to fetch v12, which declared a strict peer dependency on `@nestjs/common@^11.0.0 || ^12.0.0`, conflicting with the NestJS 10 core scaffold.
- **Solution:**
  - Explicitly installed matching version ranges: `@nestjs/config@^3.2.3`, `@nestjs/swagger@^7.4.2`, and `swagger-ui-express@^5.0.1`.

### Challenge 4: Prisma 7 Schema URL Deprecation Error (`P1012`)
- **Problem:**
  - Installing `prisma@latest` fetched Prisma 7.10.0, which removed support for `url = env("DATABASE_URL")` in `schema.prisma`, demanding a new `prisma.config.ts` and custom driver adapters.
- **Solution:**
  - Pinned the ORM to **Prisma 6 LTS (`@prisma/client@^6.19.3` and `prisma@^6.19.3`)**.
  - Restored standard NestJS + Prisma datasource conventions seamlessly.

### Challenge 5: Host PostgreSQL Port 5432 Collision
- **Problem:**
  - A native PostgreSQL 16 instance was already running on host port `5432` without credentials for the local user (`FATAL: role "sup35" does not exist`). Attempting to bind a container to `5432` resulted in port conflicts.
- **Solution:**
  - Remapped container PostgreSQL to port `5433:5432`.
  - Updated [.env](file:///mnt/sda3/projects/Appifydevs/.env), [.env.example](file:///mnt/sda3/projects/Appifydevs/.env.example), and [docker-compose.yml](file:///mnt/sda3/projects/Appifydevs/docker-compose.yml) to use port `5433` by default.

### Challenge 6: Podman Short-Name Image Resolution
- **Problem:**
  - Podman threw: `Error: short-name "postgres:16-alpine" did not resolve to an alias`.
- **Solution:**
  - Fully qualified the container image name to `docker.io/library/postgres:16-alpine`.

---

## 📅 Chronological Step-by-Step Implementation Log

### Step 0: Environment Audit & Virtual Environment Setup
- Detected existing tools: `git 2.43.0`, `gh 2.45.0` (authenticated as `suptos35`).
- Created project virtual environment `.venv`.
- Deployed Node.js 22.14.0 and npm 10.9.2.
- Configured Podman compatibility aliases for Docker commands.

### Step 1: NestJS Application Scaffold
- Created [.gitignore](file:///mnt/sda3/projects/Appifydevs/.gitignore) excluding `node_modules`, `dist`, `.env`, and `.venv`.
- Scaffolded project structure using `nest new echogpt-backend --directory . --package-manager npm --skip-git`.
- Installed dependencies: `@nestjs/config`, `@nestjs/swagger`, `swagger-ui-express`, `class-validator`, `class-transformer`.

### Step 2: System Health & OpenAPI Setup
- Implemented [configuration.ts](file:///mnt/sda3/projects/Appifydevs/src/config/configuration.ts) for environment management.
- Implemented [HealthController](file:///mnt/sda3/projects/Appifydevs/src/modules/health/health.controller.ts) at `/health` returning system uptime and service identity.
- Registered [HealthModule](file:///mnt/sda3/projects/Appifydevs/src/modules/health/health.module.ts) in [AppModule](file:///mnt/sda3/projects/Appifydevs/src/app.module.ts).
- Configured [main.ts](file:///mnt/sda3/projects/Appifydevs/src/main.ts) with Swagger documentation at `/api/docs`, CORS, and global validation pipes.

### Step 3: Containerization & Docker Orchestration
- Created multi-stage [Dockerfile](file:///mnt/sda3/projects/Appifydevs/Dockerfile) optimizing image footprint.
- Created [docker-compose.yml](file:///mnt/sda3/projects/Appifydevs/docker-compose.yml) orchestrating `postgres:16-alpine` (port 5433) and `backend` services.
- Created [.env.example](file:///mnt/sda3/projects/Appifydevs/.env.example) and default [.env](file:///mnt/sda3/projects/Appifydevs/.env).

### Step 4: Database Modeling & Prisma Schema (Phase 1)
- Designed normalized schema with all 8 entities in [prisma/schema.prisma](file:///mnt/sda3/projects/Appifydevs/prisma/schema.prisma).
- Generated initial migration `20260925121126_init` applied to PostgreSQL.
- Implemented [prisma/seed.ts](file:///mnt/sda3/projects/Appifydevs/prisma/seed.ts) populating roles, providers, and accounts.
- Implemented [PrismaService](file:///mnt/sda3/projects/Appifydevs/src/common/prisma/prisma.service.ts) and [PrismaModule](file:///mnt/sda3/projects/Appifydevs/src/common/prisma/prisma.module.ts).
- Verified build and test suites pass 100%.

---

## 🧭 Next Milestone: Phase 2 (Authentication Module)
In Phase 2, we will implement:
1. Registration with email uniqueness check and bcrypt password hashing.
2. Login generating dual JWT tokens (`accessToken` 15m, `refreshToken` 7d).
3. Hashed refresh token storage and Refresh Token Rotation on `/api/auth/refresh`.
4. Invalidation of tokens on `/api/auth/logout`.
5. `JwtAuthGuard` and `@CurrentUser()` decorator.
6. Comprehensive unit and E2E test coverage.
