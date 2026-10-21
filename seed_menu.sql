
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
    sort_order
)
VALUES
-- 套餐：青醬帕尼尼
('M001', 11, '青醬帕尼尼套餐－燻雞', 'Smoked Chicken', 300, 'set', NULL, '附薯條及主廚沙拉；加點飲品折抵30元', 1, 1),
('M002', 11, '青醬帕尼尼套餐－煙燻牛', 'Smoked Beef', 300, 'set', NULL, '附薯條及主廚沙拉；加點飲品折抵30元', 1, 2),
('M003', 11, '青醬帕尼尼套餐－義式野菇', 'Mushroom', 300, 'set', NULL, '附薯條及主廚沙拉；加點飲品折抵30元', 1, 3),

-- 套餐：古巴三明治
('M004', 12, '古巴三明治套餐－火烤牛肉', 'Grilled Beef', 300, 'set', NULL, '附薯條及主廚沙拉；加點飲品折抵30元', 1, 4),

-- 套餐：竹炭漢堡
('M005', 13, '竹炭漢堡套餐－厚牛肉排', 'Beef Patty', 240, 'set', 'burger', '附薯條及主廚沙拉；加點飲品折抵30元；起司／培根／鳳梨各+15元', 1, 5),
('M006', 13, '竹炭漢堡套餐－豬漢堡排', 'Pork Patty', 240, 'set', 'burger', '附薯條及主廚沙拉；加點飲品折抵30元；起司／培根／鳳梨各+15元', 1, 6),
('M007', 13, '竹炭漢堡套餐－菲力嫩雞', 'Chicken Fillet', 240, 'set', 'burger', '附薯條及主廚沙拉；加點飲品折抵30元；起司／培根／鳳梨各+15元', 1, 7),
('M008', 13, '竹炭漢堡套餐－素排漢堡', 'Lacto-vegetarian', 240, 'set', 'burger', '附薯條及主廚沙拉；加點飲品折抵30元；起司／培根／鳳梨各+15元', 1, 8),

-- 義大利麵／主餐
('M009', 21, '椰汁咖哩雞佐薑黃飯／麵包', 'Coconut Curry Chicken Rice/Bread', 290, 'single', 'starch', '飯或麵包擇一；加點飲品折抵30元', 1, 9),
('M010', 22, '奶白醬義大利麵－菲力嫩雞', 'Alfredo Pasta / Chicken Fillet', 280, 'single', NULL, '義式野菇：蛋奶素／全素版本請確認；加點飲品折抵30元', 1, 10),
('M011', 22, '奶白醬義大利麵－義式野菇', 'Alfredo Pasta / Mushroom', 280, 'single', NULL, '義式野菇：蛋奶素／全素版本請確認；加點飲品折抵30元', 1, 11),
('M012', 22, '松露白酒海鮮義大利麵', 'White Wine Seafood Truffle Pasta', 320, 'single', NULL, '加點飲品折抵30元', 1, 12),
('M013', 22, '青醬菠菜義大利麵－菲力嫩雞', 'Pesto Pasta / Chicken Fillet', 280, 'single', NULL, '義式野菇：蛋奶素／全素版本請確認；加點飲品折抵30元', 1, 13),
('M014', 22, '青醬菠菜義大利麵－義式野菇', 'Pesto Pasta / Mushroom', 280, 'single', NULL, '義式野菇：蛋奶素／全素版本請確認；加點飲品折抵30元', 1, 14),

-- 漢堡
('M015', 31, '竹炭漢堡－素排漢堡', 'Lacto-vegetarian', 230, 'single', 'burger', '素排漢堡：蛋奶素；起司／培根／鳳梨各+15元', 1, 15),
('M016', 32, '竹炭漢堡－厚牛肉排', 'Beef Patty', 230, 'single', 'burger', '素排漢堡：蛋奶素；起司／培根／鳳梨各+15元', 1, 16),
('M017', 32, '竹炭漢堡－菲力嫩雞', 'Chicken Fillet', 230, 'single', 'burger', '素排漢堡：蛋奶素；起司／培根／鳳梨各+15元', 1, 17),
('M018', 32, '竹炭漢堡－豬漢堡排', 'Pork Patty', 230, 'single', 'burger', '素排漢堡：蛋奶素；起司／培根／鳳梨各+15元', 1, 18),

-- 麵包：三明治
('M019', 41, '丹麥三明治－巧克力', 'Chocolate', 180, 'single', 'included', '附美式咖啡或伯爵茶（飲品選擇待確認）', 1, 19),
('M020', 41, '丹麥三明治－煙燻牛', 'Smoked Beef', 230, 'single', 'included', '附美式咖啡或伯爵茶（飲品選擇待確認）', 1, 20),
('M021', 41, '丹麥三明治－燻雞', 'Smoked Chicken', 230, 'single', 'included', '附美式咖啡或伯爵茶（飲品選擇待確認）', 1, 21),
('M022', 41, '古巴三明治－火烤牛肉', 'Grilled Beef', 280, 'single', NULL, NULL, 1, 22),

