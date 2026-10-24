import './DiningModeSelection.css';
type DiningMode = 'dinein' | 'takeout';

type Props = {
  onSelect: (mode: DiningMode) => void;
};

export default function DiningModeSelection({
  onSelect,
}: Props) {
  return (
    <div className="entry-page">
      <div className="entry-card">
        <div className="entry-brand">
          <h1>It's okay</h1>
          <h2>沒事咖啡</h2>
        </div>

        <h3>請選擇用餐方式</h3>
        <p>Please select your dining option</p>

        <div className="dining-options">
          <button
            type="button"
            onClick={() => onSelect('dinein')}
          >
            <span className="dining-option-icon">☕</span>
            <strong>內用</strong>
            <small>Dine in</small>
          </button>

          <button
            type="button"
            onClick={() => onSelect('takeout')}
          >
            <span className="dining-option-icon">🛍️</span>
            <strong>外帶</strong>
            <small>Take out</small>
          </button>
        </div>
      </div>
    </div>
  );
}
