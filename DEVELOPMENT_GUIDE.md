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

## 🛠 Architectural Decisions & Rationale

### 1. Framework: NestJS 10 (TypeScript)
- **Rationale:** NestJS enforces modular architecture, dependency injection, and clean separation of concerns (Controllers, Services, Modules).
- **TypeScript:** Guarantees strict typing across DTOs, domain models, and service interfaces, minimizing runtime crashes.

### 2. ORM: Prisma vs TypeORM
- **Selection: Prisma ORM**
- **Rationale:** 
  1. Declarative, single source of truth schema file (`prisma/schema.prisma`).
  2. Automatic, deterministic migration generation (`prisma migrate`).
  3. Fully type-safe generated client (`@prisma/client`) that eliminates mismatch bugs between SQL types and TypeScript interfaces.
  4. Prisma Studio provides an instant local visual database dashboard for inspection.

### 3. Dual-Token JWT Authentication with Refresh Token Rotation
- **Rationale:**
  - Access tokens have a short lifespan (15 minutes), mitigating the impact of token interception.
  - Refresh tokens have a longer lifespan (7 days) and are **stored as bcrypt hashes in PostgreSQL**.
  - On every refresh request, the old refresh token is immediately invalidated and a new one is issued (Refresh Token Rotation). If a stolen refresh token is re-submitted, the entire family of tokens is revoked, preventing session hijacking.

### 4. Zero-Leak Credential Security (AES-256)
- **Rationale:** 
  - Storing third-party AI API keys in plaintext in the database is a critical vulnerability.
  - We use AES-256 encryption via Node's native `crypto` module.
  - Provider keys are encrypted before database insertion. The secret encryption key is loaded only from `.env`.
  - API responses for `GET /api/providers` mask all keys (e.g. `sk-proj-****` or return a boolean `hasKeyConfigured: true`), completely preventing raw key leakage.

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
  - Verified `nest --version` outputs cleanly and scaffolds applications without cyclic errors.

### Challenge 3: Peer Dependency Mismatch with `@nestjs/config`
- **Problem:**
  - Running `npm install @nestjs/config` attempted to fetch v12, which declared a strict peer dependency on `@nestjs/common@^11.0.0 || ^12.0.0`, conflicting with the NestJS 10 core scaffold.
- **Solution:**
  - Explicitly installed matching version ranges: `@nestjs/config@^3.2.3`, `@nestjs/swagger@^7.4.2`, and `swagger-ui-express@^5.0.1`.
  - All packages resolved and installed with 0 peer dependency conflicts.

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
- Created [docker-compose.yml](file:///mnt/sda3/projects/Appifydevs/docker-compose.yml) orchestrating `postgres:16-alpine` and `backend` services.
- Created [.env.example](file:///mnt/sda3/projects/Appifydevs/.env.example) and default [.env](file:///mnt/sda3/projects/Appifydevs/.env).

### Step 4: Verification & Test Suite
- Built TypeScript bundle (`npm run build`) -> Success.
- Executed unit tests (`npm test`) -> 2 suites passed, 3 tests passed.
- Executed E2E tests (`npm run test:e2e`) -> `/` and `/health` passed.

---

## 🧭 Next Milestone: Phase 1 (Database & Schema Design)
In Phase 1, we will implement:
1. Prisma ORM initialization (`npx prisma init`).
2. Normalized database schema with 8 core entities:
   - `User`: Accounts, role references, timestamps.
   - `Role`: RBAC definitions (`ADMIN`, `USER`).
   - `RefreshToken`: Hashed tokens with expiration and revoked flags.
   - `Subscription`: User tier associations (`FREE`, `PREMIUM`), quota limits, resets.
   - `AiProvider`: Provider configurations (`OPENAI`, `CLAUDE`, `GEMINI`), encrypted credentials, status.
   - `Conversation` & `Message`: Threaded chat history and token statistics.
   - `WebSearch`: Search query caching, query logs, and timestamps.
   - `ApiUsageLog`: Granular request logs, latency metrics, and quota auditing.
3. Database migration scripts and database seed script.
