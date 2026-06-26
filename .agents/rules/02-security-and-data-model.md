---
trigger: always_on
---

---
trigger: always_on
---

# Construction App — Part 2: Security & Data Model

Part 2 of 3 rule files (see also: 01-behavior-and-stack.md, 03-permissions-wages-and-decisions.md). Read all three before writing code.

---

## 3. SECURITY REQUIREMENTS (non-negotiable)

This app stores worker wage data, payment records, supplier financials, and employee personal info. Build with the assumption that this WILL be attacked or probed eventually.

1. **RLS on every table, default deny.** No table is publicly readable/writable by default. Every policy scoped to authenticated users and their role/site assignment.
2. **Supervisor isolation enforced at the database, not the UI.** A supervisor's RLS policies restrict rows to their assigned site(s) for every table they can access. Must be unable to read another site's data even via direct API calls, browser devtools, or a modified request — test this explicitly.
3. **No client-side trust for role checks.** Never gate a sensitive action purely with a frontend role check without a matching RLS policy backing it up. The frontend check is UX only; the database check is the real boundary.
4. **Input validation on both ends.** Zod client-side for UX, but Postgres constraints (NOT NULL, CHECK, foreign keys) independently enforce data integrity — never trust the client.
5. **Audit trail for financial mutations.** CONFIRMED scope: every payroll payment, advance, expense, receipt, and rate-setting action records `last_edited_by` and `last_edited_at` at minimum — no full before/after change history needed for this version.
6. **No secrets in source control.** Enforce via `.gitignore` from the first commit. If a secret is ever accidentally staged/committed, flag it immediately and explain how to rotate/remove it.
7. **Passwords/auth:** rely entirely on Supabase Auth's built-in handling. No custom password hashing, JWT handling, or session logic.
8. **Rate limiting / abuse:** flag if Supabase's defaults seem insufficient once we reach login/auth screens.
9. **Wage-visibility toggle is a real security boundary, not a UI convenience.** The `supervisor_wage_permissions` table (per-supervisor, per-site, Admin/Office-controlled) must be enforced via RLS on every table exposing rates or computed wages. A supervisor without the toggle enabled must be unable to read wage data even via direct API calls — test explicitly, same as site-isolation.

---

## 4. CORE DATA MODEL (entities — confirm exact schema together before migrating)

Do not invent additional fields or relationships beyond what's listed without asking. Propose exact column names/types, confirm, then write the migration.

- **Sites/Projects** — site name, client name, client phone, budget, start date, status (active/on hold/completed), assigned site manager/supervisor.
- **Pay Receipts** — money received from client, per site: date, amount, payment mode (cash/GPay/bank).
- **Staff** — permanent employees (office/admin/accountant roles): name, email, role, monthly salary.
- **Staff Attendance** — daily status per staff member: present/absent/half-day/leave.
- **Labour** — daily-wage workers: name, default work category, default daily rate. A single labour entry may work different sites/job-types on different days at different rates — do not hardcode one rate per worker.
- **Labour Attendance** — per labour, per day, per site: status (present/absent/half-day/leave), site worked, job type/category for that day, rate applied that day.
- **Half-day wage multiplier** — configurable, not hardcoded to 0.5. CONFIRMED: both Admin and Supervisor can set/override this (permission nuance in Part 3 — supervisor's ability to set this and see its wage impact is gated by a per-supervisor, per-site toggle controlled by Admin/Office).
- **Labour Payroll / Wage Settlement** — settlement cycle runs **Monday to Saturday** (fixed calendar week). Computes gross wages due (sum of daily wage × attendance multiplier across the week, accounting for different site/rate per day), less advances, equals net payable. See worked example in Part 3. Unpaid/overdue balance **carries over to the next week**, visibly flagged as overdue (visible to Admin always, to Supervisor only if wage visibility enabled for that supervisor+site).
- **Labour Advances** — advance payments given to a labour, any time, against any site; **deducted immediately** from the current/next settlement; running balance tracked per labour, including carried-over overdue amounts.
- **Suppliers** — name, contact, materials supplied.
- **Purchase Orders / Material Requests** — linked to a site and supplier.
- **Bills** — recorded against a purchase order.
- **Supplier Payments** — payments against bills; running balance owed per supplier.
- **Site Expenses** — category (material/transport/food/general), amount, date, site, optionally linked work type.
- **Office Expenses** — company-level, NOT tied to a site: rent, staff salary, transport, general.
- **Stock Transactions** — CONFIRMED: full live running stock balance per site, not just a transaction log. Every receipt/use/transfer updates a real-time stock-on-hand figure per site per material. **Stock update rights: Admin and Office Manager only.** Build for simplicity/convenience — no reorder alerts or complex features unless asked.
- **Users/Roles** — Admin, Office Manager, Supervisor (full matrix in Part 3). CONFIRMED: build a **flexible multi-site-capable schema from day one** — a Supervisor can be assigned to one or more sites via a many-to-many join table (e.g. `supervisor_site_assignments`). Do not hardcode a single `site_id` foreign key directly on the user/profile row.
- **Supervisor Wage-Visibility Settings** — NEW entity. A per-supervisor, per-site toggle (e.g. `supervisor_wage_permissions` table: `supervisor_id`, `site_id`, `can_view_set_wages boolean`) controlled exclusively by Admin or Office Manager. When enabled, that supervisor can set the half-day multiplier/job-type rate AND see resulting ₹ wage amounts for that site. When disabled (default), supervisor marks attendance and assigns job-type/site but has zero visibility into rates or computed wages.
