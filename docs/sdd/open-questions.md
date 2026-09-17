# Open Questions and Launch Blockers

Implementation may use the documented demo defaults. Production launch must not
invent the values below.

## Must Be Replaced by a Real Operator

- Legal entity, representative, register and tax identifiers for Impressum.
- Real address, telephone number, email address and domain.
- Verified opening hours, holiday closures and table inventory.
- Actual menu recipes, allergens, additives, traces and cross-contamination policy.
- Final prices, VAT treatment, delivery areas, minimum order and cancellation policy.
- Payment account, refund responsibility and payout configuration.
- Privacy controller, processors, retention obligations and data request contact.
- Image/video licenses and identifiable-person releases.
- Email sender domain with SPF/DKIM/DMARC.

## Product Values Intentionally Configurable

- `AI_MONTHLY_BUDGET_EUR`: no amount was authorized; deployment must fail closed
  or disable AI when absent. Never invent a monetary budget.
- Analytics domain and processor agreement.
- Map tile provider and whether consent or a first-party proxy is used.
- PayPal availability in the connected Stripe account and country configuration.
- Voucher expiry/legal treatment after professional review.

## Demo Defaults

Demo seeds may use plausible fictional values only if the UI and legal footer
show `Portfolio-Demo - kein realer Restaurantbetrieb`. Never use an address that
could be mistaken for authorization to represent an actual occupant.

