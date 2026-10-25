
import { useCallback, useEffect, useMemo, useState } from 'react';
import './ChefOrders.css';

type ChefStatus = 'pending' | 'preparing' | 'ready';

type ChefItem = {
  order_id: string;
  order_number: string;
  table_id: string | null;
  dining_mode: 'dinein' | 'takeout';
  created_at: string;
  item_id: string;
  product_name: string;
  quantity: number;
  kitchen_status: ChefStatus;
};

type ChefTicket = {
  orderId: string;
  orderNumber: string;
  tableId: string | null;
  diningMode: 'dinein' | 'takeout';
  createdAt: string;
  items: ChefItem[];
};

type Filter = 'active' | 'ready' | 'all';

function formatTime(value: string): string {
  const date = new Date(value.replace(' ', 'T') + 'Z');

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString('zh-TW', {
        timeZone: 'Asia/Taipei',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
}

export default function ChefOrders() {
  const [keyInput, setKeyInput] = useState('');
  const [chefKey, setChefKey] = useState('');

  const [items, setItems] = useState<ChefItem[]>([]);
  const [filter, setFilter] = useState<Filter>('active');

  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async (
    signal?: AbortSignal
  ) => {
    if (!chefKey) return;

    try {
      const response = await fetch('/api/chef/orders', {
        headers: {
          Authorization: `Bearer ${chefKey}`,
        },
        cache: 'no-store',
        signal,
      });

      if (response.status === 401) {
        if (!signal?.aborted) {
          setError('Chef 密鑰錯誤或已失效');
          setChefKey('');
          setItems([]);
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !Array.isArray(result.data)) {
        throw new Error('Invalid API response');
      }

      if (!signal?.aborted) {
        setItems(result.data);
        setError('');
      }
    } catch (err) {
      if (signal?.aborted) return;
      console.error(err);
      setError('無法取得廚房訂單');
    }
  }, [chefKey]);

  useEffect(() => {
    if (!chefKey) return;

    const controller = new AbortController();

    setLoading(true);

    loadOrders(controller.signal).finally(() => {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    });

    const timer = window.setInterval(() => {
      loadOrders(controller.signal);
    }, 5000);

    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
  }, [chefKey, loadOrders]);

  const tickets = useMemo<ChefTicket[]>(() => {
    const map = new Map<string, ChefTicket>();

    for (const item of items) {
      let ticket = map.get(item.order_id);

      if (!ticket) {
        ticket = {
          orderId: item.order_id,
          orderNumber: item.order_number,
          tableId: item.table_id,
          diningMode: item.dining_mode,
          createdAt: item.created_at,
          items: [],
        };

        map.set(item.order_id, ticket);
      }

      ticket.items.push(item);
    }

    return Array.from(map.values());
  }, [items]);

  const isTicketReady = (ticket: ChefTicket) =>
    ticket.items.every(
      (item) => item.kitchen_status === 'ready'
    );

  const visibleTickets = tickets.filter((ticket) => {
    if (filter === 'all') return true;
    if (filter === 'ready') return isTicketReady(ticket);
    return !isTicketReady(ticket);
  });

  const updateItem = async (
    item: ChefItem,
    nextStatus: ChefStatus
  ) => {
    if (busyId) return;

    setBusyId(item.item_id);
    setError('');

    try {
      const response = await fetch(
        `/api/chef/items/${encodeURIComponent(item.item_id)}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${chefKey}`,
          },
          body: JSON.stringify({
            status: nextStatus,
            expected_status: item.kitchen_status,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? '更新失敗'
        );
      }

      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '更新熟食狀態失敗'
      );
      await loadOrders();
    } finally {
      setBusyId(null);
    }
  };

  if (!chefKey) {
    return (
      <main className="chef-login">
        <form
          className="chef-login-card"
          onSubmit={(event) => {
            event.preventDefault();
            if (!keyInput.trim()) return;
            setError('');
            setChefKey(keyInput.trim());
            setKeyInput('');
          }}
        >
          <h1>It's okay</h1>
          <h2>廚房出單系統</h2>
          <p>Kitchen Display System</p>

          {error && <p role="alert">{error}</p>}

          <input
            type="password"
            value={keyInput}
            onChange={(event) =>
              setKeyInput(event.target.value)
            }
            placeholder="Chef 管理密鑰"
            autoComplete="off"
            required
          />

          <button type="submit">
            進入廚房系統
          </button>
        </form>
      </main>
    );
  }

  const pendingCount = items.filter(
    (item) => item.kitchen_status === 'pending'
  ).length;

  const preparingCount = items.filter(
    (item) => item.kitchen_status === 'preparing'
  ).length;

  const completedCount = tickets.filter(
    isTicketReady
  ).length;

  return (
    <main className="chef-page">
      <header className="chef-header">
        <div>
          <h1>It's okay · 廚房出單</h1>
          <p>Kitchen Display System</p>
        </div>

        <div className="chef-header-actions">
          <button onClick={() => loadOrders()}>
            重新整理
          </button>
          <button onClick={() => {
            setChefKey('');
            setItems([]);
          }}>
            登出
          </button>
        </div>
      </header>

      <section className="chef-stats">
        <div>
          <span>待製作明細</span>
          <strong>{pendingCount}</strong>
        </div>
        <div>
          <span>製作中明細</span>
          <strong>{preparingCount}</strong>
        </div>
        <div>
          <span>熟食已完成訂單</span>
          <strong>{completedCount}</strong>
        </div>
      </section>

      <nav className="chef-filters">
        <button
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          進行中
        </button>

        <button
          className={filter === 'ready' ? 'active' : ''}
          onClick={() => setFilter('ready')}
        >
          已完成
        </button>

        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          全部
        </button>
      </nav>

      {error && (
        <div className="chef-error" role="alert">
          {error}
        </div>
      )}

      {loading && <p>載入廚房訂單中...</p>}

      <section className="chef-ticket-grid">
        {!loading && visibleTickets.length === 0 && (
          <p>目前沒有符合條件的熟食訂單</p>
        )}

        {visibleTickets.map((ticket) => {
          const ready = isTicketReady(ticket);

          return (
            <article
              className={`chef-ticket ${
                ready ? 'chef-ticket-ready' : ''
              }`}
              key={ticket.orderId}
            >
              <div className="chef-ticket-header">
                <div>
                  <h2>
                    {ticket.diningMode === 'dinein'
                      ? ticket.tableId
                      : '外帶'}
                  </h2>
                  <small>
                    #{ticket.orderNumber}
                  </small>
                </div>

                <span className="chef-ticket-time">
                  {formatTime(ticket.createdAt)}
                </span>
              </div>

              <div className="chef-ticket-items">
                {ticket.items.map((item) => {
                const nextStatus =
                item.kitchen_status === 'ready'
                    ? null
                    : 'ready';

                  return (
                    <div
                      className="chef-item"
                      key={item.item_id}
                    >
                      <div className="chef-item-title">
                        <span>{item.product_name}</span>
                        <strong>× {item.quantity}</strong>
                      </div>

                      <div className="chef-item-bottom">
                        <span
                          className={`chef-item-status ${
                            item.kitchen_status
                          }`}
                        >
                          {item.kitchen_status === 'pending'
                            ? '待製作'
                            : item.kitchen_status === 'preparing'
                              ? '製作中'
                              : '已完成'}
                        </span>

                        {nextStatus && (
                          <button
                            disabled={busyId !== null}
                            onClick={() =>
                              updateItem(item, 'ready')
                            }
                          >
                            {busyId === item.item_id
                            ? '更新中...'
                            : '製作完成'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {ready && (
                <div className="chef-ticket-complete">
                  ✓ 本單所有熟食已完成
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
