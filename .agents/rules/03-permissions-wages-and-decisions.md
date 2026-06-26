---
trigger: always_on
---

---
trigger: always_on
---

# Construction App — Part 3: Permissions, Wage Calc & Confirmed Decisions

Part 3 of 3 rule files (see also: 01-behavior-and-stack.md, 02-security-and-data-model.md). Read all three before writing code.

---

## 5. ROLE & PERMISSION MATRIX

| Feature / action | Admin | Office Manager | Supervisor |
|---|---|---|---|
| Create / edit sites | ✓ | ✗ | ✗ |
| View all sites | ✓ | ✓ | Own site(s) only |
| Set project budget | ✓ | ✗ | ✗ |
| View site progress | ✓ | ✓ | Own site(s) only |
| Mark labour attendance | ✓ | ✓ | Own site(s) only |
| Add / edit workers | ✓ | ✓ | ✗ |
| Mark staff attendance | ✓ | ✓ | ✗ |
| View attendance reports | ✓ | ✓ | Own site(s) only |
| Set half-day multiplier / job-type rate | ✓ | ✓ | Own site(s) — always allowed to set the rule itself |
| View resulting ₹ wage amount after setting a rate | ✓ | ✓ | Only if wage-visibility toggle enabled for them |
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
| Toggle supervisor wage-visibility | ✓ | ✓ | ✗ |
| View supervisor locations | ✓ | ✓ | ✗ |

Every row must map to an actual RLS policy, not just a frontend route guard. The wage-visibility toggle must be enforced by an RLS policy checking `supervisor_wage_permissions` on every read of wage/payroll data — never just a frontend conditional render.

---

## 6. WAGE CALCULATION — WORKED EXAMPLE (must match exactly)

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

Key rules:
- A single worker can have a different site AND rate on different days within the same week.
- Half-day pay = daily rate × half-day multiplier (default 0.5, configurable; settable by Admin/Office always, by Supervisor only when wage-visibility toggle enabled).
- Absent days contribute ₹0.
- Advances subtracted from the gross total for the **current/immediate** settlement period — deducted immediately, not deferred.
- **Settlement cycle is a fixed calendar week, Monday to Saturday.**
- **Overdue carry-over:** if net payable isn't paid out, the unpaid balance carries over and accumulates into next week's settlement, clearly flagged "overdue." Visible to Admin/Office always; visible to Supervisor only if wage-visibility enabled for that site.

---

## 7. CONFIRMED CLIENT DECISIONS (all resolved — not assumptions)

These are firm requirements. Do not re-litigate without good reason, but DO flag if implementation reveals an inconsistency between two of these rules.

1. **Half-day wage permission:** Both Admin/Office AND Supervisor can set the half-day multiplier — Supervisor's ability gated by per-supervisor, per-site toggle controlled by Admin/Office.
2. **Wage rate visibility for Supervisors:** Confirmed needed. Gated same as #1 — disabled by default.
3. **Daily site/job-type assignment:** Either Admin/Office or Supervisor can assign, depending on situation. All three roles can assign (subject to role-scoping — Supervisor only for own assigned site(s)).
4. **Settlement week:** Fixed calendar week, **Monday to Saturday**.
5. **Advance deduction timing:** Immediate, from current/next settlement. Unpaid balances carry over and flag as overdue.
6. **Stock tracking depth:** Full live running stock balance per site. Write access: Admin and Office Manager only.
7. **Audit/edit-history:** Just `last_edited_by` and `last_edited_at` — no full change history needed for this version.
8. **Supervisor multi-site support:** Build flexible multi-site-capable schema from day one (many-to-many `supervisor_site_assignments`), even though most supervisors initially have just one site.

---

## 8. WHAT NOT TO DO

- Do not introduce MongoDB, Express, Railway, or any other backend/server pattern — backend is Supabase only.
- Do not introduce a second UI component library alongside shadcn/ui.
- Do not compute wages, totals, or money math in the React client as the source of truth — always defer to a Postgres function/Edge Function.
- Do not create tables, columns, or RLS policies "for the future" that weren't asked for.
- Do not auto-generate fake/placeholder business rules for PF/ESI/statutory deductions — require real confirmation from the client via the developer.
- Do not assume currency formatting, timezone, or locale — confirm (likely INR, IST, but confirm before hardcoding).

---

## 9. WORKING AGREEMENT FOR THIS SESSION

At the start of any work session or task:
1. Briefly restate what you understand the task to be.
2. List any assumptions you would otherwise have to make, and ask about each one not already answered across these three files.
3. Propose a short plan with verification steps (see Part 1, Section 0.4).
4. Wait for go-ahead on anything flagged as uncertain before writing code.

At the end of any task:
1. Summarize exactly what changed and why.
2. Flag anything touched outside the original scope and explain why it was unavoidable.
3. List any new open questions that came up during the task, explicitly, for the developer to confirm with the client — do not silently fold them into Section 7, which is a log of already-confirmed decisions only.
