
import { useEffect, useState } from 'react';
import './App.css';

type Product = {
  id: number;
  name: string;
  price: number;
};

type MenuResponse = {
  success: boolean;
  data: Product[];
};

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const response = await fetch('/api/menu');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result: MenuResponse = await response.json();

        if (!result.success) {
          throw new Error('API returned an error');
        }

        setProducts(result.data);
      } catch (err) {
        console.error('Failed to fetch menu:', err);
        setError('無法取得菜單，請稍後再試');
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
  }, []);

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>It's okay 沒事咖啡</h1>
          <p>Restaurant Menu</p>
        </div>
        <span className="status">營業中</span>
      </header>

      <div className="banner">
        <img
          src="/images/banner.jpg"
          alt="餐廳形象 Banner"
        />
      </div>

      <main>
        <h2>菜單 Menu</h2>

        {loading && <p>菜單載入中...</p>}

        {error && <p className="error">{error}</p>}

        {!loading && !error && products.length === 0 && (
          <p>目前沒有可供應的商品</p>
        )}

        {!loading && !error && products.map((product) => (
          <div className="product" key={product.id}>
            <div>
              <h3>{product.name}</h3>
              <p>商品編號 #{product.id}</p>
            </div>

            <span className="price">
              NT$ {product.price}
            </span>
          </div>
        ))}
      </main>

      <footer>
        商品資料由 Cloudflare D1 提供
      </footer>
    </div>
  );
}

export default App;
