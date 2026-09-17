export interface Quote {
  subtotalCents: number;
  modifiersCents: number;
  deliveryCents: number;
  tipCents: number;
  discountCents: number;
  totalCents: number;
  expiresAt: string;
}
