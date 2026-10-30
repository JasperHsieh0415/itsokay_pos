
import { useEffect, useRef, useState } from 'react';
import './OrderSidebar.css';
import type { SelectedOption } from './ProductCustomizationModal';
import { calculateMealDrinkDiscount } from '../data/orderDiscount';

export type CartItem = {
  cartId: string;
  productId: number;
  productCode: string;
  name: string;
  price: number; // 已包含客製化加價的單份價格
  quantity: number;
  selectedOptions: SelectedOption[];
};

type OrderSidebarProps = {
  items: CartItem[];
  diningMode: 'dinein' | 'takeout';
  tableId?: string | null;
  onQuantityChange: (cartId: string, quantity: number) => void;
  onClear: () => void;
  onCheckout: () => void;
  submitting?: boolean;
  error?: string | null;
};

function OrderSidebar({
  items,
  diningMode,
  tableId,
  onQuantityChange,
  onClear,
  onCheckout,
  submitting = false,
  error,
}: OrderSidebarProps) {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia('(max-width: 700px)').matches
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)');
    const handleChange = () => {
      setIsMobile(media.matches);
      setMobileOpen(false);
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, mobileOpen]);
  const totalQuantity = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const { pairCount, discountAmount } = calculateMealDrinkDiscount(items);
  const total = subtotal - discountAmount;

  const orderContent = (
    <aside className="order-sidebar" aria-labelledby="order-summary-title">
      {/* Header */}
      <div className="order-header">
        <div>
          <h2 id="order-summary-title">訂單明細</h2>
          <span>Order Summary</span>
        </div>

        <div className="order-header-actions">
          <span className="order-count">{totalQuantity} 件</span>
          {isMobile && (
            <button
              type="button"
              className="order-sheet-close"
              aria-label="關閉訂單明細，繼續點餐"
              autoFocus
              onClick={() => setMobileOpen(false)}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Dining Mode */}
      <div className="order-dining-info">
        <span>
          {diningMode === 'dinein' ? '☕ 內用' : '🛍 外帶'}
        </span>

        <strong>
          {diningMode === 'dinein'
            ? `桌號 ${tableId ?? '未選擇'}`
            : 'Take out'}
        </strong>
      </div>

      {/* Cart Items */}
      <div className="order-body">
        {items.length === 0 ? (
          <div className="order-empty">
            <div className="order-empty-icon">🛒</div>
            <p>尚未選擇餐點</p>
            <small>請從菜單選擇喜歡的餐點</small>
          </div>
        ) : (
          <div className="order-items">
            {items.map((item) => (
              <div className="order-item" key={item.cartId}>
                <div className="order-item-top">
                  <div className="order-item-info">
                    <h3>{item.name}</h3>
                    {item.selectedOptions.length > 0 && (
                    <div className="order-item-options">
                        {item.selectedOptions.map((option) => (
                        <div
                            key={`${option.groupId}-${option.optionId}`}
                            className="order-item-option"
                        >
                            <span>＋ {option.name}</span>
                            {option.priceDelta > 0 && (
                            <span>+ NT$ {option.priceDelta}</span>
                            )}
                        </div>
                        ))}
                    </div>
                    )}
                  </div>

                  <div className="order-item-actions">
                    <strong>
                      NT$ {(item.price * item.quantity)
                        .toLocaleString('zh-TW')}
                    </strong>
                    <button
                      type="button"
                      className="order-item-remove"
                      aria-label={`移除 ${item.name}`}
                      title="移除品項"
                      disabled={submitting}
                      onClick={() => onQuantityChange(item.cartId, 0)}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="order-item-bottom">
                  <div className="quantity-control">
                    <button
                      type="button"
                      aria-label={`減少 ${item.name} 數量`}
                      disabled={submitting}
                      onClick={() =>
                        onQuantityChange(
                          item.cartId,
                          item.quantity - 1
                        )
                      }
                    >
                      −
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      type="button"
                      aria-label={`增加 ${item.name} 數量`}
                      disabled={submitting}
                      onClick={() =>
                        onQuantityChange(
                          item.cartId,
                          item.quantity + 1
                        )
                      }
                    >
                      +
                    </button>
                  </div>

                  <span className="order-unit-price">
                    NT$ {item.price.toLocaleString('zh-TW')} / 份
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="order-footer" aria-busy={submitting}>
        {error && <p role="alert" className="order-error">{error}</p>}
        <div className="order-subtotal">
          <span>小計</span>
          <span>NT$ {subtotal.toLocaleString('zh-TW')}</span>
        </div>

        {discountAmount > 0 && (
          <div className="order-subtotal order-discount">
            <span>餐點搭飲品優惠（{pairCount} 組）</span>
            <span>− NT$ {discountAmount.toLocaleString('zh-TW')}</span>
          </div>
        )}

        <div className="order-total">
          <span>合計</span>
          <strong>
            NT$ {total.toLocaleString('zh-TW')}
          </strong>
        </div>

        <button
          type="button"
          className="checkout-button"
          disabled={items.length === 0 || submitting}
          onClick={onCheckout}
        >
          {submitting ? '訂單送出中…' : '確認送出訂單 (' + totalQuantity + ')'}
        </button>

        {items.length > 0 && (
          <button
            type="button"
            className="clear-order-button"
            onClick={onClear}
            disabled={submitting}
          >
            清空訂單
          </button>
        )}
      </div>
    </aside>
  );

  if (!isMobile) return orderContent;

  return (
    <>
      <div className="mobile-order-bar">
        <div className="mobile-order-summary" aria-live="polite" aria-atomic="true">
          <span className="mobile-order-label">目前訂單 · {totalQuantity} 件</span>
          <strong>NT$ {total.toLocaleString('zh-TW')}</strong>
        </div>
        <button
          type="button"
          className="mobile-order-open"
          aria-haspopup="dialog"
          aria-expanded={mobileOpen}
          aria-controls="mobile-order-dialog"
          onClick={() => setMobileOpen(true)}
        >
          查看訂單 <span aria-hidden="true">⌃</span>
        </button>
      </div>
      <dialog
        ref={dialogRef}
        id="mobile-order-dialog"
        className="mobile-order-dialog"
        aria-labelledby="order-summary-title"
        onClose={() => setMobileOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMobileOpen(false);
        }}
      >
        {orderContent}
      </dialog>
    </>
  );
}

export default OrderSidebar;
