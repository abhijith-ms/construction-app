# Construction Site Management App — Master Project Instructions

This document is the single source of truth for this project. Read it fully before writing any code. If anything here is ambiguous, contradictory, or insufficient to proceed safely, STOP and ask the developer (a solo, non-expert-in-construction-domain founder building this for a real paying client) before making assumptions.

---

## 0. HOW YOU MUST BEHAVE (read this first, applies to every task, every session)

These rules override your default instincts. They exist because AI coding agents systematically make wrong silent assumptions, overengineer, and touch code they shouldn't. Follow them strictly.

### 0.1 Think Before Coding
- Do NOT silently pick an interpretation when a requirement is ambiguous. Present the possible interpretations and ask which one is correct.
- Before writing code for any non-trivial feature, state your understanding of the requirement in 2-4 sentences and your implementation plan, then wait for confirmation if anything was uncertain.
- If you are about to make an assumption about: a business rule, a data relationship, a permission boundary, a UI behavior, or a financial calculation — STOP and ask instead of guessing. Financial and payroll logic especially must never be assumed.
- Surface tradeoffs. If there are two reasonable ways to build something (e.g., "store computed wage as a column" vs "compute on the fly"), explain the tradeoff briefly and ask for a preference, don't just pick one.

### 0.2 Simplicity First
- Write the minimum code that solves the stated problem. No speculative features, no "just in case" configurability that wasn't requested.
- No abstractions for single-use code. No premature generalization.
- If a simpler implementation exists that meets the requirement, propose it instead of a complex one, even if the complex one feels more "professional."
- Don't add error handling for scenarios that cannot occur given the app's actual constraints.

### 0.3 Surgical Changes
- When editing existing files, change only what the task requires. Do not reformat, "clean up," or refactor unrelated code, even if you think it's an improvement.
- Match existing code style and naming conventions exactly, even if you'd personally choose differently.
- If you notice dead code or something questionable outside the scope of the current task, mention it in your response — do not delete or "fix" it unprompted.
- Remove only the imports/variables/functions that YOUR change made unused. Never remove pre-existing unused code unless explicitly asked.
- Never modify comments or code you don't fully understand, even if it seems unrelated to your task — verify first.

### 0.4 Goal-Driven Execution
- For any non-trivial task, state a short numbered plan with a verification step for each item before executing, e.g.:
  ```
  1. Create `attendance` table with RLS policy X → verify: supervisor role can insert only for own site_id
  2. Add wage calculation function → verify: test against the worked example in section 6 below
  ```
- Prefer writing a quick test or manual verification check before declaring a task complete, especially for payroll/wage calculations, where correctness is non-negotiable (this is real money for real workers).

### 0.5 Multi-agent / parallel work coordination
- If you are operating as one of multiple agents/sessions on this codebase, do not assume another agent has or hasn't completed a dependent task — check the actual code/schema state before building on top of it.
- Do not duplicate database tables, types, or utility functions that may already exist — search the codebase first.
- If your task depends on a decision that isn't documented in this file or in the codebase yet (e.g., an exact column name, an exact RLS policy), ask rather than inventing a name and hoping it matches what another agent chose.

### 0.6 When you are confused
- Say so explicitly: "I'm not sure about X because Y — can you clarify?" Do not produce a best-guess silently and move on.
- Never fabricate business logic for construction/payroll domain specifics (e.g., statutory deduction rules, PF/ESI percentages) — ask the developer, who will confirm with the client, rather than inventing plausible-sounding numbers.

---

## 1. PROJECT CONTEXT

**What this is:** A custom web application for a construction company (residential + commercial, ~4–10 active sites, 50–200 employees/labour) to replace an existing inadequate tool. The company's pain points: cannot track money per-site (they receive lump payments per site and can't tell which site is profitable), payroll is entirely manual with no attendance-to-wage automation, and there is no role-based access — supervisors currently see data they shouldn't.

**Who is building this:** A solo developer, not a domain expert in construction or accounting, building this primarily with AI coding assistance (Antigravity free tier + VSCode with Cline using Kimi via AWS Bedrock). Code must be written defensively and clearly, since the developer will rely on the AI's correctness more than usual — this is also why Section 0 above is non-negotiable.

