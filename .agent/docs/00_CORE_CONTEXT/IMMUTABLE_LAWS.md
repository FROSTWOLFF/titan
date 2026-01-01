# PROJECT TITAN: THE IMMUTABLE LAWS

## Metadata

| Details | Value |
| :--- | :--- |
| **Severity Level** | CRITICAL |
| **Scope** | Global (Backend, Frontend, Database, Operations) |

---

## 1. The Law of Evidence (The Audit Shield)

> [!CAUTION]
> **"If it isn't proven, it didn't happen."**

### Zero-Trust Creation
*   No `TrainingRecord` can be created, updated, or finalized without a linked **Evidence File Key** (S3 Path).
*   The database must reject any transaction where the file reference is `null` or empty.

### Immutable Integrity
*   Every uploaded file must be hashed (`SHA-256`) upon receipt. This hash is stored permanently.
*   The system must **never** overwrite an existing file key in a finalized record; it can only soft-delete and create a new one.

### Traceability
*   Every status change (`Green` $\to$ `Red`, `Red` $\to$ `Green`) must log the **User ID** of the person who triggered it.
*   Anonymous system actions are forbidden; if a cron job changes a status, it must log as `SYSTEM_AGENT`.

---

## 2. The Law of Compliance (The Traffic Light)

> [!CAUTION]
> **"Safety is binary. You are either safe, or you are not."**

### The "Worst-Case" Aggregation
*   A person's **Overall Status** is `RED` if **any single** Mandatory Requirement is invalid.
*   A person is only `GREEN` if **every** requirement is satisfied. There is no "99% Compliant."

### No Ghost Data
*   Compliance Status is a **Snapshot**, not a live calculation.
*   The Dashboard must read from a cached field (`personnel.compliance_status`).
*   This cache must be invalidated and re-computed immediately upon any relevant data change (Upload, Expiry, Role Change).

### Hard Expiry
*   A record expires at `00:00:01` on the Expiry Date.
*   There are **no** "Grace Periods" for expired certificates. Grace Periods apply **only** to "New Assignment" (Post-Mob) deadlines.

---

## 3. The Law of Logistics (The Physical Realm)

> [!CAUTION]
> **"You cannot train who isn't there, and you cannot teach what you don't know."**

### The Qualification Block
*   A `Trainer` cannot be assigned to a Session unless their profile explicitly links to that `CourseID`.
*   This is a hard database or service-level block. No overrides allowed.

### The Time-Space Continuum
*   The system must reject any Session creation if the Trainer is already booked in another `SCHEDULED` session during that time window.

### The Finalize Gate
*   Attendance and Results are mutable **only** while a Session is `DRAFT` or `SCHEDULED`.
*   Once the **"Finalize"** action is triggered:
    1.  The Session becomes `COMPLETED` (Locked).
    2.  Official `TrainingRecords` are generated.
    3.  No further changes are allowed. To fix an error, the Admin must delete the generated records manually (Data is never simply "edited" after finalization).

---

## 4. The Law of Verification (The Competency Gate)

> [!CAUTION]
> **"Theory is not Practice."**

### The Competency Hierarchies
*   If a Course is flagged `requires_verification = true`:
    *   A `TrainingRecord` (Theory) alone **NEVER** grants `Green` status.
    *   The user remains `RED` (or `Blue`/`Restricted`) until a linked `CompetencyRecord` exists with status `COMPETENT`.

### The Failure Record
*   A `NOT_COMPETENT` (Failed) assessment must **never** be deleted by the system.
*   It remains in history as proof of due diligence ("We tested him, he failed, we stopped him").