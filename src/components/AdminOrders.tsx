
import { useCallback, useEffect, useState } from 'react';
import './AdminOrders.css';

type OrderStatus =
  | 'pending'
  | 'confirmed'
//   | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

type OrderItem = {
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type Order = {
  id: string;
  order_number: string;
  dining_mode: 'dinein' | 'takeout';
  table_id: string | null;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
};

const LABELS: Record<OrderStatus, string> = {
  pending: '待確認',
  confirmed: '已確認',
//   preparing: '製作中',
  ready: '可出餐',
  completed: '已完成',
  cancelled: '已取消',
};

const NEXT: Partial<Record<
  OrderStatus,
  { status: OrderStatus; label: string }
>> = {
  pending: { status: 'confirmed', label: '確認接單' },
//   confirmed: { status: 'preparing', label: '開始製作' },
//   preparing: { status: 'ready', label: '製作完成' },
  confirmed: { status: 'ready', label: '製作完成' },
  ready: { status: 'completed', label: '已交付餐點' },
};

function formatTime(value: string) {
  // D1 CURRENT_TIMESTAMP 預設為 UTC
  const date = new Date(value.replace(' ', 'T') + 'Z');

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
}

function getOrderDay(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value.replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime())
    ? '日期不明'
    : new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
}

