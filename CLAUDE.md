# Construction Site Management App — Claude Code Instructions

This is the single source of truth for this project. Read it fully before writing any code. If anything here is ambiguous, contradictory, or insufficient to proceed safely, STOP and ask rather than assuming.

---

## 0. HOW YOU MUST BEHAVE (applies to every task, every session)

### 0.1 Think Before Coding
- Do NOT silently pick an interpretation when a requirement is ambiguous. Present the possible interpretations and ask which one is correct.
- Before writing code for any non-trivial feature, state your understanding of the requirement in 2-4 sentences and your implementation plan, then wait for confirmation if anything was uncertain.
- If about to assume a business rule, data relationship, permission boundary, UI behavior, or financial calculation — STOP and ask. Financial and payroll logic especially must never be assumed.
- Surface tradeoffs. If there are two reasonable ways to build something, explain the tradeoff briefly and ask for a preference.

### 0.2 Simplicity First
- Write the minimum code that solves the stated problem. No speculative features, no "just in case" configurability that wasn't requested.
- No abstractions for single-use code. No premature generalization.
- If a simpler implementation meets the requirement, propose it instead.
- Don't add error handling for scenarios that cannot occur given the app's constraints.

### 0.3 Surgical Changes
- When editing existing files, change only what the task requires. Do not reformat, "clean up," or refactor unrelated code.
- Match existing code style and naming conventions exactly.
- If you notice dead code or something questionable outside scope, mention it — do not delete or fix it unprompted.
- Remove only imports/variables/functions that YOUR change made unused.

### 0.4 Goal-Driven Execution
- For any non-trivial task, state a short numbered plan with a verification step for each item before executing.
- Prefer writing a quick test or verification before declaring a task complete, especially for payroll/wage calculations — this is real money for real workers.

### 0.5 Multi-agent coordination
- Check actual codebase/schema state before building on top of anything — don't assume another session already completed a dependent task.
- Search the codebase for existing implementations before creating new ones.

### 0.6 When you are confused
- Say so explicitly: "I'm not sure about X because Y — can you clarify?"
- Never fabricate business logic for construction/payroll domain specifics (PF/ESI rates, statutory rules, etc.) — ask rather than inventing plausible numbers.

---

## 1. PROJECT CONTEXT

**What this is:** A custom web app for a Kerala-based construction company (residential + commercial, 4–10 active sites, 50–200 employees/labour) replacing an inadequate existing tool. Key pain points solved: per-site money tracking, automated payroll calculation from attendance, role-based access control.

**Who uses it:** Three roles — Admin (owner/director), Office Manager (payroll/accounting), Supervisor (on-site attendance only).

**This handles real money and real wages for real workers.** Treat payroll, attendance, and financial calculations like safety-critical code: deterministic, tested, auditable, never silently wrong.

**Deployed:** React frontend on Vercel, Supabase Pro backend (no auto-pause, daily backups).

---

## 2. TECHNICAL STACK (fixed — do not substitute without asking)

### Frontend
- **Framework:** React 19 + Vite, TypeScript strict mode (`"strict": true`)
- **Routing:** React Router v7
- **UI:** shadcn/ui (Radix + Tailwind) — components generated into repo via CLI, owned directly
- **Styling:** Tailwind CSS only. No CSS-in-JS.
- **Icons:** lucide-react
- **Tables:** TanStack Table
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod — every form must have a Zod schema, especially money fields
- **Data fetching:** TanStack Query — all Supabase reads/writes go through Query hooks
- **Global state:** Zustand — session/auth/role state only
- **Dates:** date-fns
- **Toasts:** sonner
- **PDF (future):** react-pdf or jsPDF — ask before picking

