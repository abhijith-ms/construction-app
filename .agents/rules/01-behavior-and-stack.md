---
trigger: always_on
---

---
trigger: always_on
---

# Construction App — Part 1: Behavior Rules & Tech Stack

This is Part 1 of 3 rule files for this project (see also: 02-security-and-data-model.md, 03-permissions-wages-and-decisions.md). Read all three before writing code.

This document is the single source of truth for this project. If anything is ambiguous, contradictory, or insufficient to proceed safely, STOP and ask the developer (a solo, non-expert-in-construction-domain founder building this for a real paying client) before making assumptions.

---

## 0. HOW YOU MUST BEHAVE (applies to every task, every session)

These rules override your default instincts. AI coding agents systematically make wrong silent assumptions, overengineer, and touch code they shouldn't. Follow strictly.

### 0.1 Think Before Coding
- Do NOT silently pick an interpretation when a requirement is ambiguous. Present the possible interpretations and ask which one is correct.
- Before writing code for any non-trivial feature, state your understanding of the requirement in 2-4 sentences and your implementation plan, then wait for confirmation if anything was uncertain.
- If about to assume a business rule, data relationship, permission boundary, UI behavior, or financial calculation — STOP and ask. Financial and payroll logic must never be assumed.
- Surface tradeoffs. If two reasonable ways exist to build something, explain the tradeoff briefly and ask for a preference, don't just pick one.

### 0.2 Simplicity First
- Write the minimum code that solves the stated problem. No speculative features, no "just in case" configurability that wasn't requested.
- No abstractions for single-use code. No premature generalization.
- If a simpler implementation meets the requirement, propose it instead of a complex one, even if the complex one feels more "professional."
- Don't add error handling for scenarios that cannot occur given the app's actual constraints.

### 0.3 Surgical Changes
- When editing existing files, change only what the task requires. Do not reformat, "clean up," or refactor unrelated code.
- Match existing code style and naming conventions exactly.
- If you notice dead code or something questionable outside scope, mention it — do not delete or "fix" it unprompted.
- Remove only imports/variables/functions that YOUR change made unused. Never remove pre-existing unused code unless explicitly asked.
- Never modify code you don't fully understand, even if it seems unrelated — verify first.

### 0.4 Goal-Driven Execution
- For any non-trivial task, state a short numbered plan with a verification step for each item before executing, e.g.:
  ```
  1. Create `attendance` table with RLS policy X → verify: supervisor role can insert only for own site_id
  2. Add wage calculation function → verify: test against the worked example in Part 3
  ```
- Prefer writing a quick test or manual verification check before declaring a task complete, especially for payroll/wage calculations — this is real money for real workers.

### 0.5 Multi-agent / parallel work coordination
- If operating as one of multiple agents/sessions on this codebase, do not assume another agent has/hasn't completed a dependent task — check actual code/schema state first.
- Do not duplicate database tables, types, or utility functions that may already exist — search the codebase first.
- If a task depends on an undocumented decision (e.g. exact column name, exact RLS policy), ask rather than inventing a name and hoping it matches what another agent chose.

### 0.6 When you are confused
- Say so explicitly: "I'm not sure about X because Y — can you clarify?" Do not produce a best-guess silently and move on.
- Never fabricate business logic for construction/payroll domain specifics (e.g., statutory deduction rules, PF/ESI percentages) — ask the developer rather than inventing plausible-sounding numbers.

---

## 1. PROJECT CONTEXT

**What this is:** A custom web app for a construction company (residential + commercial, ~4–10 active sites, 50–200 employees/labour) replacing an inadequate existing tool. Pain points: cannot track money per-site, payroll is entirely manual with no attendance-to-wage automation, no role-based access.

**Who is building this:** A solo developer, not a domain expert in construction/accounting, using AI coding assistance (Antigravity + Cline/Kimi via AWS Bedrock). Code must be written defensively and clearly.

**Who uses it:** Three roles — Admin (owner), Office Manager (payroll/accounting), Supervisor (on-site, attendance-focused). Full permission matrix is in Part 3.

**This handles real money and real wages for real workers.** Treat payroll, attendance, and financial calculations like safety-critical code: deterministic, tested, auditable, never silently wrong.

---

## 2. TECHNICAL STACK (fixed — do not substitute without asking)

### Frontend
- **Framework:** React 19 + Vite
- **Language:** TypeScript, strict mode enabled
- **Routing:** React Router v7
- **UI components:** shadcn/ui (Radix + Tailwind), generated into repo via CLI and owned directly — no alternate UI kits
- **Styling:** Tailwind CSS only. No CSS-in-JS
- **Icons:** lucide-react
- **Tables:** TanStack Table
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod. Every form must have a Zod schema, especially money fields
- **Data fetching/caching:** TanStack Query — all Supabase reads/writes go through Query hooks
- **Global state:** Zustand — session/auth/role state and minor UI state only
- **Dates:** date-fns
- **PDF export:** react-pdf or jsPDF — ask before picking when we reach that feature
- **Toasts:** sonner

### Backend
- **Platform:** Supabase (Postgres + Auth + RLS + Edge Functions). No separate Express/Node server. No MongoDB.
- **Database:** PostgreSQL via Supabase. All schema changes via versioned SQL migration files (Supabase CLI), never ad-hoc dashboard changes outside a migration file.
- **Auth:** Supabase Auth (email/password). Each user has exactly one role stored in a `profiles`/`users` table.
- **Authorization:** Row Level Security (RLS) enforces all role-based access at the database level. Never rely solely on hiding UI elements for security. Every sensitive table has RLS enabled, default-deny.
- **Business logic / calculations:** Wage calculations, payroll settlement, and multi-step financial logic must live in Postgres functions or Supabase Edge Functions — NOT computed client-side. The client displays results but is never the source of truth for money math.
- **Hosting:** Supabase Pro plan ($25/mo) — required for no auto-pausing and daily backups. Do not architect around Free tier constraints.

### Hosting / Infra
- **Frontend hosting:** Vercel (free Hobby tier), auto-deploy from GitHub on push to main.
- **Version control:** GitHub, private repository.
- **Secrets:** Supabase URL/anon key in Vercel env variables + local `.env.local` (gitignored). NEVER commit secrets/API keys/service role keys, ever, even temporarily.
- **Service role key:** Never used in client-side code or exposed to the browser. Only for trusted server-side contexts (Edge Functions) if absolutely needed.
