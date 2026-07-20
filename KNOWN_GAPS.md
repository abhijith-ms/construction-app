# Known Gaps & Deferred Decisions

This file tracks design debt and deferred decisions that were made deliberately (not oversights) but need to be revisited at a specific later point. Check this file before building any feature listed below — do not assume the gap has been silently closed since it was written here.

---

## RESOLVED — P&L Reports screen showing ₹0.00 for everything

**Where:** `src/routes/Reports.tsx`, `src/hooks/usePnlReport.ts` (RPC wrapper, unchanged), `get_site_pnl()` Postgres function (unchanged — proven correct, not the bug).

**What:** `Reports.tsx` defaulted `periodMode` to `"monthly"`, computing `fromDate`/`toDate` from `new Date()` — i.e. the current calendar month. Greenfield Residency's real data (₹5,00,000 income via `pay_receipts` dated 2026-06-01; ₹97,000 total cost via `site_expenses` dated 2026-06-13/14 and `bills` dated 2026-06-12) all falls in June, not the current month (July when this was diagnosed). `get_site_pnl()` filters every sub-query with `date BETWEEN p_from AND p_to`, so a July-only range legitimately produces an all-zero result — the function was never wrong, it was answering the question it was actually asked ("what happened in July") correctly.

**Diagnosis process (documented since this is financial data):**
1. `get_site_pnl('...', '2026-07-01', '2026-07-31')` → all zeros — reproduces the bug at the SQL level.
2. `get_site_pnl('...', '2026-06-01', '2026-06-30')` → `total_income: 500000, total_cost: 97000, net_profit: 403000` — exact match to the real figures, proving the function itself is correct.
3. Live network capture of the app's actual authenticated RPC call (not the CLI's superuser bypass) for the July default → `HTTP 200` with a correctly-shaped, real (non-error) array of zeros — ruling out RLS/grants (`EXECUTE` is granted to `PUBLIC`, which every role inherits) and ruling out a frontend response-shape bug.

**Fix:** `Reports.tsx` now defaults `periodMode` to a new `"all"` option ("All Time" tab), using a fixed wide range (`2000-01-01` to `2100-12-31`) since `get_site_pnl`'s `BETWEEN p_from AND p_to` requires concrete bounds — passing `NULL` does not mean "unfiltered," it makes every `BETWEEN` comparison evaluate to `NULL` (false), which would have produced the exact same misleading all-zero result. Additionally, `PnLCard` now detects a genuinely empty row (`total_income === 0` and all four cost components `=== 0`) and renders "No data for this period" instead of the full ₹0.00 breakdown grid, so a user who deliberately picks an empty period sees an explicit empty state rather than something that looks broken. Date-range prev/next navigation buttons are hidden in "All Time" mode (nothing to page through) and reappear for Weekly/Monthly/Yearly.

**Verification:** Playwright, live against local seed data — default load (no interaction) shows Greenfield Residency: Income ₹5,00,000.00, Total Cost ₹97,000.00, Net Profit ₹4,03,000.00 — exact match to the real figures, confirming the fix without needing the user to know to navigate to June first. Switching to Monthly (defaults to July, empty) shows "No data for this period" per site instead of ₹0.00. Clicking Previous from July correctly reaches June and shows the same real figures again, confirming period navigation still works. `tsc -b` clean.

**Status:** RESOLVED on 2026-07-21.

---

## RESOLVED — Supervisors routed to global `/attendance` instead of their site's Attendance tab

**Where:** `src/hooks/useAttendanceNavigation.ts` (new, shared decision logic), `src/components/AttendanceSitePickerDialog.tsx` (new, shared picker UI), consumed by `src/routes/ProtectedLayout.tsx` (desktop sidebar), `src/components/MobileBottomNav.tsx` (mobile bottom nav), `src/routes/Dashboard.tsx` ("Mark Attendance" quick action). Tab targeting via `src/routes/SiteDetail.tsx`'s new `?tab=` read on mount.