### Backend
- **Platform:** Supabase (Postgres + Auth + RLS + Edge Functions). No Express/Node server. No MongoDB.
- **Database:** PostgreSQL. All schema changes via versioned SQL migration files in `supabase/migrations/` — never ad-hoc dashboard changes.
- **Auth:** Supabase Auth (email/password). User role stored in `profiles` table.
- **Authorization:** Row Level Security (RLS) enforces all role-based access at the database level. Application code must NEVER rely solely on hiding UI elements for security.
- **Business logic:** Wage calculations, payroll settlement, financial logic lives in Postgres functions or Supabase Edge Functions — NOT computed client-side.
- **Attendance reads:** Always use `labour_attendance_secure` view (not `labour_attendance` base table) for all attendance reads. The view masks `rate_applied` for unauthorized supervisors.

### Hosting
- **Frontend:** Vercel, auto-deploy from GitHub main branch
- **Backend:** Supabase Pro plan
- **Secrets:** In Vercel env variables + local `.env.local` (gitignored). NEVER commit secrets.
- **Service role key:** Never in client-side code or exposed to the browser.

---

## 3. SECURITY REQUIREMENTS (non-negotiable)

1. **RLS on every table, default deny.** Every policy scoped to authenticated users and their role.
2. **Supervisor isolation enforced at the database level.** Supervisors can only see their assigned site(s) data even via direct API calls — test this explicitly.
3. **No client-side trust for role checks.** Frontend checks are UX only; database RLS is the real boundary.
4. **Input validation on both ends.** Zod client-side, Postgres constraints (NOT NULL, CHECK, FK) independently.
5. **Audit trail:** `last_edited_by` (UUID) and `last_edited_at` (TIMESTAMPTZ) on all financial mutation tables.
6. **No secrets in source control.** Flag immediately if any secret is accidentally staged.
7. **Passwords/auth:** Supabase Auth only. No custom hashing or JWT logic.
8. **Wage-visibility toggle is a real security boundary.** `supervisor_wage_permissions` table enforced via RLS on every table exposing rates or computed wages.

---

## 4. DATABASE — CURRENT STATE (39 migrations as of 2026-07-21)

