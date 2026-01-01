# [DOC-005] Frontend Module Architecture & Shell Strategy

This is Document 5 of 6. This document is the blueprint for the User Interface. It explains to the AI (and developers) how to build the "App Shell" so that we can easily plug in new modules (like "Safety" or "Incidents") later without rewriting the core.

## Metadata

| Details | Value |
| :--- | :--- |
| **Project** | Project Titan |
| **Version** | 1.0.0 |
| **Last Updated** | December 31, 2025 |
| **Status** | APPROVED |

---

## 1. The App Shell Philosophy

The Titan Web App (`apps/titan/web`) is just a "Container." It does not contain business logic. Its only jobs are:

*   **Authentication:** Check if the user is logged in.
*   **Layout:** Render the Sidebar, Top Navigation, and Language Switcher.
*   **Routing:** Decide which Module (Training, Settings, etc.) to load based on the URL.

---

## 2. Directory Structure (TanStack Router)

We use File-Based Routing via TanStack Router. The folder structure determines the URL.

**Location:** `apps/titan/web/src/routes`

| File | Purpose | URL Path |
| :--- | :--- | :--- |
| `__root.tsx` | The "Global Wrapper." Contains QueryClientProvider, Toaster, and I18nProvider. | (Root) |
| `_auth.tsx` | A Layout Route. Wraps everything that requires login. Checks for Token. Redirects to `/login` if missing. | (Protected) |
| `login.tsx` | The Login Page (Public). | `/login` |
| `_auth.dashboard.tsx` | The Home Dashboard. | `/dashboard` |
| `_auth.training.tsx` | The Training Module Entry. Lazy loads the Training Library. | `/training/*` |

> [!TIP]
> **Agent Instruction:**
> When adding a new page, use the CLI or manually create the file, then strictly run the command `pnpm router:gen` to update the type definitions.

---

## 3. Module Integration (Lazy Loading)

To keep the app fast, we do not bundle the "Training Logic" into the main initial download. We Lazy Load it.

**How it works in Code:**

```typescript
// apps/titan/web/src/routes/_auth.training.tsx

import { createFileRoute } from '@tanstack/react-router';

// Lazy Import the Feature Library
{{ ... }}
    <React.Suspense fallback={<LoadingSpinner />}>
      <TrainingShell />
    </React.Suspense>
  )
});
```

> [!NOTE]
> **Why:** This ensures that if a user only looks at the Dashboard, they never download the heavy Training code.

---

## 4. Internationalization (i18n) Strategy

We support Multilingual UI (Static) and Multilingual Data (Dynamic).

### A. Static Translations (The UI)
*   **Library:** `react-i18next`
*   **File Location:** Colocated with the Feature Lib.
    *   `libs/titan/training/feat-shell/src/lib/locales/en.json`
    *   `libs/titan/training/feat-shell/src/lib/locales/tr.json`
*   **Loading:** The Feature Shell registers its own translations when it loads.

### B. Dynamic Translations (The Database Data)
Since the API returns `JSONB` ({ "en": "Rigger", "tr": "..." }), we use a helper hook.

```typescript
// libs/shared/util/i18n/use-localized-value.ts
export const useLocalizedValue = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'tr'; // Typed keys

  return (data: LocalizedString) => {
    return data[lang] || data['en'] || '---'; // Fallback to EN
  };
};

// Usage in Component
const getVal = useLocalizedValue();
<h1>{getVal(course.title)}</h1> // Renders "Gelişmiş Halatçı" automatically
```

---

## 5. State Management Rules

We separate state into two buckets. Do not mix them.

| Type | Tool | Example |
| :--- | :--- | :--- |
| **Server State** | TanStack Query | "List of Sessions", "User Profile". (Data that lives in the DB). |
| **Client State** | Zustand | "Is Sidebar Open?", "Is Dark Mode On?". (Data that vanishes on refresh). |
| **Form State** | React Hook Form | "Current value of the input field". |

> [!CAUTION]
> **Forbidden:** Using Zustand to store the "List of Sessions." (This causes stale data bugs).

---

## 6. Design System (ShadCN UI)

We do not build buttons from scratch.

*   **Location:** `libs/shared/ui/src/lib/components`
*   **Theme:** `apps/titan/web/src/global.css` (Tailwind Config).

**Usage:**

```typescript
import { Button } from '@titan/shared-ui';

<Button variant="destructive" size="sm">
  {t('delete_action')}
</Button>
```