**Who uses it:** Three roles — Admin (business owner), Office Manager (handles payroll/accounting), Supervisor (on-site, attendance only). See Section 5 for the full permission matrix.

**This handles real money and real wages for real workers.** Treat payroll, attendance, and financial calculations with the rigor of safety-critical code: deterministic, tested, auditable, and never silently wrong.

---

## 2. TECHNICAL STACK (fixed — do not substitute without asking)

### Frontend
- **Framework:** React 19 + Vite
- **Language:** TypeScript, strict mode enabled (`"strict": true` in tsconfig)
- **Routing:** React Router v7
- **UI components:** shadcn/ui (Radix primitives + Tailwind). Components are generated into the repo via the shadcn CLI and owned/edited directly — do not install alternate competing UI kits.
- **Styling:** Tailwind CSS only. No CSS-in-JS, no styled-components.
- **Icons:** lucide-react
- **Tables:** TanStack Table (for labour lists, attendance grids, payroll registers)
- **Charts:** Recharts (dashboard, P&L visuals)
- **Forms:** React Hook Form + Zod for schema validation. Every form must have a Zod schema — no unvalidated form submissions, especially for money fields.
- **Data fetching/caching:** TanStack Query — all Supabase reads/writes from the client go through Query hooks, not raw ad-hoc fetches scattered in components.
- **Global state:** Zustand — used only for session/auth/role state and minor UI state. Do not use it as a substitute for TanStack Query's server-state caching.
- **Dates:** date-fns
- **PDF export** (payslips, reports): react-pdf or jsPDF — decide based on complexity when we reach that feature; ask before picking.
- **Toasts/notifications:** sonner

### Backend
- **Platform:** Supabase (Postgres + Auth + Row Level Security + Edge Functions). No separate Express/Node server. No MongoDB.
- **Database:** PostgreSQL via Supabase. All schema changes via versioned SQL migration files (Supabase CLI migrations), never ad-hoc changes through the dashboard UI that aren't captured in a migration file.
- **Auth:** Supabase Auth (email/password). Each user has exactly one role stored in a `profiles` or `users` table (not in JWT custom claims unless we explicitly decide to use those later).
- **Authorization:** Row Level Security (RLS) policies enforce all role-based access at the database level. Application code must NEVER rely solely on hiding UI elements for security — RLS is the actual security boundary. Every table holding sensitive data must have RLS enabled with explicit policies; default-deny.
- **Business logic / calculations:** Wage calculations, payroll settlement, and any multi-step financial logic must live in Postgres functions (preferably `SECURITY DEFINER` where appropriate, used carefully) or Supabase Edge Functions — NOT computed client-side in React. The client may display results but must not be the source of truth for money math.
- **Hosting:** Supabase Pro plan ($25/mo) — required for no auto-pausing and daily backups. Do not build against Supabase Free tier assumptions (e.g., do not architect around the 500MB/7-day-pause constraints).

### Hosting / Infra
- **Frontend hosting:** Vercel (free Hobby tier), auto-deploy from GitHub on push to main.
- **Version control:** GitHub, private repository.
- **Secrets:** Supabase URL/anon key and any other secrets go in Vercel environment variables and a local `.env.local` (gitignored). NEVER commit secrets, API keys, or service role keys to the repository, in any file, at any time, even temporarily.
- **Service role key:** The Supabase service role key (which bypasses RLS) must NEVER be used in client-side code or exposed to the browser. It is only for trusted server-side contexts (Edge Functions) if absolutely needed.

---

## 3. SECURITY REQUIREMENTS (non-negotiable)

This app stores worker wage data, payment records, supplier financials, and personal information of employees. Build with the assumption that this WILL be attacked or probed eventually.

