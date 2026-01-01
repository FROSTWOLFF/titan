# [DOC-001] Technology Stack Manifest

This is Document 1 of 6 in the Project Titan Engineering Handbook.

## Metadata

| Details | Value |
| :--- | :--- |
| **Project** | Project Titan (Safety Training & Compliance Suite) |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Last Updated** | December 30, 2025 |
| **Target Audience** | Engineering Leads, Backend Developers, Frontend Developers, DevOps |

---

## 1. Executive Summary

This document defines the mandatory technology choices for Project Titan. These choices are optimized for Type Safety, Auditability, Modular Scalability, and Developer Velocity. Deviations from this stack require a written Request for Comment (RFC) and approval from the Lead System Architect.

> [!IMPORTANT]
> **Core Philosophy:** "Strictness creates Speed."  
> We rely on strong typing and rigid architectural patterns (Nx, NestJS) to prevent errors before they reach production.

---

## 2. The Core Monorepo Strategy

We will utilize a Modular Monolith structure to support the "Suite" vision (Training, Safety, Incidents).

| Category | Technology | Rationale / Constraint |
| :--- | :--- | :--- |
| **Workspace Tool** | Nx (Latest Stable) | Provides shared libraries, strict module boundaries, and computation caching. |
| **Package Manager** | `pnpm` | Faster installation and strict dependency management compared to npm/yarn. |
| **Language** | TypeScript 5.x | **Constraint:** Strict Mode Enabled (`noImplicitAny` must be true). |

---

## 3. Frontend Architecture (The App Shell)

**Location:** `apps/titan-web` & `libs/feat-*`

| Category | Technology | Version / Note |
| :--- | :--- | :--- |
| **Framework** | React | v18+ (Functional Components only) |
| **Build Tool** | Vite | Optimized for speed and HMR. |
| **Routing** | TanStack Router | **CRITICAL:** Must use file-based routing with generated types. No `react-router-dom`. |
| **State & Async** | TanStack Query | (React Query v5). Handles all server state, caching, and invalidation. |
| **Global State** | Zustand | Only for client-only state (e.g., Sidebar open/close). Avoid complex global stores. |
| **Form Handling** | React Hook Form | Coupled with Zod for validation schema. |
| **UI Library** | ShadCN UI | Built on top of Radix Primitives. |
| **Styling** | Tailwind CSS | Utility-first. No CSS-in-JS libraries (e.g., `styled-components`) allowed. |
| **i18n** | i18next | `react-i18next` for UI strings. `i18next-browser-languagedetector` for auto-detect. |

---

## 4. Backend Architecture (The Compliance Engine)

**Location:** `apps/titan-api` & `libs/api-*`

| Category | Technology | Version / Note |
| :--- | :--- | :--- |
| **Framework** | NestJS | Standard Express adapter. Use standard Modules/Controllers/Services pattern. |
| **ORM** | Prisma | Schema-first. Generates strict types for the DB. |
| **Validation** | Zod | Unified with Frontend. We share Zod schemas via an Nx Shared Library. |
| **File Handling** | Multer | Streaming uploads. |
| **PDF Processing** | `pdf-lib` | For server-side validation or merging of attendance sheets. |
| **Job Queue** | BullMQ | (Redis backed) For background tasks like generating bulk reports or email digests. |

---

## 5. Data & Storage Layer (The Vault)

| Category | Technology | Configuration Notes |
| :--- | :--- | :--- |
| **Primary Database** | PostgreSQL 16 | **Mandatory:** Row-Level Security (RLS) enabled. JSONB used for Dynamic Questionnaires and Translations. |
| **Object Storage** | S3 Compatible | AWS S3 (Production) / MinIO (Local/On-Prem). Buckets must be private by default. |
| **Caching** | Redis | Used for session management and BullMQ job queues. |

---

## 6. Infrastructure & DevOps

| Category | Technology | Details |
| :--- | :--- | :--- |
| **Containerization** | Docker | Multi-stage builds for minimal image size. |
| **Orchestration** | Docker Compose | For local development (spins up Postgres, Redis, MinIO, API). |
| **CI/CD** | Local Verification | Mandatory execution of lint, test, and build cycles before commit/push. |
| **Verification Gate** | Husky / lint-staged | (Recommended) Automated local checks to prevent non-compliant code from being committed. |
| **Linting/Formatting** | ESLint / Prettier | Standardized local formatting and static analysis. |

---

## 7. Forbidden Technologies (The "Do Not Use" List)

> [!WARNING]
> **Deviations will be rejected in Code Review:**
> *   **Redux / Redux Toolkit:** We use TanStack Query. Global state should be minimal.
> *   **Moment.js:** Use `date-fns` or native Intl API. Moment is too heavy/deprecated.
> *   **Bootstrap / Material UI:** We are strictly ShadCN + Tailwind.
> *   **TypeORM:** We are standardized on Prisma for this project to ensure Type Safety across the stack.


