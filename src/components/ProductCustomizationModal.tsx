
import { useEffect, useState } from 'react';
import type {
  ProductOptionGroup,
  ProductOption,
} from '../data/productOptions';
import './ProductCustomizationModal.css';

export type SelectedOption = {
  groupId: string;
  optionId: string;
  name: string;
  priceDelta: number;
};

type ModalProduct = {
  product_code: string;
  name: string;
  price: number;
};

type Props = {
  product: ModalProduct;
  groups: ProductOptionGroup[];
  onClose: () => void;
  onConfirm: (
    selectedOptions: SelectedOption[],
    unitPrice: number,
    quantity: number
  ) => void;
};

function ProductCustomizationModal({
  product,
  groups,
  onClose,
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<
    Record<string, string[]>
  >({});
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleSelect = (
    group: ProductOptionGroup,
    option: ProductOption
  ) => {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];

      if (group.selectionType === 'single') {
        return {
          ...prev,
          [group.id]: [option.id],
        };
      }

      const exists = current.includes(option.id);

      if (exists) {
        return {
          ...prev,
          [group.id]: current.filter(
            (id) => id !== option.id
          ),
        };
      }

      if (
        group.maxSelect !== undefined &&
        current.length >= group.maxSelect
      ) {
        return prev;
      }

      return {
        ...prev,
        [group.id]: [...current, option.id],
      };
    });
  };

  const selectedOptions: SelectedOption[] =
    groups.flatMap((group) => {
      const selectedIds = selected[group.id] ?? [];

      return group.options
        .filter((option) => selectedIds.includes(option.id))
        .map((option) => ({
          groupId: group.id,
          optionId: option.id,
          name: option.name,
          priceDelta: option.priceDelta,
        }));
    });

  const unitPrice =
    product.price +
    selectedOptions.reduce(
      (sum, option) => sum + option.priceDelta,
      0
    );

  const isValid = groups.every((group) => {
    const count = (selected[group.id] ?? []).length;

    if (group.required && count === 0) return false;

    if (
      group.maxSelect !== undefined &&
      count > group.maxSelect
    ) {
      return false;
    }

    return true;
  });

  return (
    <div
      className="custom-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="custom-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-modal-title"
      >
        <div className="custom-modal-header">
          <div>
            <h2 id="custom-modal-title">{product.name}</h2>
            <span>{groups.length > 0 ? '客製化餐點' : '選擇數量'}</span>
          </div>
          <button
            type="button"
            className="custom-modal-close"
            aria-label="關閉"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="custom-modal-body">
          <div className="custom-quantity-row">
            <h3 id="custom-quantity-label">數量</h3>
            <div
              className="custom-quantity-control"
              role="group"
              aria-labelledby="custom-quantity-label"
            >
              <button
                type="button"
                aria-label="減少數量"
                disabled={quantity <= 1}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              >
                −
              </button>
              <output aria-live="polite">{quantity}</output>
              <button
                type="button"
                aria-label="增加數量"
                onClick={() => setQuantity((current) => current + 1)}
              >
                ＋
              </button>
            </div>
          </div>
          {groups.map((group) => (
            <section
              className="custom-option-group"
              key={group.id}
            >
              <div className="custom-group-heading">
                <h3>{group.name}</h3>
                <span>
                  {group.required ? '必選' : '選填'}
                  {' · '}
                  {group.selectionType === 'single'
                    ? '單選'
                    : `最多 ${group.maxSelect ?? group.options.length} 項`}
                </span>
              </div>

              {group.options.map((option) => {
                const checked = (
                  selected[group.id] ?? []
                ).includes(option.id);

                return (
                  <label
                    className={`custom-option ${
                      checked ? 'selected' : ''
                    }`}
                    key={option.id}
                  >
                    <input
                      type={
                        group.selectionType === 'single'
                          ? 'radio'
                          : 'checkbox'
                      }
                      name={group.id}
                      checked={checked}
                      onChange={() =>
                        handleSelect(group, option)
                      }
                    />

                    <span>{option.name}</span>

                    <strong>
                      {option.priceDelta === 0
                        ? '免費'
                        : `+ NT$ ${option.priceDelta}`}
                    </strong>
                  </label>
                );
              })}
            </section>
          ))}
        </div>

        <div className="custom-modal-footer">
          <div className="custom-modal-total">
            <span>合計金額</span>
            <strong>
              NT$ {(unitPrice * quantity).toLocaleString('zh-TW')}
            </strong>
          </div>

          <button
            type="button"
            disabled={!isValid}
            onClick={() =>
              onConfirm(selectedOptions, unitPrice, quantity)
            }
          >
            加入訂單
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCustomizationModal;
