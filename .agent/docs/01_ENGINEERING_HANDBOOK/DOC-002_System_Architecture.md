# [DOC-002] System Architecture & Infrastructure Design

This is Document 2 of 6. This document is the "Map" for the project. It tells developers (and AI agents) exactly where to create files and how the pieces connect.

## Metadata

| Details | Value |
| :--- | :--- |
| **Project** | Project Titan |
| **Version** | 1.0.0 |
| **Last Updated** | December 30, 2025 |
| **Dependencies** | Requires [DOC-001] (Tech Stack) |

---

## 1. The Monorepo Structure (Nx)

We use a Domain-Driven Design (DDD) approach within the Nx workspace. This prevents the "Spaghetti Code" problem where everything interacts with everything.

> [!IMPORTANT]
> **Golden Rule for AI Agents:**
> *   **Apps (`apps/`):** Only contain configuration, routing setup, and the entry point. Zero business logic.
> *   **Libraries (`libs/`):** Contain 100% of the logic, UI, and data access.

### Directory Map

```plaintext
/
├── .husky/                 # Git Hooks (Pre-commit validation)
├── .vscode/                # Shared Editor Settings (Crucial for AI context)
├── apps/
│   ├── titan/              # PRODUCT: TITAN
│   │   ├── web/            # Next.js/React Host App
│   │   │   ├── src/        # Entry point, Global Styles, Providers
│   │   │   └── ...
│   │   ├── api/            # NestJS Host App
│   │   │   ├── src/        # AppModule (Imports libs)
│   │   │   └── ...
│   │   └── web-e2e/        # Playwright E2E Tests
│   │
│   └── (future-product)/   # Ready for expansion
│
├── libs/
│   ├── shared/             # GLOBAL (Used by Titan & Future Products)
│   │   ├── ui/             # Design System (ShadCN)
│   │   │   ├── button/     # Individual Library per component (Optional) or grouped
│   │   │   └── ...
│   │   └── util/           # i18n, Date Helpers
│   │
│   └── titan/              # TITAN SPECIFIC DOMAINS
│       ├── auth/           # Domain: Authentication
│       │   ├── feat-login/ # (Lib) The Login Page Component
│       │   ├── data-access/# (Lib) API Services & State
│       │   └── util/       # (Lib) Auth Guards
│       │
│       └── training/       # Domain: Training (MVP Core)
│           ├── feat-shell/ # (Lib) Training Router
│           ├── feat-list/  # (Lib) Session List Page
│           ├── domain/     # (Lib) Types & Compliance Logic
│           └── api/        # (Lib) Backend Controllers & Services
│
└── tools/                  # Generators & Database Scripts
└── docker-compose.yml      # Local Infrastructure
```

---

## 2. Module Boundaries & Data Flow

To ensure the "Suite" capability, we enforce strict boundaries.

### A. The Dependency Rule
*   `libs/training` cannot import from `libs/incidents` (Future).
*   `libs/training` can import from `libs/shared`.
*   `apps/titan-web` can import everything (it stitches them together).

### B. The Data Pipeline (Request Lifecycle)
1.  **Frontend:** User clicks "Verify".
2.  **State:** TanStack Query (in `libs/training/data-access`) triggers an API call.
3.  **API Route:** `apps/titan-api` receives `POST /api/training/verify`.
4.  **Guard:** `AuthGuard` (in `libs/auth`) checks the JWT token.
5.  **Controller:** Passes data to `TrainingService` (in `libs/training/domain`).
6.  **Validation:** Zod Pipe validates the inputs.
7.  **Database:** Prisma writes to PostgreSQL.
8.  **Audit:** `AuditService` writes a separate log entry in the same transaction.

### C. Testing Strategy (Co-location)
AI Agents and Developers must strictly follow this placement:
*   **Unit Tests (`.spec.ts`):** Must be placed adjacent to the source file in `libs/`.
    *   *Correct:* `libs/.../user-card.tsx` & `libs/.../user-card.spec.tsx`
    *   *Incorrect:* `libs/.../__tests__/user-card.spec.tsx`
*   **E2E Tests:** Placed in `apps/titan/web-e2e`.

---

## 3. The "App Shell" & Routing Strategy

We use TanStack Router for Type-Safe routing.

### The Shell (`apps/titan-web`):
*   Loads the Sidebar (Navigation).
*   Checks "Is User Logged In?".
*   Defines the Top-Level Routes:
    *   `/` -> Redirect to Dashboard.
    *   `/training/*` -> Lazy Loads `libs/training/feat-shell`.

### The Feature Shell (`libs/training/feat-shell`):
*   Defines sub-routes:
    *   `/` (Dashboard)
    *   `/sessions` (List)
    *   `/sessions/$sessionId` (Detail)

> [!NOTE]
> **Why this matters:** When we add the "Safety" module later, we just add `/safety/*` to the App Shell. The Training code remains untouched.

---

## 4. Infrastructure (Local Development)

Since we are avoiding Cloud costs for now, we run the entire "Server Room" on your laptop using Docker Compose.

**File:** `docker-compose.yml`

| Service | Image | Internal Port | External Port | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **db** | `postgres:16-alpine` | 5432 | 5432 | Primary Database. |
| **redis** | `redis:alpine` | 6379 | 6379 | Job Queues (Emails). |
| **minio** | `minio/minio` | 9000 | 9000 | Fake S3. Stores PDFs locally. |
| **createbuckets** | `minio/mc` | - | - | Script to auto-create the `titan-files` bucket on startup. |

### Environment Variables (`.env`)
The AI must ensure these match the Docker settings.

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/titan_db?schema=public"

# Storage (MinIO Local)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="titan-files"

# App
JWT_SECRET="super_secure_local_secret"
NODE_ENV="development"
```

---

## 5. Deployment Strategy (Future Proofing)

While we are local-first, the architecture is "Cloud Ready":
*   **Containerization:** The `apps/titan-api` compiles into a single Docker image.
*   **Storage Swapping:** When moving to production, we simply change `S3_ENDPOINT` from localhost to `s3.amazonaws.com`. No code changes required.
*   **Database Migration:** Prisma Migrations (`prisma migrate deploy`) manage the schema changes automatically.
