
-- 商品所屬的製作工作站
ALTER TABLE products
ADD COLUMN station TEXT NOT NULL DEFAULT 'none'
CHECK (station IN ('kitchen', 'bar', 'none'));

-- 下單時保存工作站快照
ALTER TABLE order_items
ADD COLUMN station TEXT NOT NULL DEFAULT 'none'
CHECK (station IN ('kitchen', 'bar', 'none'));

-- 熟食明細的製作狀態
ALTER TABLE order_items
ADD COLUMN kitchen_status TEXT NOT NULL DEFAULT 'not_required'
CHECK (
    kitchen_status IN (
        'not_required',
        'pending',
        'preparing',
        'ready'
    )
);

-- 開始及完成製作時間
ALTER TABLE order_items
ADD COLUMN kitchen_started_at TEXT;

ALTER TABLE order_items
ADD COLUMN kitchen_completed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_order_items_kitchen
ON order_items(station, kitchen_status, order_id);