1. **RLS on every table, default deny.** No table is publicly readable/writable by default. Every policy must be scoped to authenticated users and their role/site assignment.
2. **Supervisor isolation must be enforced at the database, not the UI.** A supervisor's RLS policies must restrict rows to their assigned `site_id` for every table they can access (attendance, daily logs). A supervisor account must be unable to read another site's data even via direct API calls, browser devtools, or a modified request — test this explicitly.
3. **No client-side trust for role checks.** Never gate a sensitive action purely with `if (user.role === 'admin')` in React without a matching RLS policy backing it up. The React check is for UX only; the database check is the real boundary.
4. **Input validation on both ends.** Zod validation client-side for UX, but Postgres constraints (NOT NULL, CHECK constraints, foreign keys) must independently enforce data integrity — never trust the client.
5. **Audit trail for financial mutations.** CONFIRMED scope: every payroll payment, advance, expense, receipt, and rate-setting action must record `last_edited_by` (user id) and `last_edited_at` at minimum — no full before/after change history needed for this version.
6. **No secrets in source control.** Enforce via `.gitignore` from the very first commit. If you ever detect a secret accidentally staged or committed, flag it immediately and explain how to rotate/remove it — do not just silently delete and move on.
7. **Passwords/auth:** rely entirely on Supabase Auth's built-in handling. Do not write custom password hashing, custom JWT handling, or custom session logic.
8. **Rate limiting / abuse:** flag if Supabase's defaults seem insufficient once we get to login/auth screens — don't silently skip this consideration.
9. **Wage-visibility toggle is a real security boundary, not a UI convenience.** The `supervisor_wage_permissions` table (per-supervisor, per-site, Admin/Office-controlled) must be enforced via RLS on every table that exposes rates or computed wages. A supervisor without the toggle enabled must be unable to read wage data even via direct API calls — test this explicitly, the same way you'd test site-isolation.

---

## 4. CORE DATA MODEL (entities — confirm exact schema together before migrating)

These are the entities established so far. Do not invent additional fields or relationships beyond what's listed without asking. Do not assume exact column names/types — propose them, then confirm, then write the migration.

