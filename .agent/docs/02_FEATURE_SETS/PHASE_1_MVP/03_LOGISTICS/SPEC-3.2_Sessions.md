# [SPEC-3.2] Session Planning & Scheduling

## Metadata

| Details | Value |
| :--- | :--- |
| **Module** | 3.0 Training Session Management |
| **Owner** | Frank (HSE Supervisor) |
| **Tech Stack** | NestJS, Prisma, Zod |
| **Status** | APPROVED FOR BUILD |

---

## 1. Context & Scope

This module handles the lifecycle of a training event from a rough idea to a confirmed calendar entry.

### Key Logic Decisions
*   **Flexible Drafts:** A session can be created with only a `Course ID`. `Trainer`, `Venue`, and `Time` are optional until the session is "Scheduled".
*   **Smart Picker:** The attendee selection tool prioritizes "Red" (Non-Compliant) and "Yellow" (Expiring) workers but allows the Admin to invite anyone (even Green users).
*   **Trainer Load Visibility:** The system calculates and displays "Hours Booked This Week" for each trainer to aid decision-making, but does not strictly block over-booking.
*   **No Email Notifications:** Alerts are visual (Dashboard/Toasts) only.

---

## 2. Database Schema (Prisma)

> [!TIP]
> **Agent Instruction:** Implement in `libs/titan/session/domain/src/lib/prisma.schema`.

```prisma
enum SessionStatus {
  DRAFT       // Planning mode. Validation is loose.
  SCHEDULED   // Locked in. Validation is strict.
  COMPLETED   // Happened. Attendance marked.
  CANCELLED   // Aborted.
}

enum AttendanceStatus {
  REGISTERED  // Default upon addition
  ATTENDED    // Showed up
  NO_SHOW     // Missed it
}

// The Training Event
model Session {
  id          String        @id @default(cuid())
  
  // What
  courseId    String        @map("course_id")
  course      Course        @relation(fields: [courseId], references: [id])
  
  // Who & Where (Nullable in DRAFT)
  trainerId   String?       @map("trainer_id")
  trainer     Trainer?      @relation(fields: [trainerId], references: [id])
  
  venueId     String?       @map("venue_id")
  venue       Venue?        @relation(fields: [venueId], references: [id])
  
  // When (Nullable in DRAFT)
  startTime   DateTime?     @map("start_time")
  endTime     DateTime?     @map("end_time")

  // State
  status      SessionStatus @default(DRAFT)
  
  // Relations
  attendees   SessionAttendee[]
  
  // Audit
  createdById String        @map("created_by_id")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  deletedAt   DateTime?     @map("deleted_at") // Soft Delete

  @@map("sessions")
}

// The Class List
model SessionAttendee {
  sessionId   String           @map("session_id")
  personnelId String           @map("personnel_id")
  
  status      AttendanceStatus @default(REGISTERED)
  remarks     String?          // e.g. "Left early"
  
  session     Session          @relation(fields: [sessionId], references: [id], onDelete: CASCADE)
  personnel   Personnel        @relation(fields: [personnelId], references: [id])

  @@id([sessionId, personnelId])
  @@map("session_attendees")
}
```

---

## 3. Data Validation (Zod Schemas)

> [!TIP]
> **Agent Instruction:** Place in `libs/titan/session/domain/src/lib/schemas/session.schema.ts`.

```typescript
import { z } from 'zod';

// --- Draft Schema (Loose) ---
export const CreateDraftSchema = z.object({
  courseId: z.string().cuid(),
  // All other fields optional
  trainerId: z.string().cuid().optional(),
  venueId: z.string().cuid().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

// --- Schedule Schema (Strict) ---
// Used when moving from DRAFT -> SCHEDULED
export const ScheduleSessionSchema = z.object({
  trainerId: z.string().cuid(),
  venueId: z.string().cuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
}).refine(data => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return end > start;
}, { message: "End time must be after start time", path: ['endTime'] });

export type CreateDraftDto = z.infer<typeof CreateDraftSchema>;
export type ScheduleSessionDto = z.infer<typeof ScheduleSessionSchema>;
```

---

## 4. API Endpoints & Logic

**Base URL:** `/api/v1/training/sessions`

### A. Create Draft
*   **Method:** `POST /draft`
*   **Body:** `CreateDraftDto`
*   **Logic:** Create session with status: `DRAFT`. No conflict checks required yet.

### B. Update Session (Edit)
*   **Method:** `PATCH /:sessionId`
*   **Logic:** Allow updating any field. If status is currently `SCHEDULED`, perform "Availability Check" (Module 3.1) before saving to prevent moving it to a conflicted slot.

### C. Publish Session (Draft -> Scheduled)
*   **Method:** `PATCH /:sessionId/schedule`
*   **Body:** `ScheduleSessionDto`
*   **Logic:**
    1.  **Validation:** Ensure `Trainer`, `Venue`, and `Times` are present.
    2.  **Conflict Check:** Run the "Availability Check" (Module 3.1). If conflict -> `409 Conflict`.
    3.  **Qualification Check:** Ensure `Trainer` is qualified for `Course`. If not -> `400 Bad Request`.
    4.  **Action:** Update `status = SCHEDULED`.

### D. Get Smart Suggestions (The Picker)
*   **Method:** `GET /:sessionId/attendee-suggestions`
*   **Query Params:** `search` (optional text), `limit` (default 50).
*   **Logic:**
    1.  **Fetch Candidates:** Query `ComplianceItem` table for this `courseId`.
    2.  **Sort Order:**
        *   **Group 1:** Status `NON_COMPLIANT` (Red).
        *   **Group 2:** Status `PENDING` (Yellow).
        *   **Group 3:** `ComplianceStatus` is `COMPLIANT` (Green) but `expiryDate` is approaching.
        *   **Group 4:** Everyone else (Green), sorted Alphabetically.
    3.  **Filter:** Exclude `personnelIds` who are already in the `SessionAttendee` list.

### E. Manage Attendees
*   **Method:** `POST /:sessionId/attendees`
*   **Body:** `{ personnelIds: string[] }`
*   **Logic:** Bulk insert into `SessionAttendee` table.

---

## 5. Agent Implementation Tips

*   **Trainer Load Calculation:**
    *   In the `GET /trainers` endpoint (Module 3.1), add a bookings relation count or sum.
    *   **Query:** Sum the duration (minutes) of all sessions where `trainerId == ID` AND `status == SCHEDULED` AND `startTime` is within the same ISO Week.
    *   **Frontend:** Display as "John Smith (12h booked this week)".
*   **Venue Capacity UI:**
    *   When adding attendees, the Frontend should compare `attendees.length` vs. `venue.capacity`.
    *   If `length > capacity`, show a Yellow Alert: "Venue Capacity Exceeded (25/20)." Do not disable the "Add" button.
