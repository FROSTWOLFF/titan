# [SPEC-2.1] Personnel Profiles

## Metadata

| Details | Value |
| :--- | :--- |
| **Module** | 2.0 Personnel & Compliance |
| **Owner** | Frank (HSE Supervisor) |
| **Tech Stack** | NestJS, Prisma (Postgres), Zod |
| **Status** | APPROVED FOR BUILD |

---

## 1. Context & Scope

This module creates the "Digital Twin" for every worker.

### Key Logic Decisions
*   **Company Library:** Subcontractors are managed as database entities, not free text, to enable filtering.
*   **Supervisor Linking:** Supervisors are linked via a self-referencing relationship (`Personnel -> Personnel`) to ensure consistency, though complex org-chart features are out of scope.
*   **Global ID:** The `employee_id` (Badge ID) must be unique across the entire project.
*   **Lifecycle Status:** A rigid status Enum (`ACTIVE`, `INACTIVE`, `BLACKLISTED`) controls visibility and access, superseding simple date ranges.

---

## 2. Database Schema (Prisma)

> [!TIP]
> **Agent Instruction:** Implement in `libs/titan/personnel/domain/src/lib/prisma.schema`.

```prisma
// Enum for Worker Status
enum PersonnelStatus {
  ACTIVE       // Normal operation
  INACTIVE     // Demobilized / Left Project
  BLACKLISTED  // Banned from site (Security/Safety violation)
}

// The Company / Subcontractor Library
model Company {
  id        String   @id @default(cuid())
  name      String   @unique // e.g., "Acme Construction"
  code      String?  @unique // e.g., "ACME"
  
  // Relations
  employees Personnel[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@map("companies")
}

// The Worker Profile
model Personnel {
  id             String          @id @default(cuid())
  employeeId     String          @unique @map("employee_id") // The Badge ID (e.g. ACME-001)
  
  firstName      String          @map("first_name")
  lastName       String          @map("last_name")
  email          String?         // Optional for field workers
  phoneNumber    String?         @map("phone_number")
  
  // Lifecycle
  status         PersonnelStatus @default(ACTIVE)
  startDate      DateTime        @map("start_date") // Hire/Mob Date
  endDate        DateTime?       @map("end_date")   // Planned Demob Date

  // Relations
  companyId      String          @map("company_id")
  company        Company         @relation(fields: [companyId], references: [id])
  
  roleId         String          @map("role_id")
  role           Role            @relation(fields: [roleId], references: [id]) // Defined in Module 1.2
  
  // Self-Relation: Supervisor
  supervisorId   String?         @map("supervisor_id")
  supervisor     Personnel?      @relation("SupervisorHierarchy", fields: [supervisorId], references: [id])
  subordinates   Personnel[]     @relation("SupervisorHierarchy")

  // Many-to-Many: Assigned Areas (Defined in Module 1.3)
  assignedAreas  PersonnelArea[]

  // Audit
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")
  deletedAt      DateTime?       @map("deleted_at")

  @@map("personnel")
}
```

---

## 3. Data Validation (Zod Schemas)

> [!TIP]
> **Agent Instruction:** Place in `libs/titan/personnel/domain/src/lib/schemas/personnel.schema.ts`.

```typescript
import { z } from 'zod';

// --- Company Schemas ---
export const CreateCompanySchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(10).optional(), // Short code for badges
});
export type CreateCompanyDto = z.infer<typeof CreateCompanySchema>;


// --- Personnel Schemas ---
export const CreatePersonnelSchema = z.object({
  employeeId: z.string().min(3).max(50).describe("Global Badge Number"),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phoneNumber: z.string().optional(),
  
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED']).default('ACTIVE'),
  startDate: z.string().datetime(), // ISO String
  endDate: z.string().datetime().nullable().optional(),

  // Foreign Keys
  companyId: z.string().cuid(),
  roleId: z.string().cuid(),
  supervisorId: z.string().cuid().optional(), // Nullable
  
  // Assignments (Optional inline creation)
  assignedAreaIds: z.array(z.string().cuid()).optional(),
});

export type CreatePersonnelDto = z.infer<typeof CreatePersonnelSchema>;

// Update Schema
export const UpdatePersonnelSchema = CreatePersonnelSchema.partial();
```

---

## 4. API Endpoints & Logic

**Base URL:** `/api/v1/personnel`

### A. List All Personnel (The Directory)
*   **Method:** `GET /`
*   **Query Params:**
    *   `page`, `limit` (Pagination)
    *   `search` (Matches Name or `EmployeeID`)
    *   `companyId`, `roleId`, `status` (Filters)
*   **Response:** List of personnel with expanded company and role names.
*   **Logic:** Always exclude `deletedAt: not null`.

### B. Create Personnel
*   **Method:** `POST /`
*   **Body:** `CreatePersonnelDto`
*   **Logic:**
    1.  **Duplicate Check:** Check if `employeeId` already exists. If yes -> `409 Conflict`.
    2.  **Transaction:**
        *   Create `Personnel` record.
        *   If `assignedAreaIds` provided, create `PersonnelArea` links.
    3.  **Return:** Created object.

### C. Update Status (Termination/Block)
*   **Method:** `PATCH /:id/status`
*   **Body:** `{ status: "BLACKLISTED" | "INACTIVE" }`
*   **Logic:**
    *   If status is changed to `BLACKLISTED`, system should ideally auto-expire any active site passes (Future scope: Incident Module).
    *   **Audit Log:** "User X changed Worker Y status to BLACKLISTED".

### D. Get Profile (The "Single Source of Truth")
*   **Method:** `GET /:id`
*   **Response Includes:**
    *   Basic Info
    *   Assigned Role & Areas
    *   Computed Compliance Status (This will be linked in Module 2.4).

---

## 5. Agent Implementation Tips

*   **Supervisor Loop:** Be careful with the Supervisor self-relation. Ensure a user cannot be their own supervisor (**Constraint:** `id != supervisorId`).
*   **Importing Data:** When building the "Bulk Import" tool later, you will need to import Companies first, then Supervisors, then regular Workers, to satisfy Foreign Key constraints.
*   **Search Optimization:** Add a database index on `employee_id` and `last_name` for fast lookups during "Audit Mode".
