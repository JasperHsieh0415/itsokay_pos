CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL CHECK(price >= 0),
    available INTEGER NOT NULL DEFAULT 1
);

INSERT INTO products (id, name, price)
VALUES
    (101, '牛肉飯', 150),
    (102, '雞腿飯', 130),
    (103, '紅茶', 40);
