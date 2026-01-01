# [DOC-004] API Interface Guidelines & Communication Protocols

This is Document 4 of 6. This document defines the "Contract" between the Frontend and Backend. For an AI Agent to write working code, it needs to know exactly what the JSON responses look like and how to handle errors.

## Metadata

| Details | Value |
| :--- | :--- |
| **Project** | Project Titan |
| **Version** | 1.0.0 |
| **Last Updated** | December 31, 2025 |
| **Status** | APPROVED |

---

## 1. Core Philosophy

**"One Schema, Two Ends."**

We do not write separate TypeScript interfaces for the Frontend and Backend. We define a Zod Schema in a Shared Library.

*   The Frontend uses it for Form Validation.
*   The Backend uses it for API Request Validation (DTOs).

> [!IMPORTANT]
> **Result:** It is impossible for the Frontend to send data the Backend doesn't expect.

---

## 2. RESTful Standards

We adhere to strict REST principles.

| Action | HTTP Verb | Endpoint Example |
| :--- | :--- | :--- |
| **Fetch List** | `GET` | `/api/v1/sessions` |
| **Fetch One** | `GET` | `/api/v1/sessions/:id` |
| **Create** | `POST` | `/api/v1/sessions` |
| **Update** | `PATCH` | `/api/v1/sessions/:id` (Partial updates) |
| **Delete** | `DELETE` | `/api/v1/sessions/:id` (Triggers Soft Delete) |
| **RPC Action** | `POST` | `/api/v1/sessions/:id/verify` (For non-CRUD logic) |

---

## 3. The Response Envelope

Every API response must follow this strict structure. AI Agents must wrap all return values in this envelope.

### A. Success Response (200 OK, 201 Created)

```json
{
  "success": true,
  "data": { ... },   // The actual resource
  "meta": {          // Optional: Pagination or metadata
    "page": 1,
    "limit": 20,
    "total": 55
  }
}
```

### B. Error Response (4xx, 5xx)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",  // Machine-readable code
    "message": "Invalid email format", // Human-readable message
    "details": {               // Optional: Zod field errors
      "email": "Must be a valid email"
    }
  }
}
```

---

## 4. Shared Types Strategy (Nx Specific)

This is the most critical workflow for avoiding bugs.

### Step 1: Define Schema
Create the schema in `libs/titan/training/domain/src/lib/schemas/session.schema.ts`:

```typescript
import { z } from 'zod';

export const CreateSessionSchema = z.object({
  date: z.string().datetime(), // ISO String
  venue: z.string().min(3),
  trainerId: z.string().cuid(),
});

// Export the Type derived from the Schema
export type CreateSessionDto = z.infer<typeof CreateSessionSchema>;
```

### Step 2: Backend Usage (Controller)

```typescript
// apps/titan/api/.../session.controller.ts
import { CreateSessionSchema, CreateSessionDto } from '@titan/training-domain';

@Post()
@UsePipes(new ZodValidationPipe(CreateSessionSchema)) // Automagic Validation
create(@Body() body: CreateSessionDto) { ... }
```

### Step 3: Frontend Usage (React Query)

```typescript
// apps/titan/web/.../create-session-form.tsx
import { CreateSessionSchema, CreateSessionDto } from '@titan/training-domain';

// The form now perfectly matches the API expectation
const form = useForm<CreateSessionDto>({
  resolver: zodResolver(CreateSessionSchema) 
});
```

---

## 5. Pagination Standards

For lists (e.g., "All Training Sessions"), we use Page-Based Pagination.

*   **Request Query Params:**
    *   `page`: number (default 1)
    *   `limit`: number (default 20, max 100)
    *   `sort`: string (e.g., `date:desc`)
*   **Response Meta:**
    *   Must include `total` (Total count of items matching the filter, ignoring limit).

---

## 6. File Upload Protocol (Multipart)

Since we handle heavy PDFs, we do not send JSON body.

*   **Header:** `Content-Type: multipart/form-data`
*   **Field Name:** `file` (The binary file)
*   **Meta Fields:** Any accompanying data (like `sessionId`) must be sent as text fields within the same `FormData` object.

> [!NOTE]
> **Agent Instruction:**
> *   **Frontend:** Use `const formData = new FormData(); formData.append('file', file);`
> *   **Backend:** Use NestJS `FileInterceptor('file')`.

---

## 7. HTTP Status Codes Mapping

AI Agents must use the correct semantic codes.

| Code | Meaning | Titan Context |
| :--- | :--- | :--- |
| **200** | OK | Standard success. |
| **201** | Created | Resource successfully created. |
| **400** | Bad Request | Validation failed (Zod error). |
| **401** | Unauthorized | Token missing or expired. |
| **403** | Forbidden | Valid token, but User Role lacks permission. |
| **404** | Not Found | ID does not exist (or was soft-deleted). |
| **422** | Unprocessable | Business logic failed (e.g., "Cannot verify expired session"). |
| **500** | Internal Error | Crash / Database connection lost. |
