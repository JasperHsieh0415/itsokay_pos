import { useRef, useState } from 'react';

type Props = {
  orderId: string;
  amount: number;
  maxAmount: number;
  disabled: boolean;
  onSave: (amount: number) => Promise<void>;
};

export default function AdminOrderDiscount({ orderId, amount, maxAmount, disabled, onSave }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(String(amount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  return (
    <>
      <button type="button" className="admin-discount-trigger" disabled={disabled || saving}
        aria-haspopup="dialog" aria-controls={`discount-dialog-${orderId}`}
        onClick={() => {
          setDraft(String(amount));
          setError('');
          dialogRef.current?.showModal();
          inputRef.current?.focus();
          inputRef.current?.select();
        }}>
        {amount > 0 ? '修改減免' : '自訂減免'}
      </button>
      <dialog ref={dialogRef} id={`discount-dialog-${orderId}`} className="admin-discount-dialog"
        aria-labelledby={`discount-title-${orderId}`}
        onCancel={(event) => { if (saving) event.preventDefault(); }}>
        <form className="admin-discount-form" onSubmit={async (event) => {
          event.preventDefault();
          if (disabled || saving) return;
          const value = Number(draft);
          setError('');
          if (!draft.trim() || !Number.isSafeInteger(value) || value < 0 || value > maxAmount) {
            setError(`請輸入 0 至 ${maxAmount.toLocaleString('zh-TW')} 的整數金額`);
            return;
          }
          setSaving(true);
          try {
            await onSave(value);
            dialogRef.current?.close();
          } catch (err) {
            setError(err instanceof Error ? err.message : '儲存減免失敗');
          } finally {
            setSaving(false);
          }
        }}>
          <h2 id={`discount-title-${orderId}`}>自訂減免</h2>
          <label htmlFor={`discount-${orderId}`}>減免金額（NT$）</label>
          <input ref={inputRef} id={`discount-${orderId}`} type="number" min="0" step="1" max={maxAmount} required
            aria-describedby={`discount-help-${orderId}`} aria-invalid={Boolean(error)}
            value={draft} disabled={disabled || saving}
            onChange={(event) => { setDraft(event.target.value); setError(''); }} />
          <p id={`discount-help-${orderId}`} className="admin-discount-help">
            最多可減免 NT${maxAmount.toLocaleString('zh-TW')}；輸入 0 可取消減免。
          </p>
          {error && <p className="admin-discount-error" role="alert">{error}</p>}
          <div className="admin-discount-controls">
            <button type="button" className="admin-discount-cancel" disabled={saving}
              onClick={() => dialogRef.current?.close()}>取消</button>
            <button type="submit" disabled={disabled || saving}>
              {saving ? '儲存中...' : '套用減免'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
