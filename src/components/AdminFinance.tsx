import { Fragment, useEffect, useRef, useState } from 'react';
import './AdminOrders.css';
import './AdminFinance.css';

type HistoryOrder = {
  id: string;
  order_number: string;
  created_at: string;
  dining_mode: 'dinein' | 'takeout';
  table_id: string | null;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  subtotal_amount: number;
  discount_amount: number;
  custom_discount_amount: number;
  total_amount: number;
  items: {
    id: string;
    product_name: string;
    quantity: number;
    line_total: number;
    selected_options: { option_name: string }[];
  }[];
};

const statusLabels: Record<HistoryOrder['status'], string> = {
  pending: '待處理', confirmed: '已接單', preparing: '製作中',
  ready: '待出餐', completed: '已完成', cancelled: '已取消',
};
const money = (amount: number) => 'NT$' + amount.toLocaleString('zh-TW');
function formatTime(value: string) {
  const date = new Date(value.replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function MonthOrders({ adminKey, month, onLogout }: {
  adminKey: string;
  month: string;
  onLogout: () => void;
}) {
  const [page, setPage] = useState(1);
  const [snapshot, setSnapshot] = useState<{ orders: HistoryOrder[]; total: number; page: number } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const logoutRef = useRef(onLogout);
  useEffect(() => { logoutRef.current = onLogout; }, [onLogout]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/admin/finance/orders?page=' + page + '&month=' + month, {
          headers: { Authorization: 'Bearer ' + adminKey },
          cache: 'no-store', signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401) {
          logoutRef.current();
          return;
        }
        if (!response.ok) throw new Error('無法取得歷史訂單，請稍後重試');
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (!result.success || !Array.isArray(result.data) || !result.pagination) {
          throw new Error('歷史訂單資料格式不正確');
        }
        setSnapshot({ orders: result.data, total: result.pagination.total, page });
        setError('');
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : '無法取得歷史訂單');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [adminKey, month, page, refresh]);

  const totalPages = Math.max(1, Math.ceil((snapshot?.total ?? 0) / 50));
  const changePage = (nextPage: number) => {
    setLoading(true);
    setError('');
    setSnapshot(null);
    setPage(nextPage);
  };
  const reload = () => {
    setLoading(true);
    setError('');
    setRefresh((value) => value + 1);
  };

  return (
    <section className="finance-month-orders" aria-label={month + ' 訂單明細'}>
      {error && <div className="admin-error" role="alert">{error}<button type="button" onClick={reload}>重試</button></div>}
      {loading && <p role="status">歷史訂單載入中…</p>}

      <div className="admin-order-table-wrap" aria-busy={loading}>
        <table className="admin-order-table finance-table">
          <caption>{month} 訂單明細{snapshot ? '（共 ' + snapshot.total + ' 筆）' : ''}</caption>
          <thead>
            <tr>
              <th scope="col">下單時間</th><th scope="col">單號</th>
              <th scope="col">桌號／外帶</th><th scope="col">品項明細</th>
              <th scope="col">狀態</th><th scope="col">原價小計</th>
              <th scope="col">餐飲優惠</th><th scope="col">自訂減免</th><th scope="col">訂單金額</th>
            </tr>
          </thead>
          <tbody>
            {snapshot?.orders.map((order) => (
              <tr key={order.id}>
                <td>{formatTime(order.created_at)}</td>
                <td>#{order.order_number}</td>
                <td>{order.dining_mode === 'dinein' ? order.table_id + ' · 內用' : '外帶'}</td>
                <td>{order.items.map((item) => (
                  <div className="finance-item" key={item.id}>
                    <span>{item.product_name} × {item.quantity} · {money(item.line_total)}</span>
                    {item.selected_options.length > 0 && <small>{item.selected_options.map((option) => option.option_name).join('、')}</small>}
                  </div>
                ))}</td>
                <td>{statusLabels[order.status]}</td>
                <td>{money(order.subtotal_amount)}</td>
                <td>{money(order.discount_amount)}</td>
                <td>{money(order.custom_discount_amount)}</td>
                <td>{money(order.total_amount)}</td>
              </tr>
            ))}
            {!loading && snapshot?.orders.length === 0 && <tr><td colSpan={9} className="admin-order-table-empty">目前沒有歷史訂單</td></tr>}
          </tbody>
        </table>
      </div>

      <nav className="finance-pagination" aria-label={month + ' 訂單分頁'}>
        <button type="button" disabled={loading || page <= 1} onClick={() => changePage(page - 1)}>上一頁</button>
        <span aria-live="polite">{snapshot ? '第 ' + snapshot.page + ' / ' + totalPages + ' 頁，每頁 50 筆' : '第 ' + page + ' 頁'}</span>
        <button type="button" disabled={loading || !snapshot || page >= totalPages} onClick={() => changePage(page + 1)}>下一頁</button>
      </nav>
    </section>
  );
}

