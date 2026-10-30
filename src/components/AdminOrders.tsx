
import { useCallback, useEffect, useState } from 'react';
import './AdminOrders.css';
import AdminOrderItemPrice from './AdminOrderItemPrice';

type OrderStatus =
  | 'pending'
  | 'confirmed'
//   | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

type OrderItem = {
  id: string;
  product_code: string;
  order_id: string;
  product_name: string;
  selected_options?: { option_name: string }[];
  quantity: number;
  unit_price: number;
  line_total: number;
  station: 'kitchen' | 'bar' | 'none';
  kitchen_status: 'not_required' | 'pending' | 'preparing' | 'ready';
};

type Order = {
  id: string;
  order_number: string;
  dining_mode: 'dinein' | 'takeout';
  table_id: string | null;
  status: OrderStatus;
  total_amount: number;
  discount_amount?: number;
  created_at: string;
  items: OrderItem[];
};

// const NEXT: Partial<Record<
//   OrderStatus,
//   { status: OrderStatus; label: string }
// >> = {
//   pending: { status: 'confirmed', label: '確認接單' },
// //   confirmed: { status: 'preparing', label: '開始製作' },
// //   preparing: { status: 'ready', label: '製作完成' },
//   confirmed: { status: 'ready', label: '製作完成' },
//   ready: { status: 'completed', label: '已交付餐點' },
// };

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
    status: OrderStatus,
    force = false
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
            force,
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

  const updateItemPrice = async (order: Order, item: OrderItem, unitPrice: number) => {
    if (busyId) throw new Error('其他操作處理中，請稍後再試');
    setBusyId(order.id);
    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.id)}/items/${encodeURIComponent(item.id)}/price`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
          body: JSON.stringify({ unit_price: unitPrice, expected_unit_price: item.unit_price }),
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? '儲存單價失敗');
      setOrders((current) => current.map((saved) => saved.id === order.id ? {
        ...saved,
        total_amount: result.data.order.total_amount,
        items: saved.items.map((line) => line.id === item.id ? { ...line, ...result.data.item } : line),
      } : saved));
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
      order.status !== 'completed' &&
      order.status !== 'cancelled'
  );

  const completedOrders = orders.filter(
    (order) =>
      (order.status === 'completed') &&
      getOrderDay(order.created_at) === today
  );

  const stats = [
    { label: '進行中', count: activeOrders.length },
    { label: '已完成', count: completedOrders.length },
  ];

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
        {stats.map((stat) => (
          <div className="admin-stat" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.count}</strong>
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
              // const next = NEXT[order.status];
              const kitchenItems = order.items.filter(
                (item) => item.station === 'kitchen'
              );

              const kitchenReadyCount = kitchenItems.filter(
                (item) => item.kitchen_status === 'ready'
              ).length;

              const hasKitchenItems = kitchenItems.length > 0;

              const kitchenComplete =
                kitchenReadyCount === kitchenItems.length;

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
                          {Boolean(item.selected_options?.length) && (
                            <small className="admin-item-options">
                              {item.selected_options?.map((option) => option.option_name).join('、')}
                            </small>
                          )}

                          {item.station === 'kitchen' && (
                            <small className={
                              item.kitchen_status === 'ready'
                                ? 'admin-item-ready'
                                : 'admin-item-waiting'
                            }>
                              {item.kitchen_status === 'ready'
                                ? ' ✓ 熟食完成'
                                : ' · 等待廚房'}
                            </small>
                          )}

                          {item.station === 'bar' && (
                            <small> · 吧台處理</small>
                          )}
                        </span>

                        <div className="admin-item-price">
                          <span>NT${item.line_total.toLocaleString('zh-TW')}</span>
                          {['M027', 'M047'].includes(item.product_code) && (
                            <AdminOrderItemPrice
                              key={`${item.id}:${item.unit_price}`}
                              itemId={item.id}
                              name={item.product_name}
                              unitPrice={item.unit_price}
                              quantity={item.quantity}
                              disabled={busyId !== null}
                              onSave={(price) => updateItemPrice(order, item, price)}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {(order.discount_amount ?? 0) > 0 && (
                    <p className="admin-order-discount">
                      餐點搭飲品優惠 − NT${order.discount_amount?.toLocaleString()}
                    </p>
                  )}
                  <div className="admin-order-total">
                    <span>總金額</span>
                    <strong>
                      NT${order.total_amount.toLocaleString()}
                    </strong>
                  </div>

                  <div className={`admin-kitchen-progress ${
                    kitchenComplete ? 'is-ready' : 'is-waiting'
                  }`}>
                    {hasKitchenItems ? (
                      <>
                        <div className="admin-kitchen-heading">
                          <strong>廚房熟食進度</strong>
                          <span>
                            {kitchenReadyCount} / {kitchenItems.length}
                          </span>
                        </div>

                        <div className="admin-kitchen-bar">
                          <div
                            className="admin-kitchen-bar-fill"
                            style={{
                              width: `${
                                (kitchenReadyCount / kitchenItems.length) * 100
                              }%`
                            }}
                          />
                        </div>

                        <p>
                          {kitchenComplete
                            ? '✓ 熟食已完成，等待櫃台確認出餐'
                            : '⏳ 廚房尚未完成全部熟食'}
                        </p>
                      </>
                    ) : (
                      <p>此訂單不含熟食，可由櫃台直接處理</p>
                    )}
                  </div>


                  <div className="admin-order-buttons">
                    {/* 完成訂單：所有熟食完成後才允許 */}
                    <button
                      type="button"
                      className="admin-complete"
                      disabled={busyId !== null || !kitchenComplete}
                      onClick={() => {
                        updateStatus(order, 'completed');
                      }}
                    >
                      {busyId === order.id ? '處理中...' : '完成訂單'}
                    </button>

                    {!kitchenComplete && (
                      <button
                        type="button"
                        className="admin-force-complete"
                        disabled={busyId !== null}
                        onClick={() => {
                          if (window.confirm(`確定強制完成訂單 #${order.order_number}？尚未完成的熟食也會標記為完成，並從廚房待處理清單移除。`)) {
                            updateStatus(order, 'completed', true);
                          }
                        }}
                      >
                        {busyId === order.id ? '處理中...' : '強制完成'}
                      </button>
                    )}

                    {/* 取消訂單：不受熟食狀態限制 */}
                    <button
                      type="button"
                      className="admin-cancel"
                      disabled={busyId !== null}
                      onClick={() => {
                        if (
                          window.confirm(
                            `確定取消訂單 #${order.order_number}？`
                          )
                        ) {
                          updateStatus(order, 'cancelled');
                        }
                      }}
                    >
                      {busyId === order.id ? '處理中...' : '取消訂單'}
                    </button>
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
                            {Boolean(item.selected_options?.length) && (
                              <small>（{item.selected_options?.map((option) => option.option_name).join('、')}）</small>
                            )}
                          </div>
                        ))}
                        {(order.discount_amount ?? 0) > 0 && (
                          <div className="admin-order-discount">
                            餐點搭飲品優惠 − NT${order.discount_amount?.toLocaleString()}
                          </div>
                        )}
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
