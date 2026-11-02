import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type useOrderSound from '../hooks/useOrderSound';
import { MAX_SOUND_SECONDS, MIN_SOUND_SECONDS, ORDER_SOUNDS } from '../utils/orderSoundPresets';
import './OrderSoundControls.css';

type Props = { sound: ReturnType<typeof useOrderSound> };

export default function OrderSoundControls({ sound }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogId = useId();
  const [durationInput, setDurationInput] = useState(String(sound.durationSeconds));
  const isOn = sound.status === 'on';
  const isBusy = sound.status === 'enabling';
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-controls={dialogId}
        onClick={() => {
          setDurationInput(String(sound.durationSeconds));
          dialogRef.current?.showModal();
        }}
      >
        音效管理
      </button>
      {createPortal(
        <dialog
          ref={dialogRef}
          id={dialogId}
          className="order-sound"
          aria-labelledby={`${dialogId}-title`}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right
              || event.clientY < bounds.top || event.clientY > bounds.bottom) {
              event.currentTarget.close();
            }
          }}
        >
          <div className="order-sound-dialog-header">
            <h2 id={`${dialogId}-title`}>音效管理</h2>
            <button type="button" onClick={() => dialogRef.current?.close()}>關閉</button>
          </div>
          <div className="order-sound-buttons">
            <button
              type="button"
              aria-pressed={isOn}
              disabled={!sound.hasBaseline || isBusy}
              onClick={() => { if (isOn) sound.disable(); else void sound.enable(); }}
            >
              {isBusy ? '音效準備中…' : isOn ? '靜音' : '啟用音效'}
            </button>
          </div>
          <form className="order-sound-duration" onSubmit={(event) => {
            event.preventDefault();
            if (!event.currentTarget.reportValidity()) return;
            sound.changeDuration(Number(durationInput));
          }}>
            <label htmlFor={`${dialogId}-seconds`}>播放秒數</label>
            <div className="order-sound-duration-controls">
              <input
                id={`${dialogId}-seconds`}
                type="number"
                min={MIN_SOUND_SECONDS}
                max={MAX_SOUND_SECONDS}
                step="1"
                required
                value={durationInput}
                disabled={isBusy}
                aria-describedby={`${dialogId}-seconds-help`}
                onChange={(event) => setDurationInput(event.target.value)}
              />
              <span>秒</span>
              <button type="submit" disabled={isBusy}>套用秒數</button>
            </div>
            <p id={`${dialogId}-seconds-help`} role="status">
              {MIN_SOUND_SECONDS}～{MAX_SOUND_SECONDS} 秒整數；目前已套用 {sound.durationSeconds} 秒，適用所有音效。
            </p>
          </form>
          <p className="order-sound-label">選擇音效（點選即可試聽並套用）</p>
          <div className="order-sound-options" role="group" aria-label="選擇新訂單音效">
            {ORDER_SOUNDS.map((option) => (
              <button
                key={option.id}
                type="button"
                data-sound-id={option.id}
                aria-pressed={sound.selectedSound === option.id}
                disabled={!sound.hasBaseline || isBusy}
                onClick={() => sound.selectSound(option.id)}
              >
                <span>{option.label}</span>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
          <p role="status">
            {!sound.hasBaseline
              ? '載入訂單後可選擇音效。'
              : isOn
                ? '音效已啟用，新訂單將播放選定音效；請保持此頁面開啟。'
                : '通知音效未啟用；可點選音效試聽，試聽後仍維持靜音。'}
          </p>
          {sound.error && <p className="order-sound-error" role="alert">{sound.error}</p>}
        </dialog>,
        document.body,
      )}
    </>
  );
}
