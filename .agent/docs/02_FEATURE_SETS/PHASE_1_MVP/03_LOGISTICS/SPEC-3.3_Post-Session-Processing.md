# [SPEC-3.3] Post-Session Processing

## Metadata

| Details | Value |
| :--- | :--- |
| **Module** | 3.0 Training Session Management |
| **Owner** | Frank (HSE Supervisor) |
| **Tech Stack** | NestJS, Prisma, Zod, Multer |
| **Status** | APPROVED FOR BUILD |

---

## 1. Context & Scope

This module handles the conversion of a physical event into digital legal records.

### Key Logic Decisions
*   **The Finalize Gate:** Records are not created real-time. The session must be explicitly "Finalized" by the Admin. This atomic transaction prevents partial data or "fat finger" errors.
*   **Result Tracking:** We track `PASSED` vs `FAILED`.
    *   **PASSED:** Updates Compliance Status to Green.
    *   **FAILED:** Stored for liability proof ("We tried to train him") but does not grant compliance.
*   **Evidence Inheritance:** One "Session Attendance Sheet" is uploaded to the Session, and all generated Records link back to this single file key.
*   **Competency Branching:** If the Course requires verification, the system automatically creates a `CompetencyRecord` (Pending) instead of a final `TrainingRecord`.

---

## 2. Database Schema (Prisma)

> [!TIP]
> **Agent Instruction:** Implement in `libs/titan/session/domain/src/lib/prisma.schema`.

```prisma
// 1. Update Session Model to hold the Master File
model Session {
  // ... existing fields ...
  attendanceFileKey  String?   @map("attendance_file_key")
  attendanceFileHash String?   @map("attendance_file_hash") // SHA-256
  
  finalizedAt        DateTime? @map("finalized_at") // The Lock Timestamp
}

// 2. Update SessionAttendee to support Scoring
model SessionAttendee {
  // ... existing fields ...
  isPresent  Boolean  @default(false) @map("is_present")
  hasPassed  Boolean  @default(true)  @map("has_passed") // Default true, toggle to false
  remarks    String?
}

// 3. Update TrainingRecord (Module 2.2) to support Result Status
enum RecordResult {
  PASSED
  FAILED
}

model TrainingRecord {
  // ... existing fields ...
  result          RecordResult @default(PASSED)
  sessionId       String?      @map("session_id") // Link back to source
  
  // Note: evidenceFileKey in this table will point to the Session's file key
}
```

---

## 3. Data Validation (Zod Schemas)

> [!TIP]
> **Agent Instruction:** Place in `libs/titan/session/domain/src/lib/schemas/attendance.schema.ts`.

```typescript
import { z } from 'zod';

// Bulk Update for the Grid View
export const UpdateAttendanceSchema = z.object({
  attendees: z.array(z.object({
    personnelId: z.string().cuid(),
    isPresent: z.boolean(),
    hasPassed: z.boolean(),
    remarks: z.string().optional(),
  })),
});

export type UpdateAttendanceDto = z.infer<typeof UpdateAttendanceSchema>;
```

---

## 4. API Endpoints & Logic

**Base URL:** `/api/v1/training/sessions`

### A. Upload Attendance Sheet
*   **Method:** `POST /:sessionId/evidence`
*   **Content:** Multipart File (PDF/Image).
*   **Logic:**
    1.  Check `status != CANCELLED`.
    2.  Upload to S3.
    3.  Calculate **SHA-256 Hash**.
    4.  Update Session with `attendanceFileKey` and hash.
*   **Note:** Do NOT create records yet.

### B. Save Attendance (Draft Mode)
*   **Method:** `PATCH /:sessionId/attendance`
*   **Body:** `UpdateAttendanceDto`
*   **Logic:** Updates the `SessionAttendee` rows. Allows saving partial work.

### C. Finalize Session (The Transaction Gate)
*   **Method:** `POST /:sessionId/finalize`
*   **Logic:**
    1.  **Validation:**
        *   Is `attendanceFileKey` present? If no -> `400 Bad Request` ("Evidence Missing").
        *   Is session already finalized? If yes -> `409 Conflict`.
    2.  **The Atomic Transaction:**
        *   Loop through all `SessionAttendees` where `isPresent == true`.
        *   **Condition:** Does `Course.requiresVerify == true`?
            *   **YES:** Create `CompetencyRecord` (Status: `PENDING_VERIFICATION`).
            *   **NO:** Create `TrainingRecord` (Status: `PASSED` or `FAILED` based on input).
            *   `expiryDate` = Calculated from Course Validity.
            *   `evidenceFileKey` = Copies `Session.attendanceFileKey`.
        *   **Update Session:** Set `status = COMPLETED`, `finalizedAt = NOW()`.
        *   **Trigger:** Fire "Compliance Recalculation" (Module 2.3) for all attendees.

---

## 5. Agent Implementation Tips

*   **The "Undo" Safety Net:** While we want this to be rigid, Admins make mistakes. If an Admin needs to "Un-Finalize", they must delete the created records manually. Do not build an "Un-Finalize" button for the MVP.
*   **Frontend UX:**
    *   The "Finalize" button should be **Disabled** until a file is uploaded.
    *   Use a confirmation modal: "This will generate X Training Records. This action cannot be undone."