**What:** All three "Attendance" entry points previously hardcoded `navigate("/attendance")` for every role, including supervisors — routing them to a screen missing the OT Hours field instead of the SiteDetail Attendance tab where it exists.

**Fix:** Admin/Office Manager unchanged (still `/attendance`). Supervisors: 0 assigned sites → falls back to `/attendance`; 1 site → `/sites/:siteId?tab=attendance` directly; 2+ sites → `AttendanceSitePickerDialog` shown first. All three entry points now share the same `useAttendanceNavigation()` hook and picker component, so there's a single place to change this behavior going forward.

**Verification:** Playwright, both desktop and mobile (390×844) viewports — `vikram@constructionapp.local` (1 site) and `anil@constructionapp.local` (2 sites) tested against all three entry points; `admin@constructionapp.local` confirmed unchanged. `tsc -b` clean.

**Status:** RESOLVED on 2026-07-21.

---

## RESOLVED — `labour_attendance_secure` view is missing `overtime_hours`, breaking OT reads

**Where:** View definition, now in `supabase/migrations/20260721080001_add_overtime_hours_to_attendance_secure_view.sql` (supersedes the column list from `20260623080017_fix_view_security_invoker.sql`); consumed by `src/hooks/useTodaySiteAttendance.ts`, read from `src/routes/SiteDetail.tsx`'s Attendance tab.

**What:** `supabase/migrations/20260713080003_add_overtime_hours_to_attendance.sql` added `overtime_hours` to the base `labour_attendance` table on 2026-07-13, but no migration ever added it to the `labour_attendance_secure` view's explicit column list. Any query selecting `overtime_hours` through the secure view failed with Postgres error `42703: column labour_attendance_secure.overtime_hours does not exist`.

**Observed behavior (before fix):** Confirmed live via Playwright, reproducible for every role (tested as both `admin` and a `supervisor`, not a permissions issue): visiting a site's Attendance tab (`/sites/:id?tab=attendance`) fired a request to `labour_attendance_secure` selecting `overtime_hours` that 400'd. The tab still rendered (status buttons, category selector, OT input) but today's already-marked attendance never loaded into it.

**Fix:** New migration `20260721080001_add_overtime_hours_to_attendance_secure_view.sql` recreates the view (`CREATE OR REPLACE VIEW`, same `security_invoker = true`) with `overtime_hours` added as a **plain passthrough column** — not masked like `rate_applied`. Per CLAUDE.md's role/permission matrix, "Mark overtime hours" is explicitly "operational, not financial" and available to supervisors on their own site(s) always, independent of the wage-visibility toggle (which only ever gated `rate_applied`). Row-level RLS on the base table still restricts which rows a supervisor can see at all. Note: Postgres's `CREATE OR REPLACE VIEW` only allows *appending* columns at the end of the existing list — inserting `overtime_hours` next to `rate_applied` mid-list errored with "cannot change name of view column", so it's appended after `last_edited_at` instead.

**Verification:** Applied directly to the local Supabase Postgres container (`docker exec supabase_db_construction-app psql ...` — no Supabase CLI available in this environment) and confirmed via `\d public.labour_attendance_secure` that `overtime_hours numeric(5,2)` is present and `security_invoker=true` is preserved. Inserted a real test attendance row (Raju, Greenfield Residency, `overtime_hours = 3.5`), then via Playwright: (1) as `vikram` (supervisor, wage visibility **disabled**) — 0 console errors, 0 400s, OT Hours input correctly shows `3.5`, and the raw API response confirms `rate_applied: null` (still masked) alongside `overtime_hours: 3.5` (unmasked); (2) as `admin` — same request returns `rate_applied: 1300` (unmasked, as expected) alongside `overtime_hours: 3.5`. Test data removed afterward, DB restored to original seed state. `tsc -b` clean.

**Status:** RESOLVED on 2026-07-21.

---

## RESOLVED — Infinite render loop on `/attendance` when no site is selected

