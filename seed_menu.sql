
-- 主分類
INSERT INTO categories
(id, parent_id, name, english_name, sort_order)
VALUES
(1, NULL, '套餐', 'Set', 1),
(2, NULL, '義大利麵／主餐', 'Pasta / Main', 2),
(3, NULL, '漢堡', 'Burger', 3),
(4, NULL, '麵包', 'Bread', 4),
(5, NULL, '點心', 'Dessert', 5),
(6, NULL, '沙拉', 'Salad', 6),
(7, NULL, '咖啡', 'Coffee', 7),
(8, NULL, '特調', 'Special Drinks', 8),
(9, NULL, '茶飲', 'Tea', 9)
ON CONFLICT(id) DO UPDATE SET
    parent_id = excluded.parent_id,
    name = excluded.name,
    english_name = excluded.english_name,
    sort_order = excluded.sort_order;

-- 子分類
INSERT INTO categories
(id, parent_id, name, english_name, sort_order)
VALUES
(11, 1, '青醬帕尼尼套餐', 'Pesto Panini Set', 1),
(12, 1, '古巴三明治套餐', 'Cuban Sandwich Set', 2),
(13, 1, '竹炭漢堡套餐', 'Black Burger Set', 3),

(21, 2, '咖哩', 'Curry', 1),
(22, 2, '義大利麵', 'Pasta', 2),

(31, 3, '三明治', 'Sandwich', 1),
(32, 3, '竹炭漢堡', 'Black Burger', 2),

(41, 4, '三明治', 'Sandwich', 1),
(42, 4, '貝果', 'Bagel', 2),
(43, 4, '帕尼尼', 'Panini', 3),

(51, 5, '甜點', 'Dessert', 1),
(52, 5, '鹹點', 'Savory Snack', 2),

(61, 6, '主餐沙拉', 'Main Salad', 1),

(71, 7, '義式咖啡', 'Espresso Coffee', 1),

(81, 8, '巧克力', 'Chocolate', 1),
(82, 8, '氣泡飲', 'Sparkling Drink', 2),

(91, 9, '果汁', 'Juice', 1),
(92, 9, '拿鐵', 'Latte', 2),
(93, 9, '茶', 'Tea', 3)
ON CONFLICT(id) DO UPDATE SET
    parent_id = excluded.parent_id,
    name = excluded.name,
    english_name = excluded.english_name,
    sort_order = excluded.sort_order;


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
    sort_order,
    station
)
VALUES
-- 套餐：青醬帕尼尼
('M001', 11, '青醬帕尼尼套餐－燻雞', 'Pesto Panini Set-Smoked Chicken', 300, 'set', NULL, NULL, 1, 1, 'kitchen'),
('M002', 11, '青醬帕尼尼套餐－煙燻牛', 'Pesto Panini Set-Smoked Beef', 300, 'set', NULL, NULL, 1, 2, 'kitchen'),
('M003', 11, '青醬帕尼尼套餐－義式野菇', 'Pesto Panini Set-Mushroom(Lacto-ovo vegetarian)', 300, 'set', NULL, NULL, 1, 3, 'kitchen'),

-- 套餐：古巴三明治
('M004', 12, '古巴三明治套餐－火烤牛肉', 'Bolognese Panini Set-Grilled Beef', 300, 'set', NULL, NULL, 1, 4, 'kitchen'),

-- 套餐：竹炭漢堡
('M005', 13, '竹炭漢堡套餐－厚牛肉排', 'Charcoal Bun Burger Set – Thick Beef Patty', 240, 'set', 'burger', '起司／培根／鳳梨各+15元', 1, 5, 'kitchen'),
('M006', 13, '竹炭漢堡套餐－豬漢堡排', 'Charcoal Bun Burger Set – Pork Patty', 240, 'set', 'burger', '起司／培根／鳳梨各+15元', 1, 6, 'kitchen'),
('M007', 13, '竹炭漢堡套餐－菲力嫩雞', 'Charcoal Bun Burger Set – Tender Chicken Fillet', 240, 'set', 'burger', '起司／培根／鳳梨各+15元', 1, 7, 'kitchen'),
('M008', 13, '竹炭漢堡套餐－素排漢堡', 'Charcoal Bun Burger Set – Vegetarian Patty', 240, 'set', 'burger', '起司／培根／鳳梨各+15元', 1, 8, 'kitchen'),

