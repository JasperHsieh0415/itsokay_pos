-- Expand table IDs while preserving historical T08 orders and all order details.
-- Copy the full order tree before replacing tables to preserve cascading foreign keys.
CREATE TABLE orders_new (
    id TEXT PRIMARY KEY,

    order_number TEXT NOT NULL UNIQUE,

    dining_mode TEXT NOT NULL
        CHECK (dining_mode IN ('dinein', 'takeout')),

    table_id TEXT,
    custom_discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (custom_discount_amount >= 0),

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'confirmed',
                'preparing',
                'ready',
                'completed',
                'cancelled'
            )
        ),

    total_amount INTEGER NOT NULL
        CHECK (total_amount >= 0),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        (
            dining_mode = 'dinein'
            AND table_id IN (
                'T01', 'T02', 'T03', 'T04',
                'T05', 'T06', 'T07', 'T08', 'T09', 'T11'
            )
        )
        OR
        (
            dining_mode = 'takeout'
            AND table_id IS NULL
        )
    )
);

CREATE TABLE order_items_new (
    id TEXT PRIMARY KEY,

    order_id TEXT NOT NULL,

    product_code TEXT NOT NULL,

    product_name TEXT NOT NULL,

    quantity INTEGER NOT NULL
        CHECK (quantity > 0),

    unit_price INTEGER NOT NULL
        CHECK (unit_price >= 0),

    line_total INTEGER NOT NULL
        CHECK (line_total >= 0),

    station TEXT NOT NULL DEFAULT 'none' CHECK (station IN ('kitchen', 'bar', 'none')),
    kitchen_status TEXT NOT NULL DEFAULT 'not_required' CHECK (kitchen_status IN ('not_required', 'pending', 'preparing', 'ready')),
    kitchen_started_at TEXT,
    kitchen_completed_at TEXT,

    FOREIGN KEY (order_id)
        REFERENCES orders_new(id)
        ON DELETE CASCADE,

    FOREIGN KEY (product_code)
        REFERENCES products(product_code)
);

CREATE TABLE order_item_options_new (
    id TEXT PRIMARY KEY,

    order_item_id TEXT NOT NULL,

    group_id TEXT NOT NULL,

    option_id TEXT NOT NULL,

    option_name TEXT NOT NULL,

    price_delta INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (order_item_id)
        REFERENCES order_items_new(id)
        ON DELETE CASCADE
);

INSERT INTO orders_new (id, order_number, dining_mode, table_id, status, total_amount, created_at, updated_at, custom_discount_amount)
SELECT id, order_number, dining_mode, table_id, status, total_amount, created_at, updated_at, custom_discount_amount FROM orders;

INSERT INTO order_items_new (id, order_id, product_code, product_name, quantity, unit_price, line_total, station, kitchen_status, kitchen_started_at, kitchen_completed_at)
SELECT id, order_id, product_code, product_name, quantity, unit_price, line_total, station, kitchen_status, kitchen_started_at, kitchen_completed_at FROM order_items;

INSERT INTO order_item_options_new SELECT * FROM order_item_options;

DROP TABLE order_item_options;
DROP TABLE order_items;
DROP TABLE orders;

ALTER TABLE orders_new RENAME TO orders;
ALTER TABLE order_items_new RENAME TO order_items;
ALTER TABLE order_item_options_new RENAME TO order_item_options;

CREATE INDEX idx_orders_table ON orders(table_id, created_at);
CREATE INDEX idx_orders_status ON orders(status, created_at);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_kitchen ON order_items(station, kitchen_status, order_id);
CREATE INDEX idx_order_options_item ON order_item_options(order_item_id);
