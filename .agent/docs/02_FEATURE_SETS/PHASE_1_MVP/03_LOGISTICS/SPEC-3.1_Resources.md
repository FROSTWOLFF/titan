# [SPEC-3.1] Resource Management Libraries (Trainers & Venues)

## Metadata

| Details | Value |
| :--- | :--- |
| **Module** | 3.0 Training Session Management |
| **Owner** | Frank (HSE Supervisor) |
| **Tech Stack** | NestJS, Prisma, Zod |
| **Status** | APPROVED FOR BUILD |

---

## 1. Context & Scope

This module manages the physical and human resources required for training.

### Key Logic Decisions
*   **Hard Qualification Block:** A trainer cannot be assigned to a session if they are not explicitly linked to that Course in the database.
*   **Admin-Only Access:** External trainers are tracked as database entities but do not have login credentials. The HSE Admin acts on their behalf.
*   **Soft Capacity Warning:** Exceeding venue capacity triggers a UI warning but allows the save (Operational flexibility).
*   **Conflict Detection:** The system prevents double-booking of Trainers (Hard Block) and checks for Venue overlaps (Hard Block).

---

## 2. Database Schema (Prisma)

> [!TIP]
> **Agent Instruction:** Implement in `libs/titan/training/domain/src/lib/prisma.schema`.

```prisma
enum TrainerType {
  INTERNAL
  EXTERNAL
}

// The Human Instructor
model Trainer {
  id          String      @id @default(cuid())
  firstName   String      @map("first_name")
  lastName    String      @map("last_name")
  type        TrainerType
  email       String?     // Optional for External
  phoneNumber String?     @map("phone_number")
  companyName String?     @map("company_name") // Required if External

  // Relations
  qualifications TrainerQualification[]
  sessions       Session[] // Defined in Module 3.2

  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  deletedAt   DateTime?   @map("deleted_at")

  @@map("trainers")
}

// The Link: Which courses can they teach?
model TrainerQualification {
  id          String   @id @default(cuid())
  
  trainerId   String   @map("trainer_id")
  trainer     Trainer  @relation(fields: [trainerId], references: [id], onDelete: CASCADE)
  
  // Link to PARENT Course ID (Concept).
  // Logic: If qualified for "Fire Safety", they can teach v1 and v2.
  courseId    String   @map("course_id")
  course      Course   @relation(fields: [courseId], references: [id])

  @@unique([trainerId, courseId])
  @@map("trainer_qualifications")
}

// The Physical Location
model Venue {
  id          String    @id @default(cuid())
  name        String    // e.g., "Main Site Training Room"
  capacity    Int       @default(20)
  location    String?   // Description e.g., "Building B, 2nd Floor"
  
  // Relations
  sessions    Session[] // Defined in Module 3.2

  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  @@map("venues")
}
```

---

## 3. Data Validation (Zod Schemas)

> [!TIP]
> **Agent Instruction:** Place in `libs/titan/training/domain/src/lib/schemas/resource.schema.ts`.

```typescript
import { z } from 'zod';

// --- Trainer Schemas ---
export const CreateTrainerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  type: z.enum(['INTERNAL', 'EXTERNAL']),
  email: z.string().email().optional().or(z.literal('')),
  phoneNumber: z.string().optional(),
  companyName: z.string().optional(),
  
  // Qualification Linkage (List of Course IDs)
  qualifiedCourseIds: z.array(z.string().cuid()).optional(),
}).refine((data) => {
  if (data.type === 'EXTERNAL' && !data.companyName) return false;
  return true;
}, {
  message: "Company Name is required for External Trainers",
  path: ['companyName'],
});

export type CreateTrainerDto = z.infer<typeof CreateTrainerSchema>;
export const UpdateTrainerSchema = CreateTrainerSchema.partial();

// --- Venue Schemas ---
export const CreateVenueSchema = z.object({
  name: z.string().min(3),
  capacity: z.number().int().min(1).max(500),
  location: z.string().optional(),
});

export type CreateVenueDto = z.infer<typeof CreateVenueSchema>;
```

---

## 4. API Endpoints & Logic

**Base URL:** `/api/v1/training/resources`

### A. Manage Trainers
*   **POST /trainers:** Create trainer + qualifications transaction.
*   **GET /trainers:** List all (Filter by `courseId` to find qualified staff).
*   **PUT /trainers/:id/qualifications:** Sync qualifications list (Replace All).
*   **Logic:** Delete existing rows -> Insert new rows.

### B. Manage Venues
*   **POST /venues:** Create venue.
*   **GET /venues:** List all.

### C. Availability Check (The Conflict Logic)
*   **Method:** `GET /availability/check`
*   **Query Params:**
    *   `startTime` (ISO String)
    *   `endTime` (ISO String)
    *   `trainerId` (Optional)
    *   `venueId` (Optional)
    *   `excludeSessionId` (Optional - for Edit mode)
*   **Logic:**
    1.  **Trainer Check:** If `trainerId` provided:
        *   Query `Session` table.
        *   Where `trainerId == input` AND `status != CANCELLED`.
        *   AND (`session.start < input.end` AND `session.end > input.start`) (Time Overlap).
        *   **Return:** `{ trainerAvailable: boolean, conflictingSession: { ... } }`
    2.  **Venue Check:** If `venueId` provided:
        *   Query `Session` table.
        *   Where `venueId == input` AND `status != CANCELLED`.
        *   AND (`session.start < input.end` AND `session.end > input.start`).
        *   **Return:** `{ venueAvailable: boolean, conflictingSession: { ... } }`

---

## 5. Agent Implementation Tips

*   **Availability Query:** Use Prisma's range filtering for overlaps carefully. The standard formula for "Do two time ranges overlap?" is `(StartA < EndB) && (EndA > StartB)`.
*   **Qualification Filtering:** When the user selects a "Course" in the Session Wizard (next module), the "Select Trainer" dropdown must automatically filter the `GET /trainers` call to only show those qualified for that course.
