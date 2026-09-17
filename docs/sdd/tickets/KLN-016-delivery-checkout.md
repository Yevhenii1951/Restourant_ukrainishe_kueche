# KLN-016 - PLZ Delivery and Scheduled Orders

## Intent
Extend checkout to configured delivery zones and future slots.

## Delivers
Manager delivery-zone/service-window forms, exact PLZ eligibility, address validation,
fees/minimum/free threshold, cash on delivery, scheduling and delivery order operations.

## Blocked By
KLN-012.

## Verification Scenario
```text
GIVEN two zones and a five-digit PLZ present in neither
WHEN a guest requests delivery checkout
THEN delivery is blocked, pickup remains available, and no order/address is persisted
```

## Requirements
FR-ORD-1..3, FR-ORD-5, FR-ORD-6, FR-ADM-4, AC-7.

## Acceptance Criteria
- Active PLZ cannot belong to two zones.
- Cash methods restricted by fulfilment type.
- Delivery address appears only in authorized delivery operations.

## Non-Goals
No radius/geocoding, driver routing or live map tracking.

