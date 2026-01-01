# [SPEC-1.1] Training Library (Master Course Catalog)

This document translates the business vision into strict technical instructions. You can hand this directly to a developer or an AI Agent to build the Training Library.

## Metadata

| Details | Value |
| :--- | :--- |
| **Module** | 1.0 System Setup |
| **Owner** | Frank (HSE Supervisor) |
| **Tech Stack** | NestJS, Prisma (Postgres), Zod |
| **Status** | READY FOR IMPLEMENTATION |

---

## 1. Context & Scope

The Training Library is the "Source of Truth" for all safety qualifications.

> [!IMPORTANT]
> **Key Architectural Decision: Parent-Child Versioning Pattern**
> *   **Course (Parent):** Represents the abstract concept (e.g., "HSE-001: Fire Safety"). It holds the stable ID used by the rest of the system.
> *   **CourseVersion (Child):** Represents the specific syllabus (e.g., "v1.0 (2024)" vs "v2.0 (2025)"). It holds the duration, validity, and rules.

---

## 2. Database Schema (Prisma)

> [!TIP]
> **Agent Instruction:** Implement this schema in `libs/titan/training/domain/src/lib/prisma.schema`. Use strict CUIDs.

```prisma
// Enums for Dropdowns
enum ProviderType {
  INTERNAL
  EXTERNAL_REGISTERED
  EXTERNAL_GENERIC
}

enum DeliveryMethod {
  INSTRUCTOR_LED
  CBT // Computer Based Training
  PRACTICAL_ASSESSMENT
  BLENDED
}

enum CourseStatus {
  DRAFT      // Can be Hard Deleted. Not visible to users.
  PUBLISHED  // Active. Soft Delete only.
  ARCHIVED   // Old versions. Read-only.
}

// The Parent Container (Stable ID)
model Course {
  id        String   @id @default(cuid())
  code      String   @unique // e.g., "HSE-001"
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at") // Soft Delete for Parent

  // Relations
  versions  CourseVersion[]
  
  // Prerequisites (Self-referential via Join Table)
  // Defines "This Course" acts as a prerequisite for others
  requiredBy CoursePrerequisite[] @relation("PrerequisiteTarget") 
  
  // Defines "This Course" has prerequisites (linked via specific versions)
  requiredFor CoursePrerequisite[] @relation("PrerequisiteSource")

  @@map("courses")
}

// The Specific Version (Syllabus)
model CourseVersion {
  id        String   @id @default(cuid())
  courseId  String   @map("course_id")
  version   Int      // e.g., 1, 2, 3
  status    CourseStatus @default(DRAFT)
  
  // Core Data
  title            Json     // i18n: { "en": "Fire Safety", "tr": "Yangın Güvenliği" }
  category         String   // e.g., "HSE_CONSTRUCTION"
  duration         Int      // Minutes
  validityMonths   Int      @map("validity_months") // 0 = No Expiry
  providerType     ProviderType @map("provider_type")
  deliveryMethod   DeliveryMethod @map("delivery_method")
  minPassScore     Int      @default(80) @map("min_pass_score")
  
  // Flags
  requiresVerify   Boolean  @default(false) @map("requires_verify") // Competency Check
  
  // Prerequisites for THIS version
  // "To take v2 of this course, you need Course X and Course Y"
  prerequisites    CoursePrerequisite[]

  createdAt DateTime @default(now()) @map("created_at")
  publishedAt DateTime? @map("published_at")

  course    Course   @relation(fields: [courseId], references: [id])

  @@unique([courseId, version]) // Cannot have two v1.0s for the same course
  @@map("course_versions")
}

// Join Table for Prerequisites
model CoursePrerequisite {
  id             String        @id @default(cuid())
  
  // The Version that HAS the requirement
  sourceVersionId String       @map("source_version_id")
  sourceVersion   CourseVersion @relation(fields: [sourceVersionId], references: [id])
  
  // The Course that IS the requirement (We link to Parent, not specific version)
  targetCourseId  String       @map("target_course_id")
  targetCourse    Course       @relation("PrerequisiteTarget", fields: [targetCourseId], references: [id])

  @@unique([sourceVersionId, targetCourseId])
  @@map("course_prerequisites")
}
```

