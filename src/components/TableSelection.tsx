
import { useState } from 'react';
import './TableSelection.css';

type TableShape = 'diamond' | 'square';

type DiningTable = {
  id: string;
  name: string;
  shape: TableShape;
  x: number;
  y: number;
};

const TABLES: DiningTable[] = [
  // 左側：三張菱形桌
  { id: 'T01', name: '左側第一桌', shape: 'diamond', x: 29, y: 19 },
  { id: 'T02', name: '左側第二桌', shape: 'diamond', x: 29, y: 49 },
  { id: 'T03', name: '左側第三桌', shape: 'diamond', x: 29, y: 79 },

  // 右側：五張方形桌
  { id: 'T04', name: '右側第一桌', shape: 'square', x: 72, y: 12 },
  { id: 'T05', name: '右側第二桌', shape: 'square', x: 72, y: 30 },
  { id: 'T06', name: '右側第三桌', shape: 'square', x: 72, y: 48 },
  { id: 'T07', name: '右側第四桌', shape: 'square', x: 72, y: 66 },
  { id: 'T08', name: '右側第五桌', shape: 'square', x: 72, y: 84 },
];

type Props = {
  initialTableId?: string | null;
  onConfirm: (tableId: string) => void;
  onBack: () => void;
};

type TableIllustrationProps = {
  table: DiningTable;
  selected: boolean;
};

function TableIllustration({
  table,
  selected,
}: TableIllustrationProps) {
  const isDiamond = table.shape === 'diamond';

  return (
    <span className="cafe-table-illustration" aria-hidden="true">
      <svg
        viewBox="0 0 120 120"
        preserveAspectRatio={isDiamond ? 'xMidYMid meet' : 'none'}
        className="cafe-table-svg"
        aria-hidden="true"
        focusable="false"
      >
        {/* 桌面下方陰影 */}
        {isDiamond ? (
          <path
            className="cafe-table-shadow"
            d="M60 24 L100 64 L60 104 L20 64 Z"
          />
        ) : (
          <rect
            className="cafe-table-shadow"
            x="22"
            y="25"
            width="80"
            height="80"
            rx="8"
          />
        )}

        {/* 奶茶色座椅 */}
        <g className="cafe-chair">
          {isDiamond && <rect x="40" y="4" width="40" height="20" rx="9" />}
          {isDiamond && <rect x="40" y="96" width="40" height="20" rx="9" />}

          <rect x="4" y="40" width="20" height="40" rx="9" />
          <rect x="96" y="40" width="20" height="40" rx="9" />
        </g>

        {/* 椅背與座墊細節 */}
        <g className="cafe-chair-detail">
          {isDiamond && <path d="M45 11 H75" />}
          {isDiamond && <path d="M45 109 H75" />}
          <path d="M11 45 V75" />
          <path d="M109 45 V75" />
        </g>

        {/* 桌面 */}
        {isDiamond ? (
          <path
            className="cafe-table-top"
            d="M60 19 L101 60 L60 101 L19 60 Z"
          />
        ) : (
          <rect
            className="cafe-table-top"
            x="19"
            y="19"
            width="82"
            height="82"
            rx="7"
          />
        )}

        {/* 模擬淺色木紋：保持線條簡潔 */}
        <g className="cafe-wood-detail">
          {isDiamond ? (
            <>
              <path d="M39 40 L80 81" />
              <path d="M31 50 L69 88" />
              <path d="M50 31 L88 69" />
            </>
          ) : (
            <>
              <path d="M28 38 H92" />
              <path d="M28 73 H92" />
              <path d="M38 26 V93" />
            </>
          )}
        </g>

        {/* 已選取標記 */}
        {selected && (
          <g className="cafe-table-check">
            <circle cx="99" cy="20" r="15" />
            <path d="M92 20 L97 25 L106 15" />
          </g>
        )}
      </svg>
      <span className="cafe-table-label">{table.id}</span>
    </span>
  );
}