Key tables and their purpose:
- `profiles` — users, roles (admin/office_manager/supervisor)
- `sites` — construction projects with budget, client, status
- `site_phases` — % complete per construction phase per site (foundation/structure/mep/finishing/handover, fixed enum, independent — not sequentially gated). Auto-seeded at 0% by a trigger on site creation.
- `site_settings` — per-site half-day multiplier (fallback when worker has no half_day_rate)
- `supervisor_site_assignments` — many-to-many supervisors ↔ sites
- `supervisor_wage_permissions` — per-supervisor per-site wage visibility toggle
- `staff` + `staff_attendance` — permanent salaried employees
- `labour` — daily wage workers (default_daily_rate, half_day_rate nullable, overtime_rate nullable)
- `labour_attendance` — per worker per day per site (status, work_category, rate_applied, overtime_hours nullable)
- `labour_attendance_secure` — view masking rate_applied for supervisors without wage visibility
- `labour_settlements` — weekly payroll settlements (Mon–Sat cycle)
- `labour_advances` — advances against workers, deducted from next settlement
- `site_labour_assignments` — roster membership (which workers appear on a site's attendance screen)
- `labour_site_assignments` — rate/category assignments per site with date ranges
- `pay_receipts` — client payments received per site
- `site_expenses` + `office_expenses` — expenses at site or company level
- `suppliers` + `purchase_orders` + `bills` + `supplier_payments` — procurement chain
- `materials` + `stock_levels` + `stock_transactions` — live stock tracking with trigger
- `site_labour_assignments` — roster: which workers appear on each site's attendance screen

Key Postgres functions:
- `get_my_role()` — returns role for current JWT user
- `is_supervisor_for_site(site_id)` — checks supervisor_site_assignments
- `has_wage_visibility(site_id)` — checks supervisor_wage_permissions
- `get_labour_active_site_count(labour_id)` — SECURITY DEFINER, returns true cross-site count
- `calculate_weekly_settlement(labour_id, week_start, last_edited_by)` — the payroll function
- `mark_settlement_paid(settlement_id, amount, mode, edited_by)` — marks settlement paid
- `get_site_pnl(site_id)` — site-level P&L
- `transfer_stock_between_sites(...)` — atomic stock transfer

---

## 5. ROLE & PERMISSION MATRIX

| Feature | Admin | Office Manager | Supervisor |
|---|---|---|---|
| Create/edit sites | ✓ | ✗ | ✗ |
| View all sites | ✓ | ✓ | Own site(s) only |
| Mark labour attendance | ✓ | ✓ | Own site(s) only |
| Add/edit workers | ✓ | ✓ | ✗ |
| Set half-day rate / overtime rate | ✓ | ✓ | ✗ |
| Set job-type rate for a worker | ✓ | ✓ | Own site(s) — always |
| View ₹ wage amounts | ✓ | ✓ | Only if wage-visibility toggle ON for that site |
| Mark overtime hours | ✓ | ✓ | Own site(s) — always (operational, not financial) |
| View/edit work progress (site phases) | ✓ | ✓ | Own site(s) — always (operational, not financial) |
| Process/approve payroll | ✓ | ✓ | ✗ |
| Record advances | ✓ | ✓ | ✗ |
| Record pay receipts | ✓ | ✓ | ✗ |
| View per-site P&L | ✓ | ✓ | ✗ |
| Record expenses | ✓ | ✓ | ✗ |
| View office expenses | ✓ | ✓ | ✗ |
| Update stock levels | ✓ | ✓ | ✗ |
| Create/edit users | ✓ | ✗ | ✗ |
| Toggle supervisor wage-visibility | ✓ | ✓ | ✗ |
| Manage work categories | ✓ | ✓ | ✗ |

Every row maps to an actual RLS policy — not just a frontend route guard.

---

## 6. WAGE CALCULATION — CANONICAL WORKED EXAMPLE

The `calculate_weekly_settlement()` function must always reproduce this:

```
Labour: Raju — Week of June 15–21 (half_day_rate=NULL, overtime_rate=NULL)
Mon: Site A, Mason, Full day, ₹1300
Tue: Site A, Mason, Full day, ₹1300
Wed: Site B, Helper, Half day, ₹1000 × 0.5 (site multiplier) = ₹500
Thu: Absent, ₹0
Fri: Site A, Mason, Full day, ₹1300
Sat: Site A, Mason, Full day, ₹1300
Gross wages: ₹5,700 | Advance: -₹2,000 | Net payable: ₹3,700
```

Half-day logic:
- If `labour.half_day_rate IS NOT NULL` → use that fixed amount
- If NULL → fallback: `rate_applied × site_settings.half_day_multiplier`

Overtime logic:
- If `labour.overtime_rate IS NOT NULL` AND `labour_attendance.overtime_hours > 0` → add `overtime_hours × overtime_rate` to that day's wage
- Otherwise → no overtime pay

Settlement cycle: Monday–Saturday (fixed calendar week). Advances deducted immediately. Overdue balances carry over and are flagged.

---

## 7. KNOWN GAPS & DEFERRED DECISIONS

See `KNOWN_GAPS.md` for full details. Summary of open items:

1. **Stock transfer atomicity** — resolved in migration 031 via `transfer_stock_between_sites()` atomic function
2. **rate_applied exposure via direct base table** — accepted gap, documented. App should always query `labour_attendance_secure` view.
3. **labour_site_assignments / site_labour_assignments linkage** — ending a rate assignment (end_date set) triggers `is_active = false` on the roster table via application layer (useEndLabourSiteAssignment hook)

**Active bugs being worked:**
- (none currently — see Recently resolved below)

**Recently resolved:**
- RESOLVED 2026-07-21 — Sidebar navigation breaks after several clicks (URL changes but content doesn't re-render). Root cause: `useAttendance.ts` returned a fresh `[]` on every render when no site was selected, causing an infinite render loop on `/attendance` (see KNOWN_GAPS.md, RESOLVED entry). Fixed with a stable empty-array reference. Not fully confirmed this was the sole explanation for freezes at production data scale — watch for recurrence.
- RESOLVED 2026-07-21 — OT Hours field not appearing in global Attendance screen. Fixed by routing supervisors directly to their assigned site's Attendance tab (`/sites/:siteId?tab=attendance`) instead of the global `/attendance` route, with a site picker shown when they have more than one assigned site. Admin/Office Manager still use the global route unchanged. Applied consistently across all three entry points: desktop sidebar (`ProtectedLayout.tsx`), mobile bottom nav (`MobileBottomNav.tsx`), and the Dashboard "Mark Attendance" quick action (`Dashboard.tsx`) — shared logic lives in `src/hooks/useAttendanceNavigation.ts` and `src/components/AttendanceSitePickerDialog.tsx`.
- RESOLVED 2026-07-21 — `labour_attendance_secure` view was missing the `overtime_hours` column (added to the base table on 2026-07-13 but never propagated to the view), causing every read of OT hours through the view to 400. Fixed via new migration `20260721080001_add_overtime_hours_to_attendance_secure_view.sql`, exposing `overtime_hours` unmasked (operational, not financial, per the role/permission matrix) alongside the still-masked `rate_applied`. Verified end-to-end with real test data as both a supervisor without wage visibility and admin — see KNOWN_GAPS.md for full verification detail.
- RESOLVED 2026-07-21 — P&L Reports screen showing ₹0. Root cause: `get_site_pnl()` itself was correct (verified directly via SQL and via the live authenticated RPC call, not an RLS issue); `Reports.tsx` simply defaulted to the current calendar month, and site data happened to be dated in a different month, so it silently rendered a real, correctly-empty result as if broken. Fixed by defaulting to a new "All Time" period option and showing "No data for this period" per-site instead of a misleading ₹0.00 breakdown when a user does select a genuinely empty period — see KNOWN_GAPS.md for full verification detail.
- BUILT 2026-07-21 — Work progress tracking. New `site_phases` table (5 fixed phases, independent/not sequentially gated, manual entry, view+edit for Admin/Office Manager all sites and Supervisor own site(s) — see Section 5). Displays as a compact read-only summary on SiteDetail's Overview tab and a full editing UI on a new Progress tab. See KNOWN_GAPS.md for full design rationale and verification detail.

**Pending features:**
- Mobile Sheet forms (currently using desktop Dialog on mobile)
- Admin-configurable work categories — `work_categories` is described in earlier notes as an existing admin-configurable table, but it was never built. Work categories are currently a hardcoded `WORK_CATEGORIES` array duplicated in `src/routes/Labour.tsx` and `src/routes/Attendance.tsx`. Treat this as a pending feature, not existing infrastructure, until a real table + admin UI is built.

---

## 8. WHAT NOT TO DO

- Do not introduce MongoDB, Express, Railway, or any other backend/server
- Do not introduce a second UI component library alongside shadcn/ui
- Do not compute wages, totals, or money math in React as the source of truth
- Do not create tables, columns, or RLS policies speculatively
- Do not fabricate PF/ESI/statutory deduction rules — ask the developer
- Do not assume currency/timezone/locale — it's INR, IST (confirm before hardcoding)
- Do not modify existing migration files — always create new ones
- Do not use the Supabase service role key in client-side code

---

## 9. WORKING AGREEMENT

At the start of any task:
1. Briefly restate what you understand the task to be
2. List any assumptions you would otherwise make, and ask about each
3. Propose a numbered plan with verification steps
4. Wait for go-ahead on anything uncertain before writing code

At the end of any task:
1. Summarize exactly what changed and why
2. Flag anything touched outside original scope
3. List any new open questions explicitly — do not silently fold them into decisions
