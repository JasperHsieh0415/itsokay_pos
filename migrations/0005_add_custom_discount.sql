ALTER TABLE orders ADD COLUMN custom_discount_amount INTEGER NOT NULL DEFAULT 0
    CHECK (custom_discount_amount >= 0);
