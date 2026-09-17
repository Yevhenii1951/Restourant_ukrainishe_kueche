# Ticket Execution Index

Each ticket is a thin vertical slice and must use the Red-Green workflow in project
`AGENTS.md`. Do not combine tickets into one branch or commit.

| Stage | Tickets | Gate scenario |
| --- | --- | --- |
| Foundation | KLN-001..004 | protected localized shell |
| Catalog/content | KLN-005..008 | CMS edit appears in public localized menu/page |
| Ordering | KLN-009..012 | BS-1 pickup plus price/IDOR tests |
| Reservations | KLN-013..015 | BS-4 plus concurrency test |
| Payments/delivery | KLN-016..019 | BS-2, BS-3 and BS-6 |
| Extended | KLN-020..022 | BS-7 plus audit/RBAC |
| AI | KLN-023..025 | BS-8 |
| Hardening | KLN-026..028 | BS-9 and full suite |

Dependencies are explicit in each file. A ticket does not start until its blockers are
merged into `main`. If the human has not merged a pushed branch, implementation pauses.

