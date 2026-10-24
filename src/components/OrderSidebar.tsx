
import './OrderSidebar.css';
import type { SelectedOption } from './ProductCustomizationModal';

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
};

function OrderSidebar({
  items,
  diningMode,
  tableId,
  onQuantityChange,
  onClear,
  onCheckout,
}: OrderSidebarProps) {
  const totalQuantity = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <aside className="order-sidebar">
      {/* Header */}
      <div className="order-header">
        <div>
          <h2>訂單明細</h2>
          <span>Order Summary</span>
        </div>

        <span className="order-count">
          {totalQuantity} 項
        </span>
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
            <small>請從左側菜單選擇商品</small>
          </div>
        ) : (
          <div className="order-items">
            {items.map((item) => (
              <div className="order-item" key={item.cartId}>
                <div className="order-item-top">
                  <div className="order-item-info">
                    <h3>{item.name}</h3>
                    <small>{item.productCode}</small>
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
      <div className="order-footer">
        <div className="order-subtotal">
          <span>小計</span>
          <span>NT$ {subtotal.toLocaleString('zh-TW')}</span>
        </div>

        <div className="order-total">
          <span>合計</span>
          <strong>
            NT$ {subtotal.toLocaleString('zh-TW')}
          </strong>
        </div>

        <button
          type="button"
          className="checkout-button"
          disabled={items.length === 0}
          onClick={onCheckout}
        >
          確認訂單 ({totalQuantity})
        </button>

        {items.length > 0 && (
          <button
            type="button"
            className="clear-order-button"
            onClick={onClear}
          >
            清空訂單
          </button>
        )}
      </div>
    </aside>
  );
}

export default OrderSidebar;
