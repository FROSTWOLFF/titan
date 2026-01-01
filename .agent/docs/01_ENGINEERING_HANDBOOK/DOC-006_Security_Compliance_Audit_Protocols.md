# [DOC-006] Security, Compliance & Audit Protocols

This is Document 6 of 6. This document defines the "Shield" around the application. It details the security mechanisms, the file integrity logic, and the exact workflows required to satisfy an external auditor.

## Metadata

| Details | Value |
| :--- | :--- |
| **Project** | Project Titan |
| **Version** | 1.0.0 |
| **Last Updated** | December 31, 2025 |
| **Status** | APPROVED |

---

## 1. Authentication Strategy

Since we are Single-Tenant, we implement a robust JWT (JSON Web Token) strategy without external dependencies (like Auth0).

*   **Mechanism:** Access Token (15 min expiry) + Refresh Token (7 days expiry).
*   **Storage:**
    *   **Access Token:** In-Memory (React State) or `HttpOnly` Cookie (Preferred for security).
    *   **Refresh Token:** `HttpOnly`, `Secure` Cookie.
*   **Hashing:** Passwords must be hashed using **Argon2id** (Superior to bcrypt).

---

## 2. Role-Based Access Control (RBAC)

We enforce permissions at the Controller Level (Backend) using a Guard.

| Role | Permissions |
| :--- | :--- |
| **SUPER_ADMIN** | Full Access. Can configure System Settings (Warning Periods). Can manage Users. |
| **HSE_SUPERVISOR** | Manage Personnel, Create Sessions, View Reports, Override Records (with Audit Log). |
| **TRAINER** | View Assigned Sessions, Take Attendance, Upload Sheets. Cannot edit Personnel. |
| **ASSESSOR** | View "Pending Verification" tasks. Can mark Competency. Cannot edit Personnel. |

> [!CAUTION]
> **Agent Instruction:**
> Use the `@Roles('ADMIN')` decorator on every NestJS endpoint. Never leave an endpoint public unless it is `/login`.

---

## 3. File Integrity Protocol (The "Audit-Proof" Layer)

This is the most critical compliance feature. It ensures "Evidence" is tamper-proof.

### The Upload Workflow
1.  Trainer uploads `attendance.pdf` via the Frontend.
2.  Multer (Backend) receives the file stream.
3.  **Hashing:** The backend calculates the **SHA-256 Hash** of the file stream before upload.
4.  **Storage:** File is uploaded to S3/MinIO with a UUID filename (`session_123_uuid.pdf`).
5.  **Database Record:**
    *   `attendance_sheet_key`: `session_123_uuid.pdf`
    *   `attendance_sheet_hash`: `a1b2c3d4...` (The SHA-256 signature)

### The Audit/Verify Workflow
When an Auditor asks to see the proof:
1.  System downloads the file from S3.
2.  System recalculates the SHA-256 hash on the fly.
3.  **Comparison:** If `New Hash !== Stored Hash`, the system displays a **CRITICAL TAMPER WARNING**.

---

## 4. Competency Verification Workflow

This logic separates "Sitting in a chair" (Attendance) from "Knowing the job" (Competency).

### State Machine Logic

**Session Completion:**
1.  Trainer marks Attendee as `PRESENT`.
2.  **Condition:** Does this Course require verification?
    *   **No:** Status $\rightarrow$ `COMPETENT` (Expiry Timer Starts).
    *   **Yes:** Status $\rightarrow$ `PENDING_VERIFICATION`.

**The Assessment Phase:**
1.  Record appears in "Pending Assessments" Dashboard.
2.  Assessor opens record, reviews answers/evidence.
3.  **Action:** Assessor clicks "Verify".
4.  **Result:** Status $\rightarrow$ `COMPETENT`.
5.  **Audit Log:** Entry created: `User X verified Person Y for Course Z`.

---

## 5. Audit Logging Rules

We capture Risk-Relevant events. We do not log "User clicked a button." We log "Data changed state."

*   **Manual Override:** Supervisor manually changing a worker's status from `EXPIRED` to `COMPLIANT`. Reason is required.
*   **Record Revocation:** Removing a qualification (e.g., Worker failed a random drug test).
*   **Security Events:** Failed login attempts (>3), Role changes (User promoted to Admin).

---

## 6. Data Retention & "Right to be Forgotten"

> [!IMPORTANT]
> **Industrial Rule:** Safety records are usually kept for **Indefinite Term** (or 30+ years) due to liability lawsuits (e.g., Asbestos claims).

**GDPR/Privacy:** If a worker requests deletion:
1.  We **Anonymize** the PII (Name, ID) in the `Personnel` table.
2.  We **Keep** the `TrainingRecord` linked to the anonymized ID.

> [!NOTE]
> **Why:** We must prove "Someone" was trained on that date, even if we can't say who.
