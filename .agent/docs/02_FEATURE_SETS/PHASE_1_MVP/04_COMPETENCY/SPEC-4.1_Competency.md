# [SPEC-4.1] Competency Verification

## Metadata

| Details | Value |
| :--- | :--- |
| **Module** | 4.0 Competency Verification |
| **Owner** | Frank (HSE Supervisor) |
| **Tech Stack** | NestJS, Prisma, Zod |
| **Status** | APPROVED FOR BUILD |

---

## 1. Context & Scope

This module manages the practical assessment phase that follows theoretical training.

### Key Logic Decisions
*   **Global Assessment Library:** Assessment methods (e.g., "Simulator", "Live Observation") are managed as a dynamic global library, not hard-linked to courses. This prevents operational blocks when conditions change.
*   **Rich Context:** Every verification action supports a `remarks` field to capture specific details of success or reasons for failure ("Audit Context").
*   **Liability Tracking:** A `NOT_COMPETENT` outcome does not delete the record; it saves it as a "Failed Attempt" history log to prove due diligence.
*   **Integrated Workflow:** The schema supports both "Fast Track" (verified immediately during training) and "Slow Track" (verified later via Dashboard).

---

## 2. Database Schema (Prisma)

> [!TIP]
> **Agent Instruction:** Implement in `libs/titan/competency/domain/src/lib/prisma.schema`.

```prisma
// The Dynamic Library (Admin Managed)
// Examples: "Practical Assessment", "VR Simulator", "Verbal Q&A"
model AssessmentMethod {
  id        String   @id @default(cuid())
  name      String   @unique
  isActive  Boolean  @default(true) @map("is_active")

  // Relations
  competencyRecords CompetencyRecord[]

  @@map("assessment_methods")
}

enum CompetencyStatus {
  PENDING_VERIFICATION // Default for high-risk courses after training
  COMPETENT            // Green: Approved
  NOT_COMPETENT        // Red: Failed the practical
}

// The Verification Record (1-to-1 with Training Record)
model CompetencyRecord {
  id              String           @id @default(cuid())
  
  // Link to the Theory Record
  trainingRecordId String          @unique @map("training_record_id")
  trainingRecord   TrainingRecord  @relation(fields: [trainingRecordId], references: [id], onDelete: CASCADE)
  
  // State
  status          CompetencyStatus @default(PENDING_VERIFICATION)
  
  // The "Who, When, How"
  assessedById    String?          @map("assessed_by_id") // The Trainer/SME
  assessedBy      Personnel?       @relation(fields: [assessedById], references: [id])
  
  assessedAt      DateTime?        @map("assessed_at")
  
  methodId        String?          @map("method_id")
  method          AssessmentMethod? @relation(fields: [methodId], references: [id])
  
  // The Context
  remarks         String?          @db.Text // Critical for "Why failed?"
  
  // Optional Evidence Override
  // Usually null (inherits Session File). If set, this specific assessment has unique proof.
  evidenceFileKey String?          @map("evidence_file_key") 

  updatedAt       DateTime         @updatedAt @map("updated_at")

  @@map("competency_records")
}
```

---

## 3. Data Validation (Zod Schemas)

> [!TIP]
> **Agent Instruction:** Place in `libs/titan/competency/domain/src/lib/schemas/verification.schema.ts`.

```typescript
import { z } from 'zod';

// Schema for the "Verify" Action
export const VerifyCompetencySchema = z.object({
  status: z.enum(['COMPETENT', 'NOT_COMPETENT']),
  
  // Method is required if marking as COMPETENT
  methodId: z.string().cuid().optional().refine((val, ctx) => {
    // Custom check: if status is COMPETENT, methodId should exist
    // Implementation detail in Service layer usually easier, but Zod can handle basic structure
    return true; 
  }),

  assessedAt: z.string().datetime(), // ISO Date
  remarks: z.string().optional(), // Highly recommended for FAIL, optional for PASS
});

export type VerifyCompetencyDto = z.infer<typeof VerifyCompetencySchema>;

// Schema for Admin Management of Methods
export const CreateAssessmentMethodSchema = z.object({
  name: z.string().min(2).max(50),
});
```

---

## 4. API Endpoints & Logic

**Base URL:** `/api/v1/competency`

### A. Dashboard: List Pending Verifications
*   **Method:** `GET /pending`
*   **Query Params:** `page`, `limit`, `search` (Personnel Name).
*   **Filter Logic:**
    1.  Query `CompetencyRecord`.
    2.  Where `status == PENDING_VERIFICATION`.
    3.  Include `trainingRecord.personnel` and `trainingRecord.course`.
*   **Response:** A "To-Do List" for the HSE Team.

### B. Verify Single Record (The "Sign-Off")
*   **Method:** `PATCH /:recordId/verify`
*   **Body:** `VerifyCompetencyDto`
*   **Logic:**
    1.  **Validation:** Ensure `methodId` exists in the Library.
    2.  **Update:** Set `status`, `remarks`, `assessedBy` (Current User), `assessedAt`.
    3.  **Trigger:** Fire `ComplianceService.recalculate(personnelId)`.
        *   If `COMPETENT` $\to$ The "Pending" flag clears, user likely turns Green.
        *   If `NOT_COMPETENT` $\to$ User stays Red.

### C. Bulk Verify (The "Fast Track")
*   **Method:** `POST /bulk-verify`
*   **Body:** `{ recordIds: string[], data: VerifyCompetencyDto }`
*   **Logic:**
    1.  Iterate through `recordIds`.
    2.  Apply the same `methodId` and `remarks` (e.g., "Group Assessment - VR Simulator").
    3.  Trigger recalculation for all affected Personnel.

### D. Manage Methods (Admin Configuration)
*   **Method:** `POST /methods`
*   **Body:** `{ name: "Drone Observation" }`
*   **Logic:** Create new dynamic method. Accessible immediately in dropdowns.

---

## 5. Agent Implementation Tips

*   **Compliance Integration:**
    In Module 2.3 (Compliance Engine), you must update the logic:
    *   **Old Rule:** If `TrainingRecord` exists $\to$ Valid.
    *   **New Rule:** If `TrainingRecord` exists:
        1.  Check if `Course.requiresVerification == true`.
        2.  If Yes: Check linked `CompetencyRecord`.
        3.  If `status == COMPETENT` $\to$ Valid (Green).
        4.  Else $\to$ Invalid (Red/Blue).
*   **UX for Failure:**
    If a user selects `NOT_COMPETENT`, the Frontend should make the `remarks` field **Mandatory** (Red Border). We need to know why they failed for the audit trail.