type MonthSummary = {
  month: string;
  order_count: number;
  completed_count: number;
  total_income: number;
  previous_month: string;
  previous_income: number;
  change_percent: number | null;
};

function MonthRow({ summary, adminKey, onLogout }: {
  summary: MonthSummary;
  adminKey: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = 'finance-month-' + summary.month;
  const percent = summary.change_percent;
  const changeClass = percent === null || percent === 0 ? '' : percent > 0 ? 'finance-increase' : 'finance-decrease';
  return (
    <Fragment>
      <tr className="finance-month-summary">
        <th scope="row">{summary.month.replace('-', ' 年 ')} 月</th>
        <td>{summary.order_count.toLocaleString('zh-TW')}</td>
        <td>{summary.completed_count.toLocaleString('zh-TW')}</td>
        <td className="finance-income">{money(summary.total_income)}</td>
        <td className={changeClass}>
          {percent === null ? '無法計算（上月收入為 0）' : percent.toLocaleString('zh-TW', {
            minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero',
          }) + '%'}
          <small>比較 {summary.previous_month} · {money(summary.previous_income)}</small>
        </td>
        <td>
          <button type="button" aria-expanded={open} aria-controls={detailsId}
            aria-label={(open ? '收合 ' : '展開 ') + summary.month + ' 訂單明細'}
            onClick={() => setOpen((value) => !value)}>
            {open ? '收合明細' : '展開明細'}
          </button>
        </td>
      </tr>
      <tr id={detailsId} hidden={!open} className="finance-month-details">
        <td colSpan={6}>
          {open && <MonthOrders month={summary.month} adminKey={adminKey} onLogout={onLogout} />}
        </td>
      </tr>
    </Fragment>
  );
}

function MonthlyOverview({ adminKey, onLogout, onRetry }: {
  adminKey: string;
  onLogout: () => void;
  onRetry: () => void;
}) {
  const [months, setMonths] = useState<MonthSummary[] | null>(null);
  const [error, setError] = useState('');
  const logoutRef = useRef(onLogout);
  useEffect(() => { logoutRef.current = onLogout; }, [onLogout]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/admin/finance/months', {
          headers: { Authorization: 'Bearer ' + adminKey },
          cache: 'no-store', signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401) {
          logoutRef.current();
          return;
        }
        if (!response.ok) throw new Error('無法取得月份統計，請稍後重試');
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (!result.success || !Array.isArray(result.data)) throw new Error('月份統計資料格式不正確');
        setMonths(result.data);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '無法取得月份統計');
      }
    }
    void load();
    return () => controller.abort();
  }, [adminKey]);

  if (error) return <div className="admin-error" role="alert">{error}<button type="button" onClick={onRetry}>重試</button></div>;
  if (!months) return <p role="status">月份統計載入中…</p>;
  return (
    <div className="admin-order-table-wrap finance-months-wrap">
      <table className="finance-months-table">
        <caption>每月收入統計</caption>
        <thead>
          <tr>
            <th scope="col">月份</th><th scope="col">訂單數</th><th scope="col">已完成訂單</th>
            <th scope="col">總收入</th><th scope="col">收入較上月增減</th><th scope="col">訂單明細</th>
          </tr>
        </thead>
        <tbody>
          {months.map((summary) => <MonthRow key={summary.month} summary={summary} adminKey={adminKey} onLogout={onLogout} />)}
          {months.length === 0 && <tr><td colSpan={6} className="finance-empty">目前沒有歷史訂單</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminFinance({ adminKey, onBack, onLogout, onAccount }: {
  adminKey: string;
  onAccount: () => void;
  onBack: () => void;
  onLogout: () => void;
}) {
  const [refresh, setRefresh] = useState(0);
  const reload = () => setRefresh((value) => value + 1);
  return (
    <main className="admin-page admin-finance">
      <header className="admin-header">
        <div>
          <h1>It's okay · 財務管理</h1>
          <p>每月收入統計 · 展開月份查看歷史訂單</p>
        </div>
        <div className="admin-actions">
          <button type="button" onClick={onAccount}>帳號設定</button>
          <button type="button" onClick={onBack}>返回訂單管理</button>
          <button type="button" onClick={reload}>重新整理</button>
          <button type="button" onClick={onLogout}>登出</button>
        </div>
      </header>
      <p className="finance-definition">依台灣下單月份統計，總收入為已完成訂單扣除優惠與減免後的金額。收入較上月增減＝（本月收入 − 上月收入）÷ 上月收入 × 100%。</p>
      <MonthlyOverview key={refresh} adminKey={adminKey} onLogout={onLogout} onRetry={reload} />
    </main>
  );
}
