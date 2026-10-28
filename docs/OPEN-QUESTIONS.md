# Open Questions & Client Policy Confirmations

> **Status**: Living document tracking open policy decisions and regulatory confirmations required before production go-live.

---

## 1. Pension Schemes & Rates (GPSSA & ADPF)
*Note in UI: "Confirm current rates with the client before go-live"*

| Parameter | Current System Default / Law Federal Decree No. 57 (2023) | Open Question for Client / HR |
|---|---|---|
| **GPSSA Employee Rate (New Scheme)** | 11.00% | Applies to UAE Nationals registered on or after **2 October 2023**. Confirm if all current UAE National hires fall under the new scheme or if historical records include pre-2023 registrations. |
| **GPSSA Employee Rate (Legacy Scheme)** | 5.00% | Applies to UAE Nationals registered prior to **2 October 2023**. Confirm grandfathered employee registry dates with client's GPSSA portal export. |
| **GPSSA Employer Rate** | 15.00% | Standard employer contribution. Confirm whether the enterprise qualifies for the Government share (2.5%) subsidy. |
| **GPSSA Government Share (2.5%)** | 2.50% | Applied when employee contribution salary is under **AED 20,000** (net employer cost: 12.50%, government pays 2.50%). When salary is >= AED 20,000, employer pays full 15.00%. Confirm registration status for eligible nationals. |
| **GPSSA Salary Floor & Cap** | Min: AED 3,000 · Cap: AED 70,000 | Minimum contribution salary is clamped to AED 3,000; maximum to AED 70,000. Confirm if any subsidiary has higher non-statutory contractual top-ups. |
| **ADPF (Abu Dhabi Pension Fund)** | EE: 11% (or legacy 5%) · ER: 15% (private sector) / 20% (semi-gov) · Cap: AED 70,000 | Branches / company visas registered in the Emirate of Abu Dhabi (e.g. Khalifa Port branch) report to ADPF rather than GPSSA. Confirm client's specific entity registration type and contribution schedule with Abu Dhabi Pension Fund. |
| **Pensionable Allowances** | Basic + Fixed Allowances marked `is_pensionable` | By default, Basic Salary (`BASIC`) and Housing Allowance (`HRA`) are flagged pensionable. Confirm with client's legal counsel whether Transport (`TRA`) or other regular allowances are included in their approved MOHRE job contracts as pensionable pay. |

---

## 2. Company Policy Defaults
*Tagged in UI as: "Demo default, set your company policy"*

The following thresholds are seeded as sensible UAE corporate defaults but represent internal corporate governance rather than fixed statutory law:

1. **Cut-off Day (Day 25)**
   - *Current Default*: 25th of the calendar month (payroll period runs from 26th of previous month to 25th of current month; days 26–31 handled via standard assumptions and next-period adjustments).
   - *Question for Client*: Does the client operate on a 25th cut-off cycle or calendar month end (1st to 30th/31st)?

2. **General Manager (GM) Approval for Annual Leave > 5 Days**
   - *Current Default*: Leave requests up to 5 consecutive days require Line Manager approval only; requests > 5 consecutive days trigger an automatic second approval step by the General Manager / Executive.
   - *Question for Client*: What is the organization's delegation of authority matrix for leave? (e.g., 5 days, 10 days, or line manager + HR manager only?)

3. **General Manager (GM) Approval for Salary Adjustments > AED 2,000**
   - *Current Default*: Salary adjustments, ad-hoc bonuses, or special deductions <= AED 2,000 require HR Manager approval; amounts > AED 2,000 require GM co-approval.
   - *Question for Client*: What financial authorization limit applies to payroll adjustments before pay run finalization?

4. **Tardiness & Early Departure Penalty Ladder**
   - *Current Default*: Ordered by occurrence within the same calendar month:
     - 1st occurrence (grace > 15 mins): Written warning (0 deduction)
     - 2nd occurrence: 0.25 day basic wage deduction
     - 3rd occurrence: 0.50 day basic wage deduction
     - 4th occurrence: 1.00 full day basic wage deduction
   - *Question for Client*: Does client's MOHRE-approved company disciplinary by-law match this exact graduated penalty scale, or do they use hourly deduction?

5. **Unapproved Absence Calculation Divisor**
   - *Current Default*: `DIV_30` (Gross / 30 * absent days) — standard corporate commercial convention in UAE.
   - *Alternative Option*: `DAYS_365` (Gross * 12 / 365 * absent days) — statutory formula matching Article 51 gratuity daily rate.
   - *Question for Client*: Confirm client's employment contract terms for unapproved absence divisor (`DIV_30` vs `DIV_365`).
