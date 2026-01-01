# [DOC-003] Database Standards & Data Governance

## Metadata

| Details | Value |
| :--- | :--- |
| **Project** | Project Titan |
| **Version** | 2.1.0 (Single-Tenant + High Integrity) |
| **Status** | APPROVED |

---

## 1. Core Philosophy

**"Physical Isolation, Rigid Integrity."**

The database acts as the final gatekeeper of validity. We rely on Database-Level Constraints over code validation.

*   **Architecture:** Single-Tenant (One Database per Organization).
*   **Source of Truth:** If the data exists in the DB, it is legally binding.

---

## 2. Naming Conventions (Strict)

AI Agents must strictly follow these Prisma naming patterns.

| Object | Convention | Example |
| :--- | :--- | :--- |
| **Table Names** | `snake_case` (Plural) | `training_sessions`, `personnel`, `audit_logs` |
| **Column Names** | `snake_case` | `is_active`, `badge_id`, `job_title` |
| **Primary Keys** | `id` (String, CUID2) | `@id @default(cuid())` |
| **Foreign Keys** | `noun_id` | `personnel_id`, `session_id` |
| **Timestamps** | `created_at`, `updated_at` | Standard auto-managed columns. |

---

## 3. The "Audit-Proof" Data Architecture

### A. The "Never Delete" Rule (Soft Deletes)

> [!IMPORTANT]
> **Rule:** `DELETE` operations are strictly forbidden on core business data (Personnel, Sessions, Records).

*   **Mechanism:** All tables must have a `deleted_at` (`DateTime`, Nullable) column.
*   **Prisma Middleware:** We will configure Prisma to intercept delete calls and convert them to `update({ deletedAt: new Date() })`.
*   **Exception:** Rows in "Draft" status (e.g., a session being built) can be hard-deleted before they are finalized.

### B. The Audit Log (Immutable History)

*   **Table:** `audit_logs`
*   **Trigger:** Service-Layer interception (Interceptor Pattern).

**Schema:**

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  actorId     String   @map("actor_id") // The Supervisor's User ID
  entityType  String   @map("entity_type") // e.g., "TrainingRecord"
  entityId    String   @map("entity_id")
  action      String   // "VERIFY", "REVOKE", "UPDATE", "OVERRIDE"
  diff        Json     // { "old": {"expiry": "2024-01-01"}, "new": {"expiry": "2025-01-01"} }
  reason      String?  // Optional: Why was this change made? (Crucial for overrides)
  ipAddress   String?  @map("ip_address")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("audit_logs")
}
```

---

## 4. Internationalization (i18n) Data

We use `JSONB` to store multilingual names directly on the record to avoid complex join tables.

**Schema:**

```prisma
model Competency {
  id    String @id @default(cuid())
  title Json   // { "en": "Rigger", "tr": "Halatçı" }
}
```

---

## 5. Complex Data Handling

### A. Dynamic Assessments (JSONB)
*   **Table:** `assessment_templates` (The structure).
*   **Table:** `training_records` (The answers).
*   **`assessment_result` (Json):** Stores the actual answers provided.

### B. Evidence Storage (Integrity Hashing)
We store Signed References and Integrity Hashes.

*   **Table:** `training_sessions`
*   **Column:** `attendance_sheet_key` (`String`) -> S3 Key.
*   **Column:** `attendance_sheet_hash` (`String`) -> MD5/SHA-256 Hash.
*   **Column:** `attendance_sheet_status` (`Enum`) -> `PENDING_UPLOAD | PROCESSING | VERIFIED`.

> [!NOTE]
> **Why:** If a file is downloaded and modified, the hash won't match. This proves the file in the bucket is the exact original.

---

## 6. Migration & Deployment Policy

*   **Tool:** `prisma migrate dev` (Development) / `prisma migrate deploy` (Production).

> [!WARNING]
> *   **Rule 1:** Never manually edit the SQL files inside the `prisma/migrations` folder.
> *   **Rule 2:** All migrations must be deterministic.

*   **Seeding:** The `seed.ts` file must be idempotent (running it twice shouldn't break the DB). It populates:
    1.  The initial Super Admin.
    2.  Standard Industrial Roles.
    3.  Default System Configs (e.g., Warning Period = 30 days).
