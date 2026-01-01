# [SPEC-1.2] Role Library (Job Profiles)

## Metadata

| Details | Value |
| :--- | :--- |
| **Module** | 1.0 System Setup |
| **Owner** | Frank (HSE Supervisor) |
| **Tech Stack** | NestJS, Prisma (Postgres), Zod |
| **Status** | APPROVED FOR BUILD |

---

## 1. Context & Scope

The Role Library links "Human Identity" to "Training Requirements".

### Key Logic Decisions
*   **Strict Compliance:** The "Recommended" status is removed. All assigned training is Mandatory.
*   **Role Assignment Anchor:** The compliance timer for Post-Mobilization starts when the Role is assigned to the user, not their hire date.
*   **Single Primary Role:** Users have exactly one Role (e.g., "Rigger") to ensure deterministic compliance logic.
*   **No Inheritance:** Roles are flat. "Senior Rigger" does not inherit "Junior Rigger" rules automatically.

---

## 2. Database Schema (Prisma)

> [!TIP]
> **Agent Instruction:** Implement this strictly in `libs/titan/training/domain/src/lib/prisma.schema`.

```prisma
// Enum for Requirement Urgency
enum RequirementType {
  MANDATORY_PRE_MOB   // Must be done BEFORE site access (Red immediately if missing)
  MANDATORY_POST_MOB  // Can be done AFTER site access (Red after Grace Period)
}

// The Job Profile (e.g., "High Voltage Electrician")
model Role {
  id          String   @id @default(cuid())
  code        String   @unique // Human-readable ID (e.g., "JOB-001")
  title       Json     // i18n: { "en": "Rigger", "tr": "Halatçı" }
  description String?  // Optional context
  
  // Relations
  requirements RoleRequirement[]
  personnel    Personnel[]       // Relation to Personnel (Module 2.1)

  // Audit Fields
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at") // Soft Delete Support

  @@map("roles")
}

// The Link Table (Role <-> Course)
model RoleRequirement {
  id              String          @id @default(cuid())
  
  // Parent Role
  roleId          String          @map("role_id")
  role            Role            @relation(fields: [roleId], references: [id], onDelete: CASCADE)
  
  // Link to the PARENT Course ID (Not Version)
  // Logic: Roles require the "Concept" of Fire Safety, regardless of version updates.
  courseId        String          @map("course_id")
  course          Course          @relation(fields: [courseId], references: [id])
  
  // Compliance Logic
  type            RequirementType
  gracePeriodDays Int?            @map("grace_period_days") 
  // Constraint: Only valid/required if type == MANDATORY_POST_MOB

  @@unique([roleId, courseId]) // Prevent duplicate requirements for same role
  @@map("role_requirements")
}
```

---

## 3. Data Validation (Zod Schemas)

> [!TIP]
> **Agent Instruction:** Place in `libs/titan/training/domain/src/lib/schemas/role.schema.ts`. Use the shared `LocalizedStringSchema`.

```typescript
import { z } from 'zod';
import { LocalizedStringSchema } from './course.schema';

// The Nested Requirement Object
const RoleRequirementSchema = z.object({
  courseId: z.string().cuid(),
  type: z.enum(['MANDATORY_PRE_MOB', 'MANDATORY_POST_MOB']),
  gracePeriodDays: z.number().int().min(1).max(365).optional(), 
}).refine((data) => {
  // Logic: If Post-Mob, Grace Period IS required.
  if (data.type === 'MANDATORY_POST_MOB' && !data.gracePeriodDays) {
    return false;
  }
  return true;
}, {
  message: "Grace Period (days) is required for Post-Mobilization training",
  path: ['gracePeriodDays'],
});

// Create Role DTO
export const CreateRoleSchema = z.object({
  code: z.string().min(3).max(20).regex(/^[A-Z0-9-]+$/, "Format: UPPERCASE-NUMBERS (e.g. ELEC-01)"),
  title: LocalizedStringSchema,
  description: z.string().optional(),
  
  // Optional: Create requirements inline during creation
  requirements: z.array(RoleRequirementSchema).optional(),
});

export type CreateRoleDto = z.infer<typeof CreateRoleSchema>;

// Update Schema (Partial)
export const UpdateRoleSchema = CreateRoleSchema.partial();

// Requirements Sync DTO (For the bulk update endpoint)
export const SyncRequirementsSchema = z.object({
  requirements: z.array(RoleRequirementSchema),
});
```

---

## 4. API Endpoints & Business Logic

**Base URL:** `/api/v1/training/roles`

### A. List All Roles
*   **Method:** `GET /`
*   **Query Params:** `page`, `limit`, `search` (filters by title or code).
*   **Response:** List of Roles (without full requirements to keep it light).
*   **Filter Logic:** `where: { deletedAt: null }`.

### B. Get Single Role (With Requirements)
*   **Method:** `GET /:roleId`
*   **Response:**
```json
{
  "id": "cuid...",
  "code": "JOB-001",
  "title": { "en": "Rigger" },
  "requirements": [
    {
      "courseId": "cuid...",
      "courseCode": "HSE-001",
      "courseTitle": { "en": "Fire Safety" },
      "type": "MANDATORY_PRE_MOB"
    }
  ]
}
```

### C. Create Role
*   **Method:** `POST /`
*   **Body:** `CreateRoleDto`
*   **Logic:**
    1.  **Validation:** Check if code already exists. If yes -> `409 Conflict`.
    2.  **Transaction:**
        *   Create the `Role` entity.
        *   If `requirements` array exists, loop and create `RoleRequirement` entries.
    3.  **Return:** `201 Created` with the new object.

### D. Sync Requirements (The "Edit" Flow)
*   **Method:** `PUT /:roleId/requirements`
*   **Body:** `SyncRequirementsSchema`
*   **Logic:**
    1.  **Transaction Start.**
    2.  `deleteMany` from `RoleRequirement` where `roleId == :roleId`.
    3.  `createMany` with the new list from the body.
    4.  **Transaction End.**
    5.  **Trigger (Async):** In Phase 2, this event will trigger the "Compliance Engine" to re-calculate status for all users with this Role.

### E. Delete Role
*   **Method:** `DELETE /:roleId`
*   **Logic:**
    1.  **Check Usage:** Query `Personnel` table. Is anyone assigned this `roleId`?
        *   **Yes:** Throw `409 Conflict`. ("Cannot delete a Role that is currently assigned to users. Reassign them first.")
        *   **No:** Proceed.
    2.  **Soft Delete:** Update `Role` set `deletedAt = now()`.

---

## 5. Agent Implementation Tips

*   **Unique Constraints:** The `@@unique([roleId, courseId])` in Prisma is critical. It prevents the UI from accidentally adding "Fire Safety" twice to the same Role.
*   **Relation Loading:** When fetching requirements, you must include: `{ course: true }` to get the readable Course Code and Title for the frontend table.
*   **Validation Error Handling:** If the `refine` logic in Zod fails (missing Grace Period), ensure the API returns a `400 Bad Request` with the specific message "Grace Period is required..." so the UI can highlight the correct field.