-- 麵包：貝果／帕尼尼
('M023', 42, '莓果乳酪貝果', 'Berry Bagel', 180, 'single', 'included', '蛋奶素；附美式咖啡或伯爵茶（飲品選擇待確認）', 1, 23),
('M024', 43, '青醬帕尼尼－煙燻牛', 'Smoked Beef', 280, 'single', NULL, '義式野菇：蛋奶素；單點', 1, 24),
('M025', 43, '青醬帕尼尼－義式野菇', 'Mushroom', 280, 'single', NULL, '義式野菇：蛋奶素；單點', 1, 25),
('M026', 43, '青醬帕尼尼－燻雞', 'Smoked Chicken', 280, 'single', NULL, '義式野菇：蛋奶素；單點', 1, 26),

-- 點心
-- 時價商品暫以 0 儲存，實際價格需於點餐時確認
('M027', 51, '手作蛋糕', 'Sliced Cake', 0, 'single', NULL, '時價；請至櫃檯選購', 1, 27),
('M028', 52, '港式菠蘿油', 'Hongkong Bun', 60, 'single', NULL, NULL, 1, 28),
('M029', 52, '酥炸杏包菇', 'Crispy Fried King Oyster Mushroom', 120, 'single', NULL, NULL, 1, 29),
('M030', 52, '經典薯條', 'Classic Fries', 80, 'single', NULL, NULL, 1, 30),

-- 沙拉
('M031', 61, '沙拉－素鮪魚', 'Vegan Tuna', 290, 'single', NULL, '全素', 1, 31),
('M032', 61, '沙拉－舒肥嫩雞', 'Chicken Fillet', 290, 'single', NULL, NULL, 1, 32),
('M033', 61, '沙拉－煙燻牛', 'Smoked Beef', 290, 'single', NULL, NULL, 1, 33),
('M034', 61, '沙拉－煙燻鮭魚', 'Smoked Salmon', 350, 'single', NULL, NULL, 1, 34),

-- 咖啡
('M035', 71, '西西里咖啡', 'Espresso Romano', 150, 'single', 'iced', '濃縮咖啡僅熱；西西里、橙汁咖啡僅冰', 1, 35),
('M036', 71, '沒事咖啡', 'Americano', 100, 'single', 'drink', NULL, 1, 36),
('M037', 71, '沒事拿鐵', 'Latte', 140, 'single', 'drink', NULL, 1, 37),
('M038', 71, '海鹽拿鐵', 'Sea Salt Latte', 150, 'single', 'drink', NULL, 1, 38),
('M039', 71, '摩卡咖啡', 'Mocha', 150, 'single', 'drink', NULL, 1, 39),
('M040', 71, '橙汁咖啡', 'Orange Coffee', 150, 'single', 'iced', '濃縮咖啡僅熱；西西里、橙汁咖啡僅冰', 1, 40),
('M041', 71, '濃縮咖啡', 'Espresso', 90, 'single', 'hot', '濃縮咖啡僅熱；西西里、橙汁咖啡僅冰', 1, 41),

-- 特調
('M042', 81, '巧克力拿鐵', 'Chocolate Latte', 140, 'single', 'drink', NULL, 1, 42),
('M043', 81, '典選巧克力', 'Chocolate', 100, 'single', 'drink', NULL, 1, 43),
('M044', 82, '莫西多氣泡飲', 'Mojito 0% Alc.', 150, 'single', 'iced', '僅冰', 1, 44),
('M045', 82, '綜合莓氣泡飲', 'Mixed Berry', 150, 'single', 'iced', '僅冰', 1, 45),
('M046', 82, '覆盆子氣泡飲', 'Raspberry', 150, 'single', 'iced', '僅冰', 1, 46),

-- 茶飲
('M047', 91, '當季果汁', 'Seasonal Juice', 0, 'single', 'iced', '時價；季節性供應，依當日定價', 1, 47),
('M048', 92, '伯爵拿鐵', 'Earl Grey Latte', 140, 'single', 'drink', NULL, 1, 48),
('M049', 92, '抹茶拿鐵', 'Matcha Latte', 140, 'single', 'drink', NULL, 1, 49),
('M050', 93, '日曬果粒茶', 'Dried Fruit Tea', 200, 'single', 'drink', NULL, 1, 50),
('M051', 93, '伯爵茶', 'Earl Grey', 100, 'single', 'drink', NULL, 1, 51),
('M052', 93, '花草茶', 'Herbal Tea', 200, 'single', 'hot', '花草茶僅熱', 1, 52),
('M053', 93, '熱帶水果茶', 'Tropical Fruit Tea', 200, 'single', 'drink', NULL, 1, 53)

ON CONFLICT(product_code) DO UPDATE SET
    category_id = excluded.category_id,
    name = excluded.name,
    english_name = excluded.english_name,
    price = excluded.price,
    sale_type = excluded.sale_type,
    customization_tag = excluded.customization_tag,
    description = excluded.description,
    available = excluded.available,
    sort_order = excluded.sort_order;