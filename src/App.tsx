
import { useEffect, useMemo, useState } from 'react';
import OrderSidebar, {
  type CartItem,
} from './components/OrderSidebar';
import './App.css';

import ProductCustomizationModal, {
  type SelectedOption,
} from './components/ProductCustomizationModal';

import { productOptions } from './data/productOptions';

type Product = {
  id: number;
  product_code: string;
  name: string;
  english_name: string | null;
  price: number;
  sale_type: 'set' | 'single';
  customization_tag: string | null;
  description: string | null;
  category_id: number;
  sub_category_name: string;
  main_category_id: number;
  main_category_name: string;
};

type Category = {
  id: number;
  parent_id: number | null;
  name: string;
  english_name: string | null;
  sort_order: number;
};

type MenuResponse = {
  success: boolean;
  data: Product[];
};

const drinkOptions = [
  { id: 7, name: '咖啡', english_name: 'Coffee' },
  { id: 8, name: '特調', english_name: 'Special Drinks' },
  { id: 9, name: '茶品', english_name: 'Tea' },
];

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);;
  const [search, setSearch] = useState('');
  const [diningMode, setDiningMode] = useState<'dinein' | 'takeout'>('dinein');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchMenu() {
      try {
        const response = await fetch('/api/menu', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result: MenuResponse = await response.json();

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error('Invalid API response');
        }

        setProducts(result.data);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Failed to load menu:', err);
        setError('無法取得菜單，請稍後再試');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchMenu();

    return () => controller.abort();
  }, []);


