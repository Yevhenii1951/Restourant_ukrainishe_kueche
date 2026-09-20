ALTER TYPE order_state ADD VALUE IF NOT EXISTS 'awaiting_payment';
ALTER TYPE order_state ADD VALUE IF NOT EXISTS 'payment_failed';
