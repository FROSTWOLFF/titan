# [DOC-000] Product Vision & Context

## Metadata

| Details | Value |
| :--- | :--- |
| **Project** | Project Titan |
| **Version** | 1.0.0 |
| **Last Updated** | December 31, 2025 |
| **Target Audience** | Developers, Designers, AI Agents |

---

## 1. The Core Mission

> [!IMPORTANT]
> **"Audit-Proof Compliance in Under One Minute."**

Project Titan is a specialized **Training Management System (TMS)** for high-risk industrial environments. It acts as a **Liability Shield** for HSE Supervisors, replacing fragile spreadsheets with a rigid "Smart Database" to ensure compliance and legal defensibility.

### The "North Star" Metric
> If a government auditor walks in unannounced, the Supervisor must be able to pull up a worker's **Physical Attendance Sheet** and **Competency Assessment** within **60 seconds**, proving compliance beyond doubt.

---

## 2. The Primary Persona: "Frank"

| Attribute | Details |
| :--- | :--- |
| **Role** | Senior HSE Supervisor |
| **Full Profile** | [[Lead_User_Persona_Frank.md](file:///c:/Users/dogus/Documents/Coding/VibeCoding/Workspaces/titan/.agent/docs/00_CORE_CONTEXT/Lead_User_Persona_Frank.md)] |
| **Psychology** | High anxiety regarding random audits and potential fines/contract loss due to non-compliant workers |

### The Pain Points
*   **"Paper Chasing":** Hunting for physical sign-in sheets in physical storage.
*   **The "Excel Nightmare":** Managing 2,000+ workers / 50+ courses in spreadsheets lacking validation, formulas, or audit trails.
*   **Dynamic Chaos:** Inability of generic software to handle project-specific rules (e.g., Project A requires re-training every 6 months vs. Project B every 12 months).

---

## 3. Design Philosophy: "Dense Utility"

**Analogy:** "Bloomberg for Safety."  
**Vibe:** High-Information Density, Zero Fluff.

> [!TIP]
> **UI/UX Rules for AI Agents:**
> 1.  **Screen Real Estate:** Every pixel must earn its place. No whitespace for aesthetics; use space to show status.
> 2.  **Minimize Typing:** If the system can infer the answer, it must pre-fill it (e.g., Role "Rigger" auto-selects "Rigger Training").
> 3.  **Click > Type:** Prioritize dropdowns, toggles, and multi-selects over text input.
> 4.  **Low Learning Curve:** Visible hierarchy; no hidden menus. Must feel like a "Smarter Spreadsheet."

---

## 4. Key Value Propositions

*   **The "Audit Shield":** Storage of *proof*, not just data. The link between a Digital Profile and a Physical Signature is immutable.
*   **Smart Constraints:** Error prevention. A "Completed" status cannot be assigned without an uploaded Evidence File.
*   **Project Dynamism:** The system adapts to specific, changing construction project rules (unlike rigid ERPs).

---

## 5. Scope & Roadmap

### Phase 1: Training Management (The MVP)
*   **Focus:** Core Compliance.
*   **Features:** Personnel Profiling, Course Library, Session Logic, Evidence Upload, Expiry Dashboards.
*   **Device Target:** Web Desktop (Site Office).

### Phase 2: Incident Management
*   **Concept:** Linking "Training" to "Accidents" (Correlation of valid training to incidents).
*   **Architecture Requirement:** The `Personnel` entity must be a shared core resource, decoupled for future linking to Incident reports.

### Phase 3: Field Mobility
*   **Concept:** Tablet/Phone support for on-site verification.
*   **Architecture Requirement:** API endpoints must be lightweight to support low-connectivity environments.

---

## 6. Technical Implications

| Decision | Reasoning |
| :--- | :--- |
| **Single-Tenant Architecture** | Data isolation builds trust for the persona ("Frank"). |
| **Strict Typing** | An "Audit Shield" allows zero data bugs. Dates must be `Date` objects, not strings. |
| **JSONB Usage** | To handle "Dynamic Chaos" (varying project rules) without frequent schema migrations. |