useEffect(() => {
  async function fetchCategories() {
    try {
      const response = await fetch('/api/categories');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error('Failed to load categories');
      }

      setCategories(result.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }

  fetchCategories();
}, []);

// 將咖啡、特調、茶飲合併為飲品分類。
const mainCategories = useMemo(() => {
  const drinkCategoryIds = [7, 8, 9];
  const sortedCategories = categories
    .filter((category) => category.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);
  const firstDrinkCategory = sortedCategories.find((category) =>
    drinkCategoryIds.includes(category.id)
  );

  return sortedCategories
    .filter((category) =>
      !drinkCategoryIds.includes(category.id) ||
      category.id === firstDrinkCategory?.id
    )
    .map((category) =>
      drinkCategoryIds.includes(category.id)
        ? {
            ...category,
            name: '飲品',
            english_name: 'Drinks',
            categoryIds: drinkCategoryIds,
          }
        : { ...category, categoryIds: [category.id] }
    );
}, [categories]);

const currentCategory = mainCategories.find(
  (category) => category.id === activeCategory
);

const isDrinkCategory = drinkOptions.some((option) =>
  currentCategory?.categoryIds.includes(option.id)
);

// 依主分類與搜尋文字過濾商品
const filteredProducts = useMemo(() => {
  const keyword = search.trim().toLowerCase();

  return products.filter((product) => {
    // 依顯示分類包含的 D1 主分類 ID 篩選
    const matchCategory =
      activeCategory === null ||
      currentCategory?.categoryIds.includes(product.main_category_id) === true;

    // 同時支援中文、英文、商品編號搜尋
    const matchSearch =
      product.name.toLowerCase().includes(keyword) ||
      (product.english_name ?? '')
        .toLowerCase()
        .includes(keyword) ||
      product.product_code.toLowerCase().includes(keyword);

    return matchCategory && matchSearch;
  });
}, [products, activeCategory, currentCategory, search]);

const groupedProducts = useMemo(() => {
  const displayCategories = isDrinkCategory
    ? drinkOptions.map((option) => ({ ...option, categoryIds: [option.id] }))
    : mainCategories;

  return displayCategories
    .map((category) => ({
      category,
      items: filteredProducts.filter(
        (product) => category.categoryIds.includes(product.main_category_id)
      ),
    }))
    .filter((group) => group.items.length > 0);
}, [mainCategories, filteredProducts, isDrinkCategory]);


  // const handleAddToCart = (product: Product) => {
  //   setSelectedProductId(product.id);
  //   setCartItems((prev) => {
  //     const existingItem = prev.find((item) => item.productId === product.id);

  //     if (existingItem) {
  //       return prev;
  //     }

  //     return [
  //       ...prev,
  //       {
  //         cartId: String(product.id),
  //         productId: product.id,
  //         productCode: product.product_code,
  //         name: product.name,
  //         price: product.price,
  //         quantity: 1,
  //       },
  //     ];
  //   });
  // };


  const addToCart = (
    product: Product,
    selectedOptions: SelectedOption[] = [],
    unitPrice: number = product.price,
    quantity: number = 1
  ) => {
    // 相同商品 + 相同客製化選項，視為同一筆購物車項目
    const optionKey = selectedOptions
      .map((option) => `${option.groupId}:${option.optionId}`)
      .sort()
      .join('|');

    const cartId = JSON.stringify([
      product.id,
      optionKey,
    ]);

    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.cartId === cartId
      );

      if (existing) {
        return prev.map((item) =>
          item.cartId === cartId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [
        ...prev,
        {
          cartId,
          productId: product.id,
          productCode: product.product_code,
          name: product.name,
          price: unitPrice,
          quantity,
          selectedOptions,
        },
      ];
    });
  };

  // 商品卡片點擊事件
  const handleProductClick = (product: Product) => {
    setSelectedProductId(product.id);
    setSelectedProduct(product);
  };

  // 彈窗確認
  const handleCustomizationConfirm = (
    selectedOptions: SelectedOption[],
    unitPrice: number,
    quantity: number
  ) => {
    if (!selectedProduct) return;

    addToCart(
      selectedProduct,
      selectedOptions,
      unitPrice,
      quantity
    );

    setSelectedProduct(null);
  };


  const handleQuantityChange = (
    cartId: string,
    quantity: number
  ) => {
    setCartItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.cartId !== cartId);
      }

      return prev.map((item) =>
        item.cartId === cartId
          ? { ...item, quantity }
          : item
      );
    });
  };

  const handleClearOrder = () => {
    setCartItems([]);
  };

  const handleCheckout = () => {
    // 尚未建立訂單 API，先保留操作入口
    console.log('Checkout requested:', cartItems);
  };

  return (
    <div className="pos-page">
      <header className="pos-header">
        <div className="brand">
          <span className="brand-english">It's okay</span>
          <span className="brand-chinese">沒事咖啡</span>
          <span className="brand-divider" />
          <span className="brand-pos">POS</span>
          <span className="version">v0.2</span>
        </div>

        <div className="header-controls">
          <div className="dining-toggle">
            <button
              type="button"
              className={diningMode === 'dinein' ? 'selected' : ''}
              onClick={() => setDiningMode('dinein')}
            >
              ☕ 內用 <small>Dine in</small>
            </button>
            <button
              type="button"
              className={diningMode === 'takeout' ? 'selected' : ''}
              onClick={() => setDiningMode('takeout')}
            >
              🛍 外帶 <small>Take out</small>
            </button>
          </div>

          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input
              type="search"
              placeholder="搜尋商品..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>


    <nav className="category-nav" aria-label="商品分類">
      {/* 全部商品 */}
      <button
        type="button"
        className={`category-item ${
          activeCategory === null ? 'active' : ''
        }`}
        onClick={() => setActiveCategory(null)}
      >
        <span className="category-icon">🍽️</span>
        <span className="category-name">全部</span>
        <span className="category-en">All</span>
      </button>

      {/* 從 D1 取得的主分類 */}
      {mainCategories.map((category) => (
        <button
          key={category.id}
          type="button"
          className={`category-item ${
            activeCategory === category.id ? 'active' : ''
          }`}
          onClick={() => setActiveCategory(category.id)}
        >
          <span className="category-icon">
            {category.id === 1 ? '🍲' :
            category.id === 2 ? '🍝' :
            category.id === 3 ? '🥪' :
            category.id === 4 ? '🥖' :
            category.id === 5 ? '🍮' :
            category.id === 6 ? '🥗' :
            category.id === 7 ? '☕' :
            category.id === 8 ? '🥤' :
            category.id === 9 ? '🍵' : '🍽️'}
          </span>

          <span className="category-name">
            {category.name}
          </span>

          <span className="category-en">
            {category.english_name}
          </span>
        </button>
      ))}
    </nav>

    <div className="pos-content">
      <main className="menu-section">
        <div className="menu-heading">
          <h1>{currentCategory?.name ?? '全部'}</h1>

          <span className="menu-heading-en">
            {currentCategory?.english_name ?? 'All'}
          </span>
          <span className="menu-count">
            （共 {filteredProducts.length} 項）
          </span>
        </div>

        {loading && (
          <div className="message">菜單載入中...</div>
        )}

        {error && (
          <div className="message error">{error}</div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="message">
            目前沒有符合條件的商品
          </div>
        )}

        {!loading && !error && (
          activeCategory === null || isDrinkCategory ? (
            <div className="category-groups">
              {groupedProducts.map(({ category, items }) => (
                <section className="category-group" key={category.id}>
                  <div className="category-group-heading">
                    <h2>{category.name}</h2>

                    <span className="category-group-en">
                      {category.english_name}
                    </span>

                    <span className="category-group-count">
                      {items.length} 項
                    </span>
                  </div>

                  <div className="product-grid">
                    {items.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        selected={selectedProductId === product.id}
                        onSelect={() => handleProductClick(product)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  selected={selectedProductId === product.id}
                  onSelect={() => handleProductClick(product)}
                />
              ))}
            </div>
          )
        )}
      </main>
      <OrderSidebar
        items={cartItems}
        diningMode={diningMode}
        onQuantityChange={handleQuantityChange}
        onClear={handleClearOrder}
        onCheckout={handleCheckout}
      />
    </div>
    {/* 客製化彈跳視窗 */}
    {selectedProduct && (
      <ProductCustomizationModal
        key={selectedProduct.id}
        product={selectedProduct}
        groups={
          productOptions[selectedProduct.product_code] ?? []
        }
        onClose={() => setSelectedProduct(null)}
        onConfirm={handleCustomizationConfirm}
      />
    )}

    </div>
  );
}

function ProductCard({
  product,
  selected,
  onSelect,
}: {
  product: Product;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={`product-card${selected ? ' is-selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!event.repeat) onSelect();
        }
      }}
    >
      <div className="product-card-top">
        <h2>{product.name}</h2>
        <span className="product-arrow">›</span>
      </div>

      {product.english_name && (
        <span className="product-english-name">
          {product.english_name}
        </span>
      )}

      <div className="product-price">
        NT$ {product.price.toLocaleString('zh-TW')}
      </div>

      {product.description && (
        <p className="product-description">
          {product.description}
        </p>
      )}
    </article>
  );
}

export default App;