**Where:** `src/hooks/useAttendance.ts:32`, consumed by `src/routes/Attendance.tsx:317-368`

**What:** `useAttendance()` returns `data ?? []` — a brand-new array literal on every render whenever the query has no data (which is the case whenever `enabled` is `false`, i.e. whenever no site is selected, since `enabled: !!siteId`). `Attendance.tsx` has a `useEffect` with `existingAttendance` in its dependency array; because that reference changes on every render, the effect body re-runs every render, and when `selectedSiteId === ""` it calls `setAttendanceState(new Map())` — again a new object every time, which is never `Object.is`-equal to the previous state, so React schedules another render. This produces a genuine render → effect → setState → render loop.

**Observed behavior:** Reproduced live via Playwright — navigating to `/attendance` (its default state has no site pre-selected) reliably logs ~20-25 "Maximum update depth exceeded" React warnings. React's dev-mode nested-update guard caps the loop at ~50 iterations and gives up, so it self-heals and the final rendered content is correct with the small local seed dataset (4 workers) — but real CPU/time is burned on every single mount of this page in this state, and the cost scales with how expensive each of those ~50 wasted re-renders is (this page renders one row/card per active worker). With production-scale data (50-200 workers per CLAUDE.md), this is a plausible cause of the sidebar-navigation freeze reported in CLAUDE.md Section 7, though that has not yet been confirmed against production-scale data.

**Fix:** Gave the hook a stable empty-array reference instead of allocating a new one each render — module-level `const EMPTY_ATTENDANCE: Attendance[] = [];` returned via `data ?? EMPTY_ATTENDANCE`.

**Verification:** Re-ran the exact Playwright repro (fresh dev server, Sites → Labour Pool → Attendance) that reliably produced 23 "Maximum update depth exceeded" warnings before the fix — 0 warnings after, on two independent cold-start runs. Also verified the site-selected flow (selecting a site, attendance grid loading with real records) still works with 0 console errors, and `tsc -b` passes clean.

**Status:** RESOLVED on 2026-07-21.

---

## OPEN — Duplicate Sheet + Dialog mount in Labour.tsx (`AssignmentSheet`, `AdvanceSheet`)

**Where:** `src/routes/Labour.tsx` — `AssignmentSheet` (~line 1170-1195) and `AdvanceSheet` (~line 1355-1401)

**What:** Both components render a mobile `<Sheet>` and a desktop `<Dialog>` simultaneously, distinguished only by wrapping them in `hidden md:block` / (mobile equivalent) CSS classes — not by conditional rendering. Radix's `Dialog`/`Sheet` primitives portal their content to `document.body`, which is outside those wrapper divs, so the CSS hiding does not stop the "wrong" one from mounting. Both share a single `react-hook-form` `control` from one `useForm()` call, with two separate `<Controller name="site_id" ...>` (AssignmentSheet) / `<Controller name="site_id" ...>` (AdvanceSheet) registrations for the same field name.

