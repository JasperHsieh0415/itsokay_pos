
-- 主分類
INSERT INTO categories
(id, parent_id, name, english_name, sort_order)
VALUES
(1, NULL, '套餐', 'Set', 1),
(2, NULL, '義大利麵／主餐', 'Pasta / Main', 2),
(3, NULL, '麵包', 'Bread', 3),
(4, NULL, '沙拉', 'Salad', 4),
(5, NULL, '特調', 'Special', 5);

-- 子分類
INSERT INTO categories
(id, parent_id, name, english_name, sort_order)
VALUES
(11, 1, '青醬帕尼尼套餐', 'Pesto Panini Set', 1),
(12, 1, '竹炭漢堡套餐', 'Black Burger Set', 2),

(21, 2, '咖哩', 'Curry', 1),
(22, 2, '義大利麵', 'Pasta', 2),

(31, 3, '貝果', 'Bagel', 1),
(32, 3, '帕尼尼', 'Panini', 2),

(41, 4, '主餐沙拉', 'Main Salad', 1),

(51, 5, '巧克力', 'Chocolate', 1);


INSERT INTO products (
    product_code,
    category_id,
    name,
    english_name,
    price,
    sale_type,
    customization_tag,
    description,
    available,
    sort_order
)
VALUES

-- 套餐：青醬帕尼尼
(
    'M001', 11,
    '青醬帕尼尼套餐－燻雞',
    'Smoked Chicken',
    300, 'set', NULL,
    '附薯條及主廚沙拉；加點飲品折抵30元',
    1, 1
),
(
    'M002', 11,
    '青醬帕尼尼套餐－煙燻牛',
    'Smoked Beef',
    300, 'set', NULL,
    '附薯條及主廚沙拉；加點飲品折抵30元',
    1, 2
),

-- 套餐：竹炭漢堡
(
    'M007', 12,
    '竹炭漢堡套餐－菲力嫩雞',
    'Chicken Fillet',
    240, 'set', 'burger',
    '附薯條及主廚沙拉；加點飲品折抵30元；起司／培根／鳳梨各+15元',
    1, 7
),
(
    'M008', 12,
    '竹炭漢堡套餐－素排漢堡',
    'Lacto-vegetarian',
    240, 'set', 'burger',
    '附薯條及主廚沙拉；加點飲品折抵30元；起司／培根／鳳梨各+15元',
    1, 8
),

-- 義大利麵 / 主餐
(
    'M009', 21,
    '椰汁咖哩雞佐薑黃飯／麵包',
    'Coconut Curry Chicken Rice/Bread',
    290, 'single', 'starch',
    '飯或麵包擇一；加點飲品折抵30元',
    1, 9
),
(
    'M010', 22,
    '奶白醬義大利麵－菲力嫩雞',
    'Alfredo Pasta / Chicken Fillet',
    280, 'single', NULL,
    '義式野菇：蛋奶素／全素版本請確認；加點飲品折抵30元',
    1, 10
),

-- 麵包
(
    'M023', 31,
    '莓果乳酪貝果',
    'Berry Bagel',
    180, 'single', 'included',
    '蛋奶素；附美式咖啡或伯爵茶（飲品選擇待確認）',
    1, 23
),
(
    'M024', 32,
    '青醬帕尼尼－煙燻牛',
    'Smoked Beef',
    280, 'single', NULL,
    '義式野菇：蛋奶素；單點',
    1, 24
),

-- 沙拉
(
    'M031', 41,
    '沙拉－素鮪魚',
    'Vegan Tuna',
    290, 'single', NULL,
    '全素',
    1, 31
),
(
    'M032', 41,
    '沙拉－舒肥嫩雞',
    'Chicken Fillet',
    290, 'single', NULL,
    NULL,
    1, 32
),

-- 特調
(
    'M042', 51,
    '巧克力拿鐵',
    'Chocolate Latte',
    140, 'single', 'drink',
    NULL,
    1, 42
),
(
    'M043', 51,
    '典選巧克力',
    'Chocolate',
    100, 'single', 'drink',
    NULL,
    1, 43
);