export default function AdminOrders() {
  const [keyInput, setKeyInput] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [today, setToday] = useState(() => getOrderDay(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadOrders = useCallback(async (
    signal?: AbortSignal
  ) => {
    if (!adminKey) return;

    try {
      const response = await fetch('/api/admin/orders', {
        headers: {
          Authorization: `Bearer ${adminKey}`,
        },
        cache: 'no-store',
        signal,
      });

      if (response.status === 401) {
        setError('管理密鑰不正確');
        setAdminKey('');
        setOrders([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !Array.isArray(result.data)) {
        throw new Error('Invalid response');
      }

      setToday(getOrderDay(new Date()));
      setOrders(result.data);
      setError('');
    } catch (err) {
      if (signal?.aborted) return;
      setError('無法取得訂單資料，請確認 Worker 及 D1');
      console.error(err);
    }
  }, [adminKey]);

  useEffect(() => {
    if (!adminKey) return;

    const controller = new AbortController();

    setLoading(true);
    loadOrders(controller.signal).finally(() => {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    });

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadOrders(controller.signal);
      }
    }, 5000);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [adminKey, loadOrders]);

  const updateStatus = async (
    order: Order,
    status: OrderStatus
  ) => {
    if (busyId) return;

    setBusyId(order.id);
    setError('');

    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.id)}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminKey}`,
          },
          body: JSON.stringify({
            status,
            expected_status: order.status,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? '更新失敗');
      }

      setOrders((current) => current.map((item) =>
        item.id === order.id ? { ...item, status } : item
      ));
      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '更新訂單失敗'
      );
      // 衝突時重新取得最新訂單
      await loadOrders();
    } finally {
      setBusyId(null);
    }
  };

  if (!adminKey) {
    return (
      <main className="admin-login">
        <form
          className="admin-login-card"
          onSubmit={(event) => {
            event.preventDefault();
            if (keyInput.trim()) {
              setAdminKey(keyInput.trim());
              setKeyInput('');
            }
          }}
        >
          <h1>It's okay</h1>
          <h2>櫃台訂單管理</h2>
          <p>請輸入管理密鑰</p>
          {error && <p role="alert">{error}</p>}
          <input
            type="password"
            autoComplete="off"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="管理密鑰"
            required
          />
          <button type="submit">進入管理頁</button>
        </form>
      </main>
    );
  }

  const activeOrders = orders.filter(
    (order) =>
      order.status !== 'ready' &&
      order.status !== 'completed' &&
      order.status !== 'cancelled'
  );

  const completedOrders = orders.filter(
    (order) =>
      (order.status === 'ready' || order.status === 'completed') &&
      getOrderDay(order.created_at) === today
  );

  const stats: OrderStatus[] = ['pending', 'confirmed'];

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <h1>It's okay · 訂單管理</h1>
          <p>Order Management · 每 5 秒自動更新</p>
        </div>
        <div className="admin-actions">
          <button onClick={() => loadOrders()}>
            重新整理
          </button>
          <button
            onClick={() => {
              setAdminKey('');
              setOrders([]);
            }}
          >
            登出
          </button>
        </div>
      </header>

      <section className="admin-stats">
        {stats.map((status) => (
          <div className="admin-stat" key={status}>
            <span>{LABELS[status]}</span>
            <strong>
              {orders.filter(
                (order) => order.status === status
              ).length}
            </strong>
          </div>
        ))}
      </section>

      {error && (
        <div className="admin-error" role="alert">
          {error}
        </div>
      )}

      {loading && <p>訂單載入中...</p>}

      <section className="admin-order-section">
        <h2 className="admin-section-title">
          進行中訂單（{activeOrders.length}）
        </h2>
          <section className="admin-order-grid">
            {activeOrders.length === 0 && !loading && (
              <p>目前沒有進行中的訂單</p>
            )}

            {activeOrders.map((order) => {
              const next = NEXT[order.status];

              return (
                <article className="admin-order-card" key={order.id}>
                  <div className="admin-order-heading">
                    <div>
                      <h3>
                        {order.dining_mode === 'dinein'
                          ? `${order.table_id} · 內用`
                          : '外帶'}
                      </h3>
                      <small>#{order.order_number}</small>
                    </div>

                    <span
                      className={`admin-status status-${order.status}`}
                    >
                      {LABELS[order.status]}
                    </span>
                  </div>

                  <p className="admin-order-time">
                    {formatTime(order.created_at)}
                  </p>

                  <div className="admin-order-items">
                    {order.items.map((item, index) => (
                      <div key={`${order.id}-${index}`}>
                        <span>
                          {item.product_name}
                          <b> × {item.quantity}</b>
                        </span>
                        <span>
                          NT${item.line_total}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="admin-order-total">
                    <span>總金額</span>
                    <strong>
                      NT${order.total_amount.toLocaleString()}
                    </strong>
                  </div>

                  <div className="admin-order-buttons">
                    {next && (
                      <button
                        disabled={busyId !== null}
                        onClick={() =>
                          updateStatus(order, next.status)
                        }
                      >
                        {busyId === order.id
                          ? '更新中...'
                          : next.label}
                      </button>
                    )}

                    {(order.status === 'pending' ||
                      order.status === 'confirmed') && (
                      <button
                        className="admin-cancel"
                        disabled={busyId !== null}
                        onClick={() => {
                          if (window.confirm('確定取消這筆訂單？')) {
                            updateStatus(order, 'cancelled');
                          }
                        }}
                      >
                        取消訂單
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
      </section>

      <section className="admin-order-section">
        <details className="admin-completed-orders">
          <summary>當日完成訂單（{completedOrders.length}）</summary>
          {completedOrders.length === 0 && !loading && (
            <p>目前沒有當日完成的訂單</p>
          )}
            <div className="admin-order-table-wrap">
              <table className="admin-order-table">
                <thead>
                  <tr>
                    <th scope="col">時間</th>
                    <th scope="col">單號</th>
                    <th scope="col">內用桌號/外帶</th>
                    <th scope="col">品項明細</th>
                    <th scope="col">總金額</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{formatTime(order.created_at)}</td>
                      <td>#{order.order_number}</td>
                      <td>
                        {order.dining_mode === 'dinein'
                          ? `${order.table_id} · 內用`
                          : '外帶'}
                      </td>
                      <td>
                        {order.items.map((item, index) => (
                          <div key={`${order.id}-${index}`}>
                            {item.product_name} × {item.quantity}
                          </div>
                        ))}
                      </td>
                      <td>NT${order.total_amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={4}>當日總金額</th>
                    <td>
                      NT${completedOrders.reduce((total, order) =>
                        total + order.total_amount, 0
                      ).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
        </details>
      </section>
    </main>
  );
}
