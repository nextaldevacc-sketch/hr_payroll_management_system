# Spec Section 15 Acceptance Test Results (T1–T37)

*Generated automatically from `docs/reports/acceptance-raw.txt` on 2026-10-29T10:57:24.466Z*

| ID | Given | Expected | Status |
| :--- | :--- | :--- | :--- |
| **T1** | Platform admin creates Company B | Company B starts with UAE defaults; its admin is invited | **PASS** |
| **T2** | A Company A user asks for a Company B employee | Refused and logged | **PASS** |
| **T3** | Department Manager opens a team member's profile | Salary and bank tabs are hidden | **PASS** |
| **T4** | Biometric file imported twice | No duplicate punches | **PASS** |
| **T5** | Day with check-in only | Appears in the Missing Punch Queue | **PASS** |
| **T6** | 3 approved OT hours, normal day | AED 78.13 | **PASS** |
| **T7** | 2 OT hours between 10 pm and midnight | AED 62.50 at 1.5× | **PASS** |
| **T8** | 8 hours on a public holiday, paid | AED 250.00 | **PASS** |
| **T9** | Same holiday, substitute day chosen | No pay; one substitute day added | **PASS** |
| **T10** | OT not approved by cut-off | Not paid; carried to next month's inputs | **PASS** |
| **T11** | 2 days unpaid absence, ÷ 30 policy | AED 533.33 deducted | **PASS** |
| **T12** | Same, × 12 ÷ 365 policy | AED 526.03 deducted | **PASS** |
| **T13** | Sick days 16–20 of the year | AED 666.67 deducted (half pay) | **PASS** |
| **T14** | Sick day 46 of the year | Full day deducted | **PASS** |
| **T15** | Leave request on a flagged type | Needs manager, HR and GM approval before it reaches payroll | **PASS** |
| **T16** | Employee with 4 months' service applies for annual leave | No accrued balance yet; request blocked or unpaid per policy | **PASS** |
| **T17** | Employee with 8 months' service | 16 annual leave days (2 for each month of service, once past 6 months) | **PASS** |
| **T18** | Loan 6,000 at 500 a month, third month | AED 500 deducted; balance AED 4,500 | **PASS** |
| **T19** | Ahmed's month (T6, T11, T18) | Net AED 7,044.80 | **PASS** |
| **T20** | Locked run, then a mistake found | Payslip cannot be edited; an approved correction payslip in a later run, linked to the original and shown in the audit history | **PASS** |
| **T21** | Gratuity, basic 5,000, 3 years 6 months | AED 12,082.19 | **TODO (Phase 8)** |
| **T22** | Gratuity, basic 6,000, 7 years | AED 32,547.95 | **TODO (Phase 8)** |
| **T23** | Gratuity, 11 months' service | Not eligible; AED 0 | **TODO (Phase 8)** |
| **T24** | Leave encashment, 12 days, basic 6,000 | AED 2,367.12 | **TODO (Phase 8)** |
| **T25** | Visa expiring in 85 days | Status Expiring Soon; reminder sent to the document owner and HR | **TODO (Phase 9)** |
| **T26** | SIF for one company visa | SCR total equals the sum of EDR lines; each EDR matches its payslip | **PASS** |
| **T27** | New employee with no bank account | Cannot be set to Active | **PASS** |
| **T28** | Pay run with one employee missing an IBAN | Validation lists the error; the run cannot be calculated until it is fixed | **PASS** |
| **T29** | Employee's net is 25% higher than last month, threshold 10% | Shown in the variance report; the run cannot be validated until a reason is entered | **PASS** |
| **T30** | Ask for the SIF of a run that is Validated but not Locked | Refused; the SIF is made only from a locked run | **PASS** |
| **T31** | Annual leave Monday to Friday with a public holiday on Wednesday | 4 days taken from the balance | **PASS** |
| **T32** | Approved 5-day leave is cancelled | Balance goes back up by 5 days | **PASS** |
| **T33** | Employee requests 2 OT hours in self-service; manager approves as normal OT | AED 52.08 in the next pay run inputs | **PASS** |
| **T34** | Department manager has not confirmed the team's attendance at cut-off | Those days are held for next month; validation shows them | **PASS** |
| **T35** | Settlement with the laptop item not cleared | Settlement cannot be approved | **TODO (Phase 8)** |
| **T36** | Settlement approved and the final working date has passed | Login refused; status Archived | **TODO (Phase 8)** |
| **T37** | Salary adjustment entered but not approved | Not used by the pay run | **PASS** |

## Summary
- **Total Tests**: 37
- **Passed**: 30
- **Todo**: 7 (T21, T22, T23, T24, T25, T35, T36)
- **Failed**: 0