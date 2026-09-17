# KLN-020 - Voucher Purchase and Redemption

## Intent
Support test-mode gift vouchers with concurrency-safe balances.

## Delivers
Denominations, Stripe purchase binding, post-webhook code generation/hash storage,
localized delivery, partial remaining balance and transactional order redemption.

## Blocked By
KLN-017, KLN-019.

## Verification Scenario
```text
GIVEN one active voucher balance sufficient for only one of two simultaneous redemptions
WHEN both orders redeem concurrently
THEN total redeemed never exceeds balance and replay cannot debit again
```

## Requirements
FR-VCH-1, FR-VCH-2, NFR-REL-1, AC-2.

## Acceptance Criteria
- Code generated only after verified payment and stored hashed.
- Voucher cannot buy voucher; order total cannot become negative.
- No expiry in demo seed pending legal review.

## Non-Goals
No cash payout, custom value or physical mailing.