export default function TableSelection({
  initialTableId = null,
  onConfirm,
  onBack,
}: Props) {
  const [selectedTableId, setSelectedTableId] =
    useState<string | null>(
      TABLES.some((table) => table.id === initialTableId)
        ? initialTableId
        : null
    );

  const selectedTable =
    TABLES.find((table) => table.id === selectedTableId) ?? null;

  return (
    <div className="cafe-seat-page">
      <div className="cafe-seat-container">
        {/* Header */}
        <header className="cafe-seat-header">
          <button
            type="button"
            className="cafe-back-button"
            onClick={onBack}
          >
            <span aria-hidden="true">←</span>
            返回
          </button>

          <div className="cafe-seat-brand">
            <strong>It's okay</strong>
            <span>沒事咖啡</span>
          </div>

          <span className="cafe-dining-tag">
            DINE IN
          </span>
        </header>

        {/* Title */}
        <div className="cafe-seat-intro">
          <span className="cafe-eyebrow">
            WELCOME TO IT'S OKAY
          </span>

          <h1>找到你的專屬座位</h1>

          <p>
            請依照店內實際位置，輕點你目前入座的桌子。
          </p>
        </div>

        <div className="cafe-seat-layout">
          {/* Floor plan */}
          <section
            className="cafe-floor-card"
            aria-label="餐廳桌位平面圖"
          >
            <div className="cafe-floor-toolbar">
              <div>
                <span className="cafe-eyebrow">
                  OUR SPACE
                </span>
                <h2>店內座位配置</h2>
              </div>

              <span className="cafe-table-count">
                08 TABLES
              </span>
            </div>

            <div className="cafe-floor-plan">
              {/* 中央通道 */}
              <div
                className="cafe-floor-aisle"
                aria-hidden="true"
              />

              <span className="cafe-zone-label cafe-zone-left">
                LEFT
              </span>

              <span className="cafe-zone-label cafe-zone-right">
                RIGHT
              </span>

              {/* 可點擊桌子 */}
              {TABLES.map((table) => {
                const selected =
                  selectedTableId === table.id;

                return (
                  <button
                    type="button"
                    key={table.id}
                    className={[
                      'cafe-table-button',
                      `cafe-table-${table.shape}`,
                      selected ? 'is-selected' : '',
                    ].join(' ')}
                    style={{
                      left: `${table.x}%`,
                      top: `${table.y}%`,
                    }}
                    onClick={() =>
                      setSelectedTableId(table.id)
                    }
                    aria-label={`${table.id} ${table.name}`}
                    aria-pressed={selected}
                  >
                    <TableIllustration
                      table={table}
                      selected={selected}
                    />
                  </button>
                );
              })}
              <div className="cafe-front-door">
                <svg
                  viewBox="0 0 24 24"
                  width="26"
                  height="26"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M3 21 H21 M6 21 V3 H18 V21" />
                  <path d="M6 3 L15 6 V21" />
                  <path d="M12 13 H12.01" />
                </svg>
                <span>前門 (front door)</span>
              </div>
            </div>

            <div className="cafe-floor-legend">
              <span>
                <i className="cafe-legend-dot" />
                已選取的桌位
              </span>

              <span>共 {TABLES.length} 張桌子</span>
            </div>
          </section>

          {/* Confirmation panel */}
          <aside className="cafe-selection-panel">
            <div className="cafe-panel-heading">
              <span className="cafe-eyebrow">
                YOUR TABLE
              </span>
              <h2>確認桌位</h2>
              <p>選擇完成後，即可開始點餐。</p>
            </div>

            <div
              className={[
                'cafe-selection-card',
                selectedTable ? 'has-selection' : '',
              ].join(' ')}
              aria-live="polite"
            >
              {selectedTable ? (
                <>
                  <span className="cafe-selected-label">
                    SELECTED TABLE
                  </span>

                  <strong className="cafe-selected-number">
                    {selectedTable.id}
                  </strong>

                  <span className="cafe-selected-name">
                    {selectedTable.name}
                  </span>

                  <span className="cafe-selected-check">
                    ✓ 已選取
                  </span>
                </>
              ) : (
                <>
                  <span className="cafe-selected-label">
                    YOUR SEAT
                  </span>

                  <span className="cafe-empty-icon">
                    ◇
                  </span>

                  <strong className="cafe-empty-title">
                    尚未選擇桌位
                  </strong>

                  <span className="cafe-empty-description">
                    點擊左側平面圖中的桌子
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              className="cafe-confirm-button"
              disabled={!selectedTableId}
              onClick={() => {
                if (selectedTableId) {
                  onConfirm(selectedTableId);
                }
              }}
            >
              <span>確認桌位，開始點餐</span>
              <span aria-hidden="true">→</span>
            </button>

            <div className="cafe-selection-notice">
              <span aria-hidden="true">ⓘ</span>
              <p>
                請確認所選位置與實際座位相符，
                方便店員將餐點送到你的桌上。
              </p>
            </div>
          </aside>
        </div>

        <footer className="cafe-seat-footer">
          IT'S OKAY TO TAKE YOUR TIME.
        </footer>
      </div>
    </div>
  );
}