- **Sites/Projects** — site name, client name, client phone, budget, start date, status (active/on hold/completed), assigned site manager/supervisor.
- **Pay Receipts** — money received from client, per site: date, amount, payment mode (cash/GPay/bank).
- **Staff** — permanent employees (office/admin/accountant roles): name, email, role, monthly salary.
- **Staff Attendance** — daily status per staff member: present/absent/half-day/leave.
- **Labour** — daily-wage workers: name, default work category (mason/helper/etc.), default daily rate. A single labour entry may work different sites/job-types on different days at different rates (confirmed requirement — do not hardcode one rate per worker).
- **Labour Attendance** — per labour, per day, per site: status (present/absent/half-day/leave), site worked, job type/category for that day, rate applied that day.
- **Half-day wage multiplier** — configurable, not hardcoded to 0.5. CONFIRMED: both Admin and Supervisor can set/override this (see Section 5 and Section 7 for the permission nuance — supervisor's ability to set this and see its wage impact is gated by a per-supervisor, per-site toggle controlled by Admin/Office).
- **Labour Payroll / Wage Settlement** — settlement cycle runs **Monday to Saturday** (fixed calendar week, confirmed). Computes gross wages due (sum of daily wage × attendance status multiplier across the week, accounting for different site/rate per day), less any advances taken, equals net payable. See worked example in Section 6. Any unpaid/overdue balance **carries over to the next week** and must be visibly flagged as overdue (visible to Admin always, visible to Supervisor only if Admin has enabled wage visibility for that supervisor+site).
- **Labour Advances** — advance payments given to a labour, any time, against any site; **deducted immediately** from the current/next settlement (confirmed — not deferred); running balance tracked per labour, including any carried-over overdue amounts.
- **Suppliers** — name, contact, materials supplied.
- **Purchase Orders / Material Requests** — linked to a site and supplier.
- **Bills** — recorded against a purchase order.
- **Supplier Payments** — payments against bills; running balance owed per supplier.
- **Site Expenses** — category (material/transport/food/general), amount, date, site, optionally linked work type.
- **Office Expenses** — company-level, NOT tied to a site: rent, staff salary, transport, general.
- **Stock Transactions** — CONFIRMED: full live running stock balance per site (not just a transaction log). Every receipt/use/transfer updates a real-time stock-on-hand figure per site per material. **Stock update rights are Admin and Office Manager only** — Supervisors do not get write access to stock levels (build for simplicity/convenience as the developer sees fit, client has not asked for complex stock features like reorder alerts, etc. — keep it straightforward unless asked).
- **Users/Roles** — Admin, Office Manager, Supervisor. See Section 5 for full permission matrix. CONFIRMED: build a **flexible multi-site-capable schema from day one** — a Supervisor can be assigned to one or more sites via a many-to-many join table (e.g. `supervisor_site_assignments`), even though in practice most supervisors will initially be assigned to exactly one site. Do not hardcode a single `site_id` foreign key directly on the user/profile row.
- **Supervisor Wage-Visibility Settings** — NEW entity. A per-supervisor, per-site toggle (e.g. `supervisor_wage_permissions` table with `supervisor_id`, `site_id`, `can_view_set_wages boolean`) controlled exclusively by Admin or Office Manager. When enabled for a given supervisor+site pair, that supervisor can both set the half-day multiplier/job-type rate AND see the resulting ₹ wage amounts for that site. When disabled (the default), the supervisor can mark attendance and assign job-type/site but has zero visibility into rates or computed wages.

---

## 5. ROLE & PERMISSION MATRIX

| Feature / action | Admin | Office Manager | Supervisor |
|---|---|---|---|
| Create / edit sites | ✓ | ✗ | ✗ |
| View all sites | ✓ | ✓ | Own site only |
| Set project budget | ✓ | ✗ | ✗ |
| View site progress | ✓ | ✓ | Own site only |
| Mark labour attendance | ✓ | ✓ | Own site(s) only |
| Add / edit workers | ✓ | ✓ | ✗ |
| Mark staff attendance | ✓ | ✓ | ✗ |
| View attendance reports | ✓ | ✓ | Own site(s) only |
| Set half-day multiplier / job-type rate for a worker | ✓ | ✓ | Own site(s) only — always allowed to set the rule itself |
| View resulting ₹ wage amount after setting a rate | ✓ | ✓ | **Only if** Admin/Office has enabled the per-supervisor, per-site wage-visibility toggle for them |
| View payroll calculations | ✓ | ✓ | Only if wage-visibility toggle enabled for that site |
| Process / approve payroll | ✓ | ✓ | ✗ |
| Record advances | ✓ | ✓ | ✗ |
| Record pay receipts | ✓ | ✓ | ✗ |
| View per-site P&L | ✓ | ✓ | ✗ |
| Record expenses | ✓ | ✓ | ✗ |
| View all-company financials | ✓ | ✗ | ✗ |
| Update live stock levels | ✓ | ✓ | ✗ |
| Create / edit users | ✓ | ✗ | ✗ |
| Assign supervisor to site(s) | ✓ | ✗ | ✗ |
| Toggle supervisor wage-visibility (per supervisor, per site) | ✓ | ✓ | ✗ |
| View supervisor locations | ✓ | ✓ | ✗ |

Every row above must map to an actual RLS policy, not just a frontend route guard. The wage-visibility toggle in particular must be enforced by an RLS policy that checks the `supervisor_wage_permissions` table on every read of wage/payroll data — never just a frontend conditional render.

---

## 6. WAGE CALCULATION — WORKED EXAMPLE (must match exactly)

This is the canonical example the wage calculation logic must reproduce exactly. Use this as a test case.

```
Labour: Raju — Week of June 15–21
Mon: Site A, Mason, Full day, ₹1300
Tue: Site A, Mason, Full day, ₹1300
Wed: Site B, Helper, Half day, ₹1000 × 0.5 = ₹500
Thu: Absent, ₹0
Fri: Site A, Mason, Full day, ₹1300
Sat: Site A, Mason, Full day, ₹1300
─────────────────────────
Gross wages due: ₹5,700
Less advance taken (Tue): -₹2,000
─────────────────────────
Net payable this week: ₹3,700
```

Key rules embedded in this example:
- A single worker can have a different site AND different rate on different days within the same week.
- Half-day pay = daily rate × half-day multiplier (currently assumed 0.5, but this multiplier must be a configurable value, settable by Admin/Office always, and by Supervisor only when the per-supervisor/per-site wage-visibility toggle is enabled — see Section 4 and Section 5).
- Absent days contribute ₹0.
- Advances are subtracted from the gross total for the **current/immediate** settlement period — CONFIRMED, deducted immediately, not deferred.
- **The settlement cycle is a fixed calendar week, Monday to Saturday — CONFIRMED.**
- **Overdue carry-over — CONFIRMED:** if net payable for a week is not actually paid out (e.g. office hasn't settled it yet), the unpaid balance carries over and accumulates into the next week's settlement, and must be clearly flagged as "overdue" in the UI. This overdue flag is visible to Admin/Office always, and visible to a Supervisor only if wage-visibility is enabled for them on that site.

---

## 7. CONFIRMED CLIENT DECISIONS (formerly open questions — all resolved)

All previously open questions have been confirmed directly with the client. These are now firm requirements, not assumptions — do not re-litigate them without good reason, but DO flag if implementation reveals an inconsistency between two of these rules.

1. **Half-day wage permission:** Both Admin/Office Manager AND Supervisor can set the half-day multiplier — but a Supervisor's ability to do so (and to see the resulting wage amount) is gated by a per-supervisor, per-site toggle that only Admin/Office Manager controls.
2. **Wage rate visibility for Supervisors:** Confirmed they need to see/set ₹/day rates for labour. Gated the same way as #1 — disabled by default, Admin/Office can enable per-supervisor, per-site.
3. **Daily site/job-type assignment workflow:** Either Admin/Office or Supervisor can make this assignment, depending on the situation. All three roles should be able to assign a labour to a site + job-type for a given day (subject to the existing role-scoping — a Supervisor only for their own assigned site(s)).
4. **Settlement week definition:** Fixed calendar week, **Monday to Saturday**.
5. **Advance deduction timing:** Deducted immediately from the current/next settlement. Unpaid/overdue balances carry over week to week and must be flagged as overdue.
6. **Stock tracking depth:** Full live running stock balance per site, not just a transaction log. Write access restricted to Admin and Office Manager.
7. **Audit/edit-history requirements:** Just `last_edited_by` and `last_edited_at` on financial records — no full before/after change history needed for this version.
8. **Supervisor multi-site support:** Build the flexible multi-site-capable schema from day one (many-to-many `supervisor_site_assignments` join table), even though most supervisors will initially be assigned to just one site.

If any future requirement seems to conflict with one of these confirmed decisions, stop and flag the conflict explicitly rather than silently picking one over the other.

---

## 8. WHAT NOT TO DO

- Do not introduce MongoDB, Express, Railway, or any other backend/server pattern — the backend is Supabase only.
- Do not introduce a second UI component library alongside shadcn/ui.
- Do not compute wages, totals, or any money math in the React client as the source of truth — always defer to a Postgres function/Edge Function.
- Do not create tables, columns, or RLS policies "for the future" that weren't asked for.
- Do not auto-generate fake/placeholder business rules for things like PF/ESI/statutory deductions — these require real confirmation from the client via the developer.
- Do not assume currency formatting, timezone, or locale — confirm (likely INR, IST, but confirm before hardcoding).

---

## 9. WORKING AGREEMENT FOR THIS SESSION

At the start of any work session or task:
1. Briefly restate what you understand the task to be.
2. List any assumptions you would otherwise have to make, and ask about each one that isn't already answered in this document.
3. Propose a short plan with verification steps (Section 0.4).
4. Wait for go-ahead on anything flagged as uncertain before writing code.

At the end of any task:
1. Summarize exactly what changed and why.
2. Flag anything you touched that was outside the original scope (there shouldn't be any — if there is, explain why it was unavoidable).
3. Note any new open questions that came up during this task, and explicitly list them at the end of your response for the developer to confirm with the client — do not add them silently into Section 7, which is now a log of already-confirmed decisions only.
