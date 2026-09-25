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
- **Subscription & Quota Management:** Free vs. Premium tiers with remaining request tracking and strict rate limiting.
- **Interactive OpenAPI Documentation:** Full Swagger UI available at `/api/docs` with Bearer auth support and request/response schemas.

---

## 🛠 Tech Stack

- **Framework:** NestJS 10 (TypeScript)
- **Database & ORM:** PostgreSQL 16 & Prisma 6 ORM
- **API Documentation:** Swagger / OpenAPI (`@nestjs/swagger`)
- **Authentication:** Passport JWT, Bcrypt password hashing
- **Security & Validation:** `class-validator`, `helmet`, `@nestjs/throttler`, AES-256 encryption (`crypto`)
- **Containerization:** Docker & Docker Compose / Podman
- **Testing:** Jest (Unit) & Supertest (E2E)

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

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Run test coverage
npm run test:cov
```

---

## 📚 API Endpoints Summary

| Module | Method | Endpoint | Description | Auth |
|---|---|---|---|---|
| **System** | `GET` | `/health` | System health and uptime | Public |
| **Auth** | `POST` | `/api/auth/register` | Register new account | Public |
| **Auth** | `POST` | `/api/auth/login` | Login and receive access/refresh tokens | Public |
| **Auth** | `POST` | `/api/auth/refresh` | Refresh access token (rotates token) | Refresh JWT |
| **Auth** | `POST` | `/api/auth/logout` | Invalidate active refresh token | JWT |
| **Users** | `GET` | `/api/users/profile` | Get current user profile | JWT |
| **Users** | `PATCH` | `/api/users/profile` | Update profile details | JWT |
| **Users** | `PATCH` | `/api/users/change-password` | Change user password | JWT |
| **Subscription** | `GET` | `/api/subscription/status` | Current tier & remaining quota | JWT |
| **AI Providers**| `GET` | `/api/providers` | List available AI providers | JWT |
| **AI Providers**| `POST` | `/api/admin/providers` | Add/configure provider (Encrypted API key) | Admin |
| **Chat** | `POST` | `/api/chat/send-prompt` | Execute prompt through selected AI provider | JWT |
| **Chat** | `GET` | `/api/chat/history` | Retrieve conversation history | JWT |
| **Search** | `POST` | `/api/search` | AI-assisted web search | JWT |
| **Admin** | `GET` | `/api/admin/dashboard` | Dashboard metrics & system stats | Admin |

*(Explore full schema and interactive test sandbox at `http://localhost:3000/api/docs`)*

---

## 📖 Project Documentation
- [CHECKLIST.md](file:///mnt/sda3/projects/Appifydevs/CHECKLIST.md): Phase progress tracking.
- [DEVELOPMENT_GUIDE.md](file:///mnt/sda3/projects/Appifydevs/DEVELOPMENT_GUIDE.md): Architecture decisions, security details, and problem-solving logs.
- [echogpt-backend-buildplan.md](file:///mnt/sda3/projects/Appifydevs/echogpt-backend-buildplan.md): Assignment specification and build playbook.
