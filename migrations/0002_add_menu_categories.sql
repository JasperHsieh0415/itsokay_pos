-- Migration number: 0002 	 2026-10-21T08:36:34.439Z

-- 1. 主分類 / 子分類
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER,
    name TEXT NOT NULL,
    english_name TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
        CHECK(active IN (0, 1)),
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE INDEX idx_categories_parent
ON categories(parent_id, sort_order);

-- 2. 擴充既有 products
ALTER TABLE products
ADD COLUMN product_code TEXT;

ALTER TABLE products
ADD COLUMN category_id INTEGER
REFERENCES categories(id);

ALTER TABLE products
ADD COLUMN english_name TEXT;

ALTER TABLE products
ADD COLUMN description TEXT;

ALTER TABLE products
ADD COLUMN sale_type TEXT NOT NULL DEFAULT 'single'
CHECK(sale_type IN ('single', 'set'));

ALTER TABLE products
ADD COLUMN customization_tag TEXT;

ALTER TABLE products
ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- 3. 商品編號不得重複
CREATE UNIQUE INDEX idx_products_code
ON products(product_code);

-- 4. 加速依分類查詢商品
CREATE INDEX idx_products_category
ON products(category_id, available, sort_order);