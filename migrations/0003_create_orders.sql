
-- ==============================================
-- 1. Orders
-- ==============================================

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,

    order_number TEXT NOT NULL UNIQUE,

    dining_mode TEXT NOT NULL
        CHECK (dining_mode IN ('dinein', 'takeout')),

    table_id TEXT,

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
                'T05', 'T06', 'T07', 'T08'
            )
        )
        OR
        (
            dining_mode = 'takeout'
            AND table_id IS NULL
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_orders_table
ON orders(table_id, created_at);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(status, created_at);

CREATE INDEX IF NOT EXISTS idx_orders_created
ON orders(created_at);


-- ==============================================
-- 2. Order Items
-- ==============================================

CREATE TABLE IF NOT EXISTS order_items (
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

    FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    FOREIGN KEY (product_code)
        REFERENCES products(product_code)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order
ON order_items(order_id);


-- ==============================================
-- 3. Order Item Options
-- 預留給未來客製化選項
-- ==============================================

CREATE TABLE IF NOT EXISTS order_item_options (
    id TEXT PRIMARY KEY,

    order_item_id TEXT NOT NULL,

    group_id TEXT NOT NULL,

    option_id TEXT NOT NULL,

    option_name TEXT NOT NULL,

    price_delta INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (order_item_id)
        REFERENCES order_items(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_options_item
ON order_item_options(order_item_id);