-- 義大利麵／主餐
('M009', 21, '椰汁咖哩雞佐薑黃飯／麵包', 'Coconut Curry Chicken with Turmeric Rice or Bread', 290, 'single', 'starch', '飯或麵包擇一', 1, 9, 'kitchen'),
('M010', 22, '奶白醬義大利麵－菲力嫩雞', 'Creamy Alfredo Pasta with Tender Chicken Fillet', 280, 'single', NULL, NULL, 1, 10, 'kitchen'),
('M011', 22, '奶白醬義大利麵－義式野菇(蛋奶素)', 'Creamy Alfredo Pasta with Italian Mushrooms(Lacto-ovo vegetarian)', 280, 'single', NULL, NULL, 1, 11, 'kitchen'),
('M012', 22, '松露白酒海鮮義大利麵', 'Seafood Pasta with Truffle and White Wine Sauce', 320, 'single', NULL, '加點飲品折抵30元', 1, 12, 'kitchen'),
('M013', 22, '青醬菠菜義大利麵－菲力嫩雞', 'Spinach Pesto Pasta with Tender Chicken Fillet', 280, 'single', NULL, NULL, 1, 13, 'kitchen'),
('M014', 22, '青醬菠菜義大利麵－義式野菇(蛋奶素)', 'Spinach Pesto Pasta with Italian Mushrooms(Lacto-ovo vegetarian)', 280, 'single', NULL, NULL, 1, 14, 'kitchen'),

-- 漢堡
('M015', 31, '竹炭漢堡－素排漢堡(蛋奶素)', 'Charcoal Bun Burger with Vegetarian Patty(Lacto-ovo vegetarian)', 230, 'single', 'burger', '起司／培根／鳳梨各+15元', 1, 15, 'kitchen'),
('M016', 32, '竹炭漢堡－厚牛肉排', 'Charcoal Bun Burger with Thick Beef Patty', 230, 'single', 'burger', '起司／培根／鳳梨各+15元', 1, 16, 'kitchen'),
('M017', 32, '竹炭漢堡－菲力嫩雞', 'Charcoal Bun Burger with Chicken Fillet', 230, 'single', 'burger', '起司／培根／鳳梨各+15元', 1, 17, 'kitchen'),
('M018', 32, '竹炭漢堡－豬漢堡排', 'Charcoal Bun Burger with Pork Patty', 230, 'single', 'burger', '起司／培根／鳳梨各+15元', 1, 18, 'kitchen'),

-- 麵包：三明治
('M019', 41, '丹麥三明治－巧克力', 'Danish Sandwich with Chocolate', 180, 'single', 'included', '附美式咖啡或伯爵茶', 1, 19, 'kitchen'),
('M020', 41, '丹麥三明治－煙燻牛', 'Danish Sandwich with Smoked Beef', 230, 'single', 'included', '附美式咖啡或伯爵茶', 1, 20, 'kitchen'),
('M021', 41, '丹麥三明治－燻雞', 'Danish Sandwich with Smoked Chicken', 230, 'single', 'included', '附美式咖啡或伯爵茶', 1, 21, 'kitchen'),
('M022', 41, '古巴三明治－火烤牛肉', 'Cuban Sandwich with Grilled Beef', 280, 'single', NULL, NULL, 1, 22, 'kitchen'),

-- 麵包：貝果／帕尼尼
('M023', 42, '莓果乳酪貝果', 'Berry and Cream Cheese Bagel', 180, 'single', 'included', '蛋奶素；附美式咖啡或伯爵茶', 1, 23, 'bar'),
('M024', 43, '青醬帕尼尼－煙燻牛', 'Pesto Panini with Smoked Beef', 280, 'single', NULL, NULL, 1, 24, 'kitchen'),
('M025', 43, '青醬帕尼尼－義式野菇', 'Pesto Panini with Italian-Style Mushrooms(Lacto-ovo vegetarian)', 280, 'single', NULL, NULL, 1, 25, 'kitchen'),
('M026', 43, '青醬帕尼尼－燻雞', 'Pesto Panini with Smoked Chicken', 280, 'single', NULL, NULL, 1, 26, 'kitchen'),

