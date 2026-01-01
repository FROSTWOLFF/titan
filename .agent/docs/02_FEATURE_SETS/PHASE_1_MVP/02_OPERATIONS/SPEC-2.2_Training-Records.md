# [SPEC-2.2] Training Record Management (The Ledger)

## Metadata

| Details | Value |
| :--- | :--- |
| **Module** | 2.0 Personnel & Compliance |
| **Owner** | Frank (HSE Supervisor) |
| **Tech Stack** | NestJS, Prisma, Zod, Multer (S3) |
| **Status** | APPROVED FOR BUILD |

---

## 1. Context & Scope

This module handles the creation and storage of "Training Records."

### Key Logic Decisions
*   **Evidence is Mandatory:** A record cannot exist without an associated proof file (PDF/Image).
*   **Document Sovereignty:** The system calculates a default Expiry Date, but the user can override it to match the physical certificate.
*   **Immediate Validity:** Records become "Active" (Green) immediately upon upload. There is no approval queue for MVP.
*   **Provider Validation:** External training providers must be selected from the approved Company Library to ensure data consistency.

---

## 2. Database Schema (Prisma)

> [!TIP]
> **Agent Instruction:** Implement in `libs/titan/training/domain/src/lib/prisma.schema`.

```prisma
// The core "Proof of Competence"
model TrainingRecord {
  id              String   @id @default(cuid())
  
  // Who (The Worker)
  personnelId     String   @map("personnel_id")
  personnel       Personnel @relation(fields: [personnelId], references: [id])
  
  // What (The Course)
  // We link to the Parent Course ID to ensure compliance matches regardless of version.
  courseId        String   @map("course_id")
  course          Course   @relation(fields: [courseId], references: [id])
  
  // Optional: If this came from a Titan Session, link the specific version
  courseVersionId String?  @map("course_version_id")
  
  // When
  completionDate  DateTime @map("completion_date")
  expiryDate      DateTime? @map("expiry_date") // Null = Permanent
  
  // Who Taught It (Provider)
  providerId      String   @map("provider_id") // Link to Company Library
  provider        Company  @relation(fields: [providerId], references: [id])
  
  // The Proof (Audit Shield)
  evidenceFileKey String   @map("evidence_file_key") // S3 Path (e.g. "records/2024/uuid.pdf")
  evidenceHash    String?  @map("evidence_hash")     // SHA-256 for integrity check 

  // Metadata
  comments        String?
  
  // Audit
  createdById     String   @map("created_by_id") // The Supervisor who uploaded it
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at") // Soft Delete (Revocation)

  @@map("training_records")
}
```

---

## 3. Data Validation (Zod Schemas)

> [!TIP]
> **Agent Instruction:** Place in `libs/titan/training/domain/src/lib/schemas/record.schema.ts`.

```typescript
import { z } from 'zod';

// Schema for the JSON metadata sent alongside the file
export const CreateRecordSchema = z.object({
  personnelId: z.string().cuid(),
  courseId: z.string().cuid(),
  providerId: z.string().cuid(),
  
  completionDate: z.string().datetime(), // ISO String
  
  // Optional Override. If missing, Backend calculates it.
  expiryDate: z.string().datetime().optional(), 
  
  comments: z.string().optional(),
});

export type CreateRecordDto = z.infer<typeof CreateRecordSchema>;
```

---

## 4. API Endpoints & Logic

**Base URL:** `/api/v1/training/records`

### A. Create Record (Manual Upload)
*   **Method:** `POST /`
*   **ContentType:** `multipart/form-data`
*   **Payload:**
    *   `file`: Binary (PDF/JPG/PNG). Max 5MB.
    *   `data`: JSON String matching `CreateRecordDto`.
*   **Logic:**
    1.  **File Check:** If file is missing -> `400 Bad Request` ("Proof is mandatory").
    2.  **Calculate Expiry:**
        *   If `expiryDate` is provided in DTO, use it (User Override).
        *   Else, fetch Course (via `courseId`). Look up the latest `CourseVersion`.
        *   If `validityMonths > 0`, `expiry = completionDate + validityMonths`.
        *   If `validityMonths == 0`, `expiry = null` (Permanent).
    3.  **Upload:** Stream file to S3/MinIO. Generate `evidenceFileKey`.
    4.  **Save:** Create `TrainingRecord` in DB.
    5.  **Trigger:** Fire "Compliance Recalculation" event for this user (Module 2.3).

### B. List Records (History)
*   **Method:** `GET /`
*   **Query Params:** `personnelId`, `courseId`, `expiringBefore` (Date).
*   **Response:** List of records.
*   **UI Hint:** The Frontend should highlight records where `expiryDate < Now` in Red.

### C. Revoke Record (Soft Delete)
*   **Method:** `DELETE /:recordId`
*   **Logic:**
    1.  **Action:** Update `deletedAt = now()`.
    2.  **Audit:** Require a "Reason" header or body for the audit log.
    3.  **Trigger:** Fire "Compliance Recalculation" (User might turn Red).

---

## 5. Agent Implementation Tips

*   **Multipart Handling:** Use NestJS `FileInterceptor`. Remember that in `multipart/form-data`, the textual data comes in as a string field. You must manually `JSON.parse(body.data)` before validating it with Zod.
*   **Integrity Hash:** Calculate the **SHA-256 hash** of the file buffer before uploading to S3 and save it to `evidenceHash`. This satisfies the "Audit-Proof" requirement.
*   **Grace Period Edge Case:** If a user overrides the expiry date to be in the past (e.g., uploading an old certificate), the system should accept it but immediately flag the user as "Expired" or "Archived."
