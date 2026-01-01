# [ASSET] Design Token Strategy: "Strict Utility"

## Metadata

| Details | Value |
| :--- | :--- |
| **Strategy** | Strict Utility |
| **Owner** | Brand / Frontend Engineering |
| **Status** | ACTIVE |

---

## 1. Context & Scope

We use a **Two-Tier Token System**:
1.  **Global Primitives:** The raw values (The "What").
2.  **Semantic Aliases:** The context-specific application (The "Why").

> [!NOTE]
> **Why this matters:** If we decide to darken our "Brand Blue" to improve contrast ratios for accessibility, we change one Primitive, and it propagates everywhere. This ensures the "Audit Shield" remains unbreakable without hunting down hex codes.

---

## 1. Color System: "The Signal Protocol"

We rely on the **60-30-10 Rule** adapted for Industrial Utility. We are not painting a picture; we are creating a control panel.

### A. The Primitives (The Palette)
We constrain the selection to avoid "decision fatigue," using the Tailwind default palette logic.

*   **Neutral (The Canvas):** `Slate` (Cool gray). It feels technical and engineered, unlike "Warm Gray" which feels too organic/soft.
*   **Primary (The Brand):** `Titan Blue` (A custom mix between Slate and Indigo). Trustworthy, authoritative, bureaucratic.
*   **Signal Colors (The Status):**
    *   **Critical (Error/Revoked):** `Red` (High urgency).
    *   **Warning (Expiring):** `Amber` (Visible against white, distinct from red).
    *   **Success (Competent):** `Emerald` (Clear "Go" signal).
    *   **Information (Draft):** `Blue` (Neutral status).

### B. The Semantics (The Usage)

| Token Name | Value Mapping | Usage Rationale (The "Frank" Test) |
| :--- | :--- | :--- |
| `bg-canvas` | `Slate-50` | Reduces eye strain compared to pure white (Bloomberg terminal style). |
| `bg-surface` | `White` | Used for "Cards" (Personnel Profiles, Training Records) to create focus. |
| `text-primary` | `Slate-900` | Maximum contrast for data reading. |
| `text-secondary` | `Slate-500` | For metadata (labels, dates that aren't expiring). De-emphasized to reduce noise. |
| `border-default` | `Slate-200` | Subtle definition. Structure without heaviness. |
| `status-critical-bg` | `Red-50` | Background for expired rows. |
| `status-critical-fg` | `Red-700` | Text for expired rows. (Red-on-Red ensures accessibility). |

---

## 2. Typography: "The Data Density Scale"

We adhere to the **Major Third (1.25)** scale. We are optimizing for scanning speed.

*   **Font Family:** `Inter` (or similar variable sans-serif). It creates the "Smarter Spreadsheet" feel.
*   **Base Size:** `16px` (1rem).
*   **Leading (Line Height):**
    *   `tight` (1.1) for Headings (Saves vertical space).
    *   `relaxed` (1.6) for Body text (Prevents "wall of text" fatigue).

### The Hierarchy

| Token | Application |
| :--- | :--- |
| `text-heading-xl` | Dashboard Totals (The "Big Numbers"). |
| `text-heading-lg` | Page Titles ("Training Library"). |
| `text-body-base` | Standard form inputs and table data. |
| `text-body-sm` | Metadata, timestamps, footer info. Crucial for high-density tables. |
| `text-mono` | For UUIDs, License Numbers, and Hashed Keys. Ensures explicit character differentiation (0 vs O). |

---

## 3. Spacing & Grid: "The 8-Point Rhythm"

> [!IMPORTANT]
> **Philosophy:** We use space strictly to group related information.

*   **Base Unit:** `4px` (0.25rem).
*   **Component Padding:** `px-4` (16px) / `py-2` (8px). Tighter than consumer apps to fit more rows above the fold.
*   **Gap Logic:**
    *   `gap-2` (8px): Related items (Icon + Text).
    *   `gap-4` (16px): Distinct Form Fields.
    *   `gap-8` (32px): Major Section Breaks.

---

## 4. Borders & Radius: "The Hard Hat Aesthetic"

We avoid the "bubbly" rounded look of modern startups. Titan is industrial software.

*   **Radius:** `radius-sm` (4px) or `radius-md` (6px).
    *   *Why:* It looks "machined" and sturdy. It maximizes internal space within buttons and inputs.
*   **Stroke:** `1px` solid. Crisp definition.
*   **Focus Ring:** `ring-2` offset-2. High visibility for keyboard navigation (Accessibility/Compliance).

---

## 5. Interaction: "Immediate Feedback"

*   **Hover:** `bg-slate-100`. Subtle shift.
*   **Active/Press:** `scale-[0.98]`. Micro-interaction to confirm the click was registered (tactile confidence).
