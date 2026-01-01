Here is the fully refined, Agent-Ready Feature Specification for Module 2.3.
I have optimized the logic to handle the "Stacking" of requirements and the "Grace Period" edge cases precisely as discussed.

# [SPEC-2.3] The Compliance Engine

## Metadata

| Details | Value |
| :--- | :--- |
| **Module** | 2.0 Personnel & Compliance |
| **Owner** | Frank (HSE Supervisor) |
| **Tech Stack** | NestJS, Prisma, BullMQ (Redis) |
| **Status** | APPROVED FOR BUILD |

---

## 1. Context & Scope

The Compliance Engine is the logic processor that determines if a worker is safe to work.

### Key Architectural Decisions
*   **Hybrid Architecture:** We use Event-Driven Recalculation for immediate feedback (e.g., after upload) and Scheduled Scanning (Cron) to catch natural expirations.
*   **Snapshot Storage:** Results are stored in a dedicated `ComplianceItem` table and a cached flag on the `Personnel` record. This guarantees the dashboard loads in $<60$ seconds, as it never performs calculations on read-time.
*   **"Worst Case" Aggregation:** A worker is only Green if every single mandatory requirement is satisfied. A single critical gap makes the entire profile Red.

---

## 2. Database Schema (Prisma)

> [!TIP]
> **Agent Instruction:** Implement in `libs/titan/compliance/domain/src/lib/prisma.schema`.

```prisma
// The Traffic Light System
enum ComplianceStatus {
  COMPLIANT        // Green: Requirement met or valid record exists
  PENDING          // Yellow: Post-Mob requirement within Grace Period (Warning)
  NON_COMPLIANT    // Red: Missing Mandatory (Pre-Mob) or Expired or Grace Period exceeded
}

// 1. Extend the Personnel Model (from Module 2.1)
// We add a Cached Status for O(1) Dashboard filtering
model Personnel {
  // ... existing fields ...
  complianceStatus ComplianceStatus @default(COMPLIANT) @map("compliance_status")
}

// 2. The Granular Snapshot (One row per requirement per person)
// This answers "Why is Frank Red?" without re-running logic.
model ComplianceItem {
  id              String   @id @default(cuid())

  personnelId     String   @map("personnel_id")
  personnel       Personnel @relation(fields: [personnelId], references: [id], onDelete: CASCADE)

  courseId        String   @map("course_id")
  course          Course   @relation(fields: [courseId], references: [id])

  // The "Why" (Traceability)
  requirementType RequirementType // PRE_MOB, POST_MOB
  gracePeriodDays Int?            @map("grace_period_days")
  dueDate         DateTime?       // The rigid deadline (AssignedAt + Grace)

  // The Status
  status          ComplianceStatus
  expiryDate      DateTime?       // From the linked TrainingRecord (if exists)

  updatedAt       DateTime @updatedAt @map("updated_at")

  @@unique([personnelId, courseId]) // Ensures one status per course per person
  @@map("compliance_items")
}
```

---

## 3. Business Logic (The Algorithm)

> [!IMPORTANT]
> **Agent Instruction:** Implement this exact logic in `ComplianceService.calculateOne(personnelId)`.

### Step 1: Resolve Requirements ("Stacking" Logic)
The engine must determine the strictest rule for each course.
1.  **Fetch Sources:**
    *   Get `RoleRequirements` for the user's `roleId`.
    *   Get `AreaRequirements` for all the user's assigned areas (including inherited parents).
2.  **Merge & Dedup:**
    *   Create a Map: `Map<CourseId, RequirementConfig>`.
    *   **Conflict Rule:** If a Course appears in both Role and Area:
        *   If either source says `MANDATORY_PRE_MOB`, the result is `PRE_MOB` (**Strictest Wins**).
        *   If both are `POST_MOB`, use the shortest `gracePeriodDays`.

### Step 2: Fetch Evidence
1.  Query `TrainingRecord` for this `personnelId`.
2.  **Filter:** `where: { expiryDate: { gte: now() } OR null }`. (Only valid records).

### Step 3: Evaluate Item Status (The Decision Matrix)

| Requirement Type | Valid Record Exists? | Grace Period Condition | Resulting Status |
| :--- | :--- | :--- | :--- |
| Any | Yes | N/A | **COMPLIANT (Green)** |
| `PRE_MOB` | No | N/A | **NON_COMPLIANT (Red)** |
| `POST_MOB` | No | `Now <= DueDate` | **PENDING (Yellow)** |
| `POST_MOB` | No | `Now > DueDate` | **NON_COMPLIANT (Red)** |

### Step 4: Aggregate & Save
1.  **Save Items:** Upsert `ComplianceItem` rows for each course.
2.  **Calculate Overall:**
    *   If `count(Red Items) > 0` $\to$ `NON_COMPLIANT`.
    *   Else If `count(Yellow Items) > 0` $\to$ `PENDING`.
    *   Else $\to$ `COMPLIANT`.
3.  **Update Personnel:** `prisma.personnel.update({ data: { complianceStatus: result } })`.

---

## 4. Trigger Architecture

### A. Event-Driven (Real-Time Updates)
The backend must trigger `calculateOne(personnelId)` immediately when:
*   **Evidence Uploaded:** A new `TrainingRecord` is created.
*   **Role Changed:** Admin changes a user's Role.
*   **Area Assigned:** Admin adds user to a new Zone.
*   **Record Revoked:** Supervisor deletes a record.

### B. Time-Driven (The "Midnight" Job)
*   **Process:** BullMQ Cron Job (00:01 AM).
*   **Query:**
    1.  Find `TrainingRecords` that expired yesterday.
    2.  Find `ComplianceItems` (Yellow) where `dueDate` passed yesterday.
*   **Action:** Trigger `calculateOne(id)` only for the affected users. This keeps the system efficient.

---

## 5. API Endpoints

**Base URL:** `/api/v1/compliance`

### A. Get User Compliance Matrix
*   **Method:** `GET /:personnelId`
*   **Response:**
```json
{
  "overallStatus": "NON_COMPLIANT",
  "items": [
    {
      "courseTitle": "H2S Awareness",
      "status": "NON_COMPLIANT",
      "reason": "Expired 2 days ago"
    },
    {
      "courseTitle": "Working at Heights",
      "status": "PENDING",
      "reason": "Due in 15 days"
    }
  ]
}
```

### B. Project Health Stats
*   **Method:** `GET /stats`
*   **Logic:** `SELECT compliance_status, COUNT(*) FROM personnel GROUP BY compliance_status`.
*   **Performance:** Extremely fast ($O(1)$) because we are querying the cached column, not calculating on the fly.
