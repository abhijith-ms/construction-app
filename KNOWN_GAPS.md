# Known Gaps & Deferred Decisions

This file tracks design debt and deferred decisions that were made deliberately (not oversights) but need to be revisited at a specific later point. Check this file before building any feature listed below — do not assume the gap has been silently closed since it was written here.

---

## OPEN — Stock transfer atomicity

**Where:** `stock_transactions` table, `update_stock_levels_on_transaction()` trigger (migration `20260623080011_create_stock_trigger.sql`)

**What:** A stock transfer between two sites is modeled as two separate rows — one `transfer_out` at the source site, one `transfer_in` at the destination site. The trigger updates `stock_levels` for each row independently. Nothing currently enforces that both rows are inserted together, in the same transaction, with matching quantities.

**Risk:** If the application only inserts one of the two rows (e.g. due to a bug, a crashed request, or someone manually inserting a row via Studio), `stock_levels` will silently become wrong — stock will appear to vanish from one site without appearing at the other, or vice versa, with no error raised.

**When to fix:** Before or while building the actual "Transfer stock between sites" UI feature. At that point, build either:
- A Postgres function that inserts both rows atomically in a single transaction (preferred — guarantees correctness at the database level, consistent with this project's "RLS/DB is the real boundary" philosophy), or
- At minimum, application-level logic that wraps both inserts in a single Supabase transaction/RPC call, never two separate client-side inserts.

**Status:** Deferred intentionally on 2026-06-24. Documented in the migration file's header comment. Do not consider this resolved until the fix above is actually implemented — a comment alone does not close this gap.

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

<!-- Add future deferred decisions below this line, newest at the top, using the same format: Where / What / Risk / When to fix / Status -->