---

## 3. Data Validation (Zod Schemas)

> [!TIP]
> **Agent Instruction:** Place in `libs/titan/training/domain/src/lib/schemas/course.schema.ts`. This contract is shared by API and Frontend.

```typescript
import { z } from 'zod';

// Sub-schema for i18n Strings
const LocalizedStringSchema = z.object({
  en: z.string().min(3).max(100),
  tr: z.string().optional(), // Turkish is optional initially
});

export const CreateCourseSchema = z.object({
  // Parent Data
  code: z.string().regex(/^[A-Z]{2,4}-\d{3}$/, "Format must be XXX-000 (e.g. HSE-001)"),
  
  // Version Data (Initial v1 Draft)
  title: LocalizedStringSchema,
  category: z.string(),
  durationMinutes: z.number().min(15).max(10000),
  validityMonths: z.number().min(0).max(120), // 0 = Permanent
  providerType: z.enum(['INTERNAL', 'EXTERNAL_REGISTERED', 'EXTERNAL_GENERIC']),
  deliveryMethod: z.enum(['INSTRUCTOR_LED', 'CBT', 'PRACTICAL_ASSESSMENT', 'BLENDED']),
  minPassScore: z.number().min(0).max(100),
  requiresVerification: z.boolean(),
  
  // Array of Course IDs that are required
  prerequisiteCourseIds: z.array(z.string().cuid()).optional(),
});

export type CreateCourseDto = z.infer<typeof CreateCourseSchema>;

// Update Schema (Creating a new Version)
export const CreateVersionSchema = CreateCourseSchema.omit({ code: true }).extend({
  // We don't change the Code, but we update the rest
  changeLog: z.string().min(5).describe("Why is a new version being created?"),
});
```

---

## 4. API Endpoints & Logic

**Base URL:** `/api/v1/training/courses`

### A. Create New Course (Initial)
*   **Method:** `POST /`
*   **Body:** `CreateCourseDto`
*   **Logic:**
    1.  Check if code (`HSE-001`) is unique. If not, throw `409 Conflict`.
    2.  **Transaction:**
        *   Create `Course` (Parent).
        *   Create `CourseVersion` (Child) with `version: 1` and `status: DRAFT`.
        *   Insert rows into `CoursePrerequisite` if IDs are provided.
    3.  **Return:** The combined object.

### B. Publish a Version
*   **Method:** `PATCH /:courseId/versions/:versionNumber/publish`
*   **Logic:**
    1.  Update status from `DRAFT` to `PUBLISHED`.
    2.  Set `publishedAt` to `now()`.
    3.  **Constraint:** If a previous version exists (e.g., `v1`), update its status to `ARCHIVED`. (Only one active version allowed at a time for this MVP).

### C. Create New Version (Edit Flow)
*   **Method:** `POST /:courseId/versions`
*   **Body:** `CreateVersionDto`
*   **Logic:**
    1.  Find the current latest version number (e.g., `1`).
    2.  Create new `CourseVersion` with `version: 2` and `status: DRAFT`.
    3.  Copy all data from DTO.
    4.  **Important:** Does not automatically Archive `v1` yet. That happens on Publish.

### D. Delete (The Hybrid Rule)
*   **Method:** `DELETE /:courseId/versions/:versionNumber`
*   **Logic:**
    *   **IF Status == DRAFT:** Perform `prisma.courseVersion.delete()` (Hard Delete).
        *   *Check:* If this was the only version, also hard delete the Parent `Course`.
    *   **IF Status == PUBLISHED/ARCHIVED:** Perform `prisma.courseVersion.update({ deletedAt: new Date() })` (Soft Delete).

---

## 5. Agent Implementation Tips

*   **Prerequisites Recursion:** When checking for prerequisites in the future "Session Scheduler," you only need to check the immediate prerequisites of the currently active version. Do not recursively check the entire tree for the MVP.
*   **Search:** When the user searches for a course (e.g., in the dropdown), strictly filter for `CourseVersion` where `status == PUBLISHED`. Do not show Drafts or Archived versions in the booking list.
