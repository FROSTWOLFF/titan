# [SPEC-1.3] Area Library (Location Intelligence)

This specification locks down the "Location Intelligence" of the system, implementing the Stacking and Inheritance logic we agreed upon.

## Metadata

| Details | Value |
| :--- | :--- |
| **Module** | 1.0 System Setup |
| **Owner** | Site Superintendent / Frank |
| **Tech Stack** | NestJS, Prisma (Postgres), Zod |
| **Status** | APPROVED FOR BUILD |

---

## 1. Context & Scope

The Area Library defines physical zones and their specific entry requirements.

### Key Logic Decisions
*   **Hierarchy:** Areas support infinite nesting (e.g., `Site > Process Area > Unit 4`).
*   **Inheritance:** Assigning a worker to a Child Area automatically enforces requirements from all Parent Areas.
*   **Multi-Area Assignment:** Workers can be assigned to multiple disjoint areas (e.g., "Unit 4" AND "Marine Jetty").
*   **Stacking (Union):** If a worker's Role and Area both require the same course, the "Strictest" rule applies (Pre-Mob > Post-Mob).

---

## 2. Database Schema (Prisma)

> [!TIP]
> **Agent Instruction:** Implement in `libs/titan/training/domain/src/lib/prisma.schema`.

```prisma
// The Physical Zone
model Area {
  id          String   @id @default(cuid())
  name        String   // e.g., "Marine Jetty"
  description String?
  
  // Hierarchy (Self-Relation)
  parentId    String?  @map("parent_id")
  parent      Area?    @relation("AreaHierarchy", fields: [parentId], references: [id])
  children    Area[]   @relation("AreaHierarchy")

  // Relations
  requirements AreaRequirement[]
  personnel    PersonnelArea[]   // Many-to-Many link to workers

  // Audit
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  @@map("areas")
}

// The Link Table (Area <-> Course)
model AreaRequirement {
  id              String          @id @default(cuid())
  
  areaId          String          @map("area_id")
  area            Area            @relation(fields: [areaId], references: [id], onDelete: CASCADE)
  
  courseId        String          @map("course_id")
  course          Course          @relation(fields: [courseId], references: [id])

  // Logic Config
  type            RequirementType // Re-use Enum: MANDATORY_PRE_MOB / POST_MOB
  gracePeriodDays Int?            @map("grace_period_days")

  @@unique([areaId, courseId])
  @@map("area_requirements")
}

// Many-to-Many: Personnel <-> Areas
// defined here for context, implemented fully in Module 2.1
model PersonnelArea {
  personnelId String   @map("personnel_id")
  areaId      String   @map("area_id")
  assignedAt  DateTime @default(now()) @map("assigned_at")

  area      Area      @relation(fields: [areaId], references: [id])
  personnel Personnel @relation(fields: [personnelId], references: [id]) // defined in next module

  @@id([personnelId, areaId])
  @@map("personnel_areas")
}
```

---

## 3. Data Validation (Zod Schemas)

> [!TIP]
> **Agent Instruction:** Place in `libs/titan/training/domain/src/lib/schemas/area.schema.ts`.

```typescript
import { z } from 'zod';

// Nested Requirement Schema (Identical to Role logic)
const AreaRequirementSchema = z.object({
  courseId: z.string().cuid(),
  type: z.enum(['MANDATORY_PRE_MOB', 'MANDATORY_POST_MOB']),
  gracePeriodDays: z.number().int().min(1).max(365).optional(),
}).refine((data) => {
  if (data.type === 'MANDATORY_POST_MOB' && !data.gracePeriodDays) {
    return false;
  }
  return true;
}, {
  message: "Grace Period is required for Post-Mobilization training",
  path: ['gracePeriodDays'],
});

export const CreateAreaSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  parentId: z.string().cuid().optional(), // Null = Root Area (The Project Site)
  
  // Optional: Add requirements during creation
  requirements: z.array(AreaRequirementSchema).optional(),
});

export type CreateAreaDto = z.infer<typeof CreateAreaSchema>;

// Update Schema
export const UpdateAreaSchema = CreateAreaSchema.partial();

// Sync Requirements Schema
export const SyncAreaRequirementsSchema = z.object({
  requirements: z.array(AreaRequirementSchema),
});
```

---

## 4. API Endpoints & Logic

**Base URL:** `/api/v1/training/areas`

### A. Get Area Tree (Hierarchy)
*   **Method:** `GET /tree`
*   **Logic:** Fetch all areas where `deletedAt` is null.
*   **Agent Tip:** The Frontend prefers a flat list with `parentId` so it can build the tree UI (ShadCN TreeView) on the client side. Do not pre-nest strictly in JSON unless requested.
Response: [{ id: "1", name: "Site", parentId: null }, { id: "2", name: "Zone A", parentId: "1" }]

### B. Create Area
*   **Method:** `POST /`
*   **Body:** `CreateAreaDto`
*   **Validation:** Ensure `parentId` exists (if provided). Prevent circular dependency (Area A cannot be parent of Area B if Area B is parent of Area A).

### C. Get Effective Requirements (Inheritance Calculator)
*   **Method:** `GET /:areaId/requirements/effective`
*   **Purpose:** Shows all training needed for this area, including inherited ones.
*   **Logic (Recursive):**
    1.  Find Area by ID.
    2.  Traverse up the parent chain until `parentId` is null.
    3.  Collect `AreaRequirement` from every area in that chain.
    4.  **Deduplication:** If "Fire Safety" is required by Child AND Parent, show it once. (Use stricter rule if they differ, though usually they won't).
Return: List of Courses.

### D. Delete Area
*   **Method:** `DELETE /:areaId`
*   **Logic:**
    1.  **Check Children:** If Area has child areas, block delete. (Must delete children first).
    2.  **Check Personnel:** If `PersonnelArea` links exist, block delete.
    3.  **Action:** Soft Delete.

---

## 5. Agent Implementation Tips (Compliance Engine Preview)

When building the Compliance Engine (Module 2.3), the agent must use the following query logic to determine a user's "Area Obligations":

**Algorithm:** `getUserAreaRequirements(userId)`
1.  **Fetch Assigned Areas:** Query `PersonnelArea` to get list of `areaIds` for the user.
2.  **Expand Hierarchy:** For each `areaId`, recursively fetch all `parentIds` up to the root.
3.  **Collect Requirements:** Fetch all `AreaRequirements` for the expanded list of areas.
4.  **Merge & Dedup:**
    *   Group by `courseId`.
    *   **Conflict Resolution:** If one occurrence is `PRE_MOB` and another is `POST_MOB`, the result is `PRE_MOB` (**Strictest Wins**).