**Risk:** When `isOpen` is true, this likely mounts two overlays and two forms into the DOM at once (one per breakpoint variant) instead of exactly one, and two `Controller`s registering the same field name against one RHF instance is an unsupported pattern that can cause registration/re-render thrashing. Confirmed via DOM inspection that neither is mounted while `isOpen` is false (Radix's `Presence` correctly skips rendering when closed), so this is unrelated to the render-loop bug above — it only manifests once a user actually opens the Assignment or Advance sheet.

**When to fix:** Not fixed in this session per instruction — flagged for a follow-up. Likely fix is to pick one of `<Sheet>`/`<Dialog>` based on `useIsMobile()` (already used elsewhere in the app, see `src/hooks/use-mobile.ts`) rather than mounting both.

**Status:** Diagnosed 2026-07-21, not fixed.

---

## RESOLVED — Stock transfer atomicity

**Fixed in:** migration `20260701080031_stock_transfer_function.sql`

**Fix:** `transfer_stock_between_sites()` Postgres function inserts both `transfer_out` and `transfer_in` rows atomically in a single transaction. Cannot partially fail. The function is `SECURITY DEFINER` with role gating (admin/office_manager only), includes an explicit `IS NULL` check before the `NOT IN` check to prevent the SQL NULL-evaluation silent-pass security hole, and is GRANT EXECUTE'd to `authenticated` for RPC access.

**Also fixed:** The naive `NOT IN ('admin', 'office_manager')` check in the original proposal had a security hole — `NULL NOT IN (...)` evaluates to `NULL`, not `TRUE`, so an unauthenticated caller (no JWT) would silently pass the check. Fixed with `v_role IS NULL OR v_role NOT IN ('admin', 'office_manager')`.

**Verification:** Confirmed via `supabase db reset` (all 31 migrations clean) + direct SQL test showing Greenfield OPC Cement drops from 70→60 and Lakeview gains 0→10 on a 10-bag transfer.

**Status:** RESOLVED on 2026-07-02

---

## OPEN — Partial payment UI deferred

**Where:** `src/routes/Payroll.tsx`, `mark_settlement_paid()` DB function

**What:** The DB function supports partial payments (`payment_status = 'partial'` when `amount_paid < net_payable`), but the UI only has a full "Mark as Paid" button. No amount input field exists yet.

**When to fix:** When the client confirms they need partial payment tracking. At that point, add an amount input to the Pay button flow in Payroll.tsx.

**Status:** Deferred intentionally.

---

## RESOLVED — rate_applied exposure via direct base table query (accepted, not a gap)

**Where:** `labour_attendance` table RLS policies + `labour_attendance_secure` view (migrations 015, 016, 017)

**What:** During RLS implementation, the original plan was to revoke all direct SELECT access to the base `labour_attendance` table and force every read through `labour_attendance_secure`, which masks `rate_applied` to NULL for supervisors without wage visibility. That approach broke (a `security_invoker` view requires the caller to have their own GRANT on the base table — RLS and GRANT are separate mechanisms), so the final design restores base-table SELECT access, gated by the same row-level RLS as before.

**Consequence:** A supervisor without wage visibility CAN see `rate_applied` if a query goes directly against the base `labour_attendance` table instead of the secure view — but only for rows on their own assigned site(s). They still cannot see other sites' data (row-level RLS still applies), and they still cannot set/write `rate_applied` without wage visibility (enforced by the `guard_rate_applied_write` trigger regardless of which table/view is used).

**Decision:** Accepted as-is on 2026-06-24. The original concern was about a supervisor seeing money data for sites they're not responsible for, or manipulating pay — both remain fully blocked. Seeing the rate for their own assigned site's workers is judged acceptable; only the write-side restriction was actually load-bearing for the project's security goals.

**Status:** RESOLVED — not an open gap. Application code should still prefer querying `labour_attendance_secure` where practical (it's cleaner and matches the original design intent), but there is no requirement to enforce this at the database level going forward.

---

## COMPLETED — Supplier Management UI

**Where:** New route `/suppliers`, hooks in `src/hooks/useSuppliers.ts`, `src/hooks/useCreateSupplier.ts`, `src/hooks/useUpdateSupplier.ts`

**What:** Implemented basic supplier management with:
- `supplier_balances` view in migration `20260623080022` showing running balance owed per supplier
- List view with table showing: name, contact, materials, active status, balance owed (INR formatted, red when positive)
- Add Supplier dialog with Zod validation
- Edit Supplier dialog to update all fields plus toggle active/inactive
- Role-gated to Admin and Office Manager only (page shows "no permission" if accessed by Supervisor)
- Navigation link in header (Truck icon)

**Verified:** Build passes, TypeScript strict mode clean

**Status:** COMPLETED on 2026-06-26

---

## COMPLETED — Supplier Detail / Purchase Orders Page

**Where:** New route `/suppliers/:id`, hooks `useSingleSupplier.ts`, `usePurchaseOrders.ts`, `useCreatePurchaseOrder.ts`, `useUpdatePurchaseOrder.ts`

**What:** Implemented supplier drill-down page at `/suppliers/:id` with:
- Displays supplier info: name, contact details, materials supplied, balance owed
- Purchase Orders table showing: order date, site name, description, amount (INR formatted), status with color-coded badges
- Status badges: Pending (yellow), Approved (blue), Received (green), Cancelled (red)
- Add Purchase Order dialog with site dropdown, description, amount, date, status
- Edit Purchase Order dialog (inline editing via pencil icon)
- Sites dropdown populated from the sites table
- Row navigation on Suppliers list page (cursor-pointer + click to navigate)
- Edit button uses `e.stopPropagation()` to prevent row navigation when clicking
- Role-gated to Admin and Office Manager only
- Back button to return to suppliers list

**Database support:** Uses existing `purchase_orders` table with `supplier_id` FK

**Verified:** Build passes, TypeScript strict mode clean, no runtime errors

**Status:** COMPLETED on 2026-06-26

---

## COMPLETED — Bills Inline under Purchase Orders

**Where:** Hook files `useBills.ts`, `useCreateBill.ts`, and updates to `SupplierDetail.tsx`

**What:** Implemented inline bills display nested under purchase orders:
- `useBills.ts` — Fetches bills for a `purchase_order_id` via TanStack Query
- `useCreateBill.ts` — Creates bill with `last_edited_by` set to current user ID
- Row-level expand/collapse toggle (chevron icon) on each PO row
- Expanded section shows inline table with: Bill Number, Bill Date, Amount (₹)
- "Add Bill" button per PO (hidden when PO status is 'cancelled')
- Add Bill dialog with: bill_number (optional), bill_date (defaults today), amount (required)
- Bills are append-only (no edit/delete per spec — financial records)
- Mutually exclusive expansion (only one PO can be expanded at a time)
- INR formatting for amounts

**Hook File Coverage:**

| File | Purpose | Covered |
|------|---------|--------|
| useBills.ts | Fetch bills per PO | ✅ |
| useCreateBill.ts | Create bill with last_edited_by | ✅ |

**Verified:** Build passes, TypeScript strict mode clean

**Status:** COMPLETED on 2026-06-26

---

## COMPLETED — Supplier Payments

**Where:** Hook files `useSupplierPayments.ts`, `useCreateSupplierPayment.ts`, `useBillsForSupplier.ts`, and updates to `SupplierDetail.tsx`

**What:** Implemented payments per-supplier with the following features:
- `useBillsForSupplier.ts` — Fetches all bills for a supplier across all POs (for bill dropdown selection)
- `useSupplierPayments.ts` — Fetches payments for a supplier with joined bill info (bill_number, bill_date, PO description)
- `useCreateSupplierPayment.ts` — Creates payment with `last_edited_by` set to current user, invalidates supplier data on success
- Payments section in SupplierDetail.tsx below Purchase Orders:
  - Table columns: Payment Date, Bill (displays "Bill #[number]" or "Bill on [date]"), Amount (₹), Payment Mode
  - "Add Payment" button (Admin/Office Manager only)
  - Add Payment dialog with Zod validation (`amount > 0`)
  - Bill dropdown: Shows all bills for this supplier, formatted as "[PO Description] — Bill #[number] ([date])" or "[PO Description] — Bill ([date])"
  - Amount field (₹ positive, validated)
  - Payment date (defaults today)
  - Payment mode dropdown: Cash, GPay, Bank Transfer
  - `last_edited_by` set to current user ID on insert
- All-caps payment mode names displayed: "Cash", "GPay", "Bank Transfer"
- INR formatting for amounts
- Append-only (no edit/delete) for financial records

**Verified:** Build passes, TypeScript strict mode clean

**Status:** COMPLETED on 2026-06-26

---

<!-- Add future deferred decisions below this line, newest at the top, using the same format: Where / What / Risk / When to fix / Status -->
