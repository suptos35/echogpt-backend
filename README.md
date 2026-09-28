# EchoGPT Backend REST API

> Production-ready NestJS + PostgreSQL + Swagger backend for the [EchoGPT Multi-AI Chrome Extension](https://chromewebstore.google.com/detail/echogpt-multi-ai-chat-sid/negimdcamohmoheiifgecbjgjepkcfhj).

[![CI](https://github.com/suptos35/echogpt-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/suptos35/echogpt-backend/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NestJS](https://img.shields.io/badge/NestJS-v10-red.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-v6-informational.svg)](https://www.prisma.io/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI%203.0-green.svg)](http://localhost:3000/api/docs)

---

## 🌟 Overview

EchoGPT Backend powers a browser extension providing multi-AI model chat (OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini 1.5 Pro) with encrypted credential management, user subscriptions, AI web search, and administrative analytics.

### Key Capabilities
- **Multi-AI Provider Engine:** Unified abstraction layer supporting OpenAI, Anthropic Claude, and Google Gemini with health checks and dynamic default selection.
- **Enterprise-Grade Security:** Stored AI provider API keys are encrypted at rest using AES-256 before writing to PostgreSQL. Raw keys are never leaked in API responses.
- **JWT Authentication with Refresh Rotation:** Dual-token JWT authentication with hashed refresh tokens stored in database and rotated on each refresh.
- **User & Role Management:** User profile CRUD, password change with session revocation, and RBAC guards (`ADMIN`, `USER`).
- **Subscription & Quota Management:** Free vs. Premium tiers with remaining request tracking and strict rate limiting.
- **Admin Panel & System Oversight:** Comprehensive administrative APIs for metrics aggregation, user account activation/deactivation with instant session invalidation, subscription audits, chronological API request logs, and real-time database latency diagnostics.
- **Security Hardening & Uniform Error Format:** HTTP security headers (`helmet`), strict CORS, rate limiting (`@nestjs/throttler`), payload validation (`class-validator`), and standardized error response envelope (`statusCode`, `timestamp`, `path`, `method`, `requestId`, `message`, `error`).
- **Interactive OpenAPI Documentation:** Full Swagger UI available at `/api/docs` with Bearer auth support and request/response schemas.

---

## 🛠 Tech Stack

- **Framework:** NestJS 10 (TypeScript)
- **Database & ORM:** PostgreSQL 16 & Prisma 6 ORM
- **API Documentation:** Swagger / OpenAPI (`@nestjs/swagger`)
- **Authentication:** Passport JWT, Bcrypt password hashing
- **Security & Validation:** `class-validator`, `helmet`, `@nestjs/throttler`, AES-256 encryption (`crypto`)
- **Logging & Observability:** `nestjs-pino`, `pino-http`, structured JSON, request correlation IDs (`x-request-id`), sensitive data redaction
- **Containerization:** Docker & Docker Compose / Podman
- **Testing:** Jest (Unit) & Supertest (E2E) — Built with **TDD First** methodology

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js v20+ or v22+
- Docker & Docker Compose (or Podman)
- Git

### 2. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```
*(The defaults are pre-configured with PostgreSQL running on port `5433` to prevent collision with any host database).*

### 3. Running with Docker Compose (Recommended)
Start both PostgreSQL and the Backend in a single command:
```bash
docker compose up -d
```
Access the application:
- **API Base URL:** `http://localhost:3000`
- **Health Check:** `http://localhost:3000/health`
- **Swagger Documentation:** `http://localhost:3000/api/docs`

### 4. Running Locally for Development
Start the PostgreSQL container:
```bash
docker compose up postgres -d
```

Apply database migrations and populate seed data:
```bash
npx prisma migrate dev
npm run seed
```

Start the NestJS dev server:
```bash
npm run start:dev
```

### 5. Seeded Accounts for Testing
The seed script (`npm run seed`) automatically prepares initial test accounts:
- **Admin Account:** `admin@echogpt.app` / `Admin123!` (Role: `ADMIN`, Premium Plan)
- **Demo User Account:** `user@echogpt.app` / `User123!` (Role: `USER`, Free Plan - 20 req/day)

---

## 🧪 Testing & Quality Assurance

Our test suite employs **TDD First** methodology, combining exhaustive unit testing with end-to-end integration tests:

```bash
# Run all unit tests (19 test suites, 124 tests)
npm test

# Run all E2E integration tests (9 test suites, 90 tests)
npm run test:e2e

# Run test coverage analysis (Target: 70–85%)
npm run test:cov

# Run linter
npm run lint
```

### Coverage Highlights (`npm run test:cov`)
- **Total Automated Tests:** 214 tests passing across 28 test suites (100% green)
- **Statement Coverage:** 74.15%
- **Line Coverage:** 73.23%
- **Function Coverage:** 83.94%

---

## 📬 Postman Collection & Environment

A complete Postman test suite is provided in the [`postman/`](file:///mnt/sda3/projects/Appifydevs/postman/) directory:

1. **Import Files into Postman:**
   - [EchoGPT_Backend.postman_collection.json](file:///mnt/sda3/projects/Appifydevs/postman/EchoGPT_Backend.postman_collection.json) (30+ requests covering all 8 modules)
   - [EchoGPT_Local.postman_environment.json](file:///mnt/sda3/projects/Appifydevs/postman/EchoGPT_Local.postman_environment.json) (Pre-configured `baseUrl`, credentials, and token variables)

2. **Automated Token Management:**
   - Logging in via `02 - Authentication > Login User` automatically extracts `accessToken` and `refreshToken` and saves them to your Postman environment.
   - Logging in via `02 - Authentication > Login Admin` automatically extracts and sets `adminToken`.
   - All subsequent requests automatically inherit credentials without manual copy-pasting.

---


## 📚 API Endpoints Summary

| Module | Method | Endpoint | Description | Auth |
|---|---|---|---|---|
| **System** | `GET` | `/health` | System health and uptime | Public |
| **Auth** | `POST` | `/api/auth/register` | Register new account with FREE tier | Public |
| **Auth** | `POST` | `/api/auth/login` | Login and receive dual JWT tokens | Public |
| **Auth** | `POST` | `/api/auth/refresh` | Refresh access token (rotates token) | Refresh JWT |
| **Auth** | `POST` | `/api/auth/logout` | Invalidate active refresh token | JWT Bearer |
| **Users** | `GET` | `/api/users/profile` | Get current user profile & subscription tier | JWT Bearer |
| **Users** | `PATCH` | `/api/users/profile` | Update user first & last name | JWT Bearer |
| **Users** | `PATCH` | `/api/users/change-password` | Change password (revokes old sessions) | JWT Bearer |
| **Users** | `DELETE`| `/api/users/account` | Deactivate account and revoke sessions | JWT Bearer |
| **Users** | `GET` | `/api/users/admin-only-test` | RBAC test route (403 for User, 200 for Admin) | Admin Bearer |
| **Subscription** | `GET` | `/api/subscription/status` | Current tier & remaining quota | JWT Bearer |
| **Subscription** | `POST`| `/api/subscription/upgrade` | Upgrade subscription to PREMIUM (500 req/day) | JWT Bearer |
| **Subscription** | `POST`| `/api/subscription/downgrade`| Downgrade subscription to FREE (20 req/day) | JWT Bearer |
| **Subscription** | `GET` | `/api/subscription/remaining-requests` | Get remaining daily query count | JWT Bearer |
| **AI Providers**| `GET` | `/api/providers` | List available AI providers (keys sanitized) | JWT Bearer |
| **AI Providers**| `GET` | `/api/providers/:id` | Get specific provider configuration | JWT Bearer |
| **AI Providers**| `POST` | `/api/providers` | Configure new provider (AES-256 encrypted key) | Admin Bearer |
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

*(Explore full schema and interactive test sandbox at `http://localhost:3000/api/docs`)*

---

## 📖 Project Documentation
- [CHECKLIST.md](file:///mnt/sda3/projects/Appifydevs/CHECKLIST.md): Phase progress tracking.
- [DEVELOPMENT_GUIDE.md](file:///mnt/sda3/projects/Appifydevs/DEVELOPMENT_GUIDE.md): Architecture decisions, security details, and problem-solving logs.
- [echogpt-backend-buildplan.md](file:///mnt/sda3/projects/Appifydevs/echogpt-backend-buildplan.md): Assignment specification and build playbook.

