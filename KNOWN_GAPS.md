# Known Gaps & Deferred Decisions

This file tracks design debt and deferred decisions that were made deliberately (not oversights) but need to be revisited at a specific later point. Check this file before building any feature listed below — do not assume the gap has been silently closed since it was written here.

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
