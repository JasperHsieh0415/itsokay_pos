import { useState } from 'react';
import './AdminOrderItemPrice.css';

type Props = {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  disabled: boolean;
  onSave: (unitPrice: number) => Promise<void>;
};

export default function AdminOrderItemPrice({ itemId, name, unitPrice, quantity, disabled, onSave }: Props) {
  const [draft, setDraft] = useState(String(unitPrice));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  return (
    <form className="admin-item-price-form" onSubmit={async (event) => {
      event.preventDefault();
      if (disabled || saving) return;
      const price = Number(draft);
      setError('');
      setMessage('');
      if (!draft.trim() || !Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(price * quantity)) {
        setError('請輸入有效的 0 或正整數單價');
        return;
      }
      setSaving(true);
      try {
        await onSave(price);
        setMessage('單價已儲存');
      } catch (err) {
        setError(err instanceof Error ? err.message : '儲存單價失敗');
      } finally {
        setSaving(false);
      }
    }}>
      <label htmlFor={`item-price-${itemId}`}>{name}單價（NT$）</label>
      <div className="admin-item-price-controls">
        <input id={`item-price-${itemId}`} type="number" min="0" step="1" max={Number.MAX_SAFE_INTEGER} required
          value={draft} disabled={disabled || saving}
          onChange={(event) => { setDraft(event.target.value); setMessage(''); }} />
        <button type="submit" disabled={disabled || saving || draft === String(unitPrice)}>
          {saving ? '儲存中...' : '儲存單價'}
        </button>
      </div>
      <small>目前單價 NT${unitPrice.toLocaleString('zh-TW')} × {quantity}；僅更新此筆明細</small>
      {error && <small className="admin-item-price-error" role="alert">{error}</small>}
      {message && <small role="status">{message}</small>}
    </form>
  );
}