-- 點心
-- 時價商品暫以 0 儲存，實際價格需於點餐時確認
('M027', 51, '手作蛋糕', 'Homemade Cake', 0, 'single', NULL, '時價；請至櫃檯選購', 1, 27, 'bar'),
('M028', 52, '港式菠蘿油', 'Hong Kong-Style Pineapple Bun with Butter', 60, 'single', NULL, NULL, 1, 28, 'bar'),
('M029', 52, '酥炸杏鮑菇', 'Crispy Fried King Oyster Mushrooms', 120, 'single', NULL, NULL, 1, 29, 'kitchen'),
('M030', 52, '經典薯條', 'Classic French Fries', 80, 'single', NULL, NULL, 1, 30, 'kitchen'),

-- 沙拉
('M031', 61, '沙拉－素鮪魚', 'Salad with Vegetarian Tuna(Vegan)', 290, 'single', NULL, '全素', 1, 31, 'kitchen'),
('M032', 61, '沙拉－舒肥嫩雞', 'Salad with Sous Vide Chicken', 290, 'single', NULL, NULL, 1, 32, 'kitchen'),
('M033', 61, '沙拉－煙燻牛', 'Salad with Smoked Beef', 290, 'single', NULL, NULL, 1, 33, 'kitchen'),
('M034', 61, '沙拉－煙燻鮭魚', 'Salad with Smoked Salmon', 350, 'single', NULL, NULL, 1, 34, 'kitchen'),

-- 咖啡
('M035', 71, '西西里咖啡', 'Sicilian Lemon Coffee', 150, 'single', 'iced', '僅冰', 1, 35, 'bar'),
('M036', 71, '沒事咖啡', 'Americano', 100, 'single', 'drink', NULL, 1, 36, 'bar'),
('M037', 71, '沒事拿鐵', 'Latte', 140, 'single', 'drink', NULL, 1, 37, 'bar'),
('M038', 71, '海鹽拿鐵', 'Sea Salt Latte', 150, 'single', 'drink', NULL, 1, 38, 'bar'),
('M039', 71, '摩卡咖啡', 'Caffè Mocha', 150, 'single', 'drink', NULL, 1, 39, 'bar'),
('M040', 71, '橙汁咖啡', 'Orange Juice Coffee', 150, 'single', 'iced', '僅冰', 1, 40, 'bar'),
('M041', 71, '濃縮咖啡', 'Espresso', 90, 'single', 'hot', '僅熱', 1, 41, 'bar'),

-- 特調
('M042', 81, '巧克力拿鐵', 'Chocolate Latte', 140, 'single', 'drink', NULL, 1, 42, 'bar'),
('M043', 81, '典選巧克力', 'Premium Hot Chocolate', 100, 'single', 'drink', NULL, 1, 43, 'bar'),
('M044', 82, '莫西多氣泡飲', 'Mojito Sparkling Drink', 150, 'single', 'iced', '僅冰', 1, 44, 'bar'),
('M045', 82, '綜合莓氣泡飲', 'Mixed Berry Sparkling Drink', 150, 'single', 'iced', '僅冰', 1, 45, 'bar'),
('M046', 82, '覆盆子氣泡飲', 'Raspberry Sparkling Drink', 150, 'single', 'iced', '僅冰', 1, 46, 'bar'),

-- 茶飲
('M047', 91, '當季果汁', 'Seasonal Fruit Juice', 0, 'single', 'iced', '時價；季節性供應，依當日定價', 1, 47, 'bar'),
('M048', 92, '伯爵拿鐵', 'Earl Grey Tea Latte', 140, 'single', 'drink', NULL, 1, 48, 'bar'),
('M049', 92, '抹茶拿鐵', 'Matcha Latte', 140, 'single', 'drink', NULL, 1, 49, 'bar'),
('M050', 93, '日曬果粒茶', 'Sun-Dried Fruit Tea', 200, 'single', 'drink', NULL, 1, 50, 'bar'),
('M051', 93, '伯爵茶', 'Earl Grey', 100, 'single', 'drink', '僅熱', 1, 51, 'bar'),
('M052', 93, '花草茶', 'Herbal Tea', 200, 'single', 'hot', '僅熱', 1, 52, 'bar'),
('M053', 93, '熱帶水果茶', 'Tropical Fruit Tea', 200, 'single', 'drink', NULL, 1, 53, 'bar')

ON CONFLICT(product_code) DO UPDATE SET
    category_id = excluded.category_id,
    name = excluded.name,
    english_name = excluded.english_name,
    price = excluded.price,
    sale_type = excluded.sale_type,
    customization_tag = excluded.customization_tag,
    description = excluded.description,
    available = excluded.available,
    sort_order = excluded.sort_order,
    station = excluded.station;