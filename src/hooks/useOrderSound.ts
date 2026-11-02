import { useCallback, useEffect, useRef, useState } from 'react';
import { NewOrderTracker } from '../utils/newOrderTracker';
import { DEFAULT_SOUND_SECONDS, isOrderSoundId, isSoundDuration, playOrderChime } from '../utils/orderSoundPresets';
import type { OrderSoundId } from '../utils/orderSoundPresets';

export default function useOrderSound(scope: 'admin' | 'chef') {
  const storageKey = `order-sound:${scope}`;
  const [selectedSound, setSelectedSound] = useState<OrderSoundId>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return isOrderSoundId(saved) ? saved : 'soft';
    } catch {
      return 'soft';
    }
  });
  const durationStorageKey = `order-sound-duration:${scope}`;
  const [durationSeconds, setDurationSeconds] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(durationStorageKey));
      return isSoundDuration(saved) ? saved : DEFAULT_SOUND_SECONDS;
    } catch {
      return DEFAULT_SOUND_SECONDS;
    }
  });
  const duration = useRef(durationSeconds);
  const selected = useRef(selectedSound);
  const tracker = useRef(new NewOrderTracker());
  const audio = useRef<AudioContext | null>(null);
  const stopChime = useRef<(() => void) | null>(null);
  const enabled = useRef(false);
  const attempt = useRef(0);
  const [status, setStatus] = useState<'off' | 'enabling' | 'on'>('off');
  const [hasBaseline, setHasBaseline] = useState(false);
  const [error, setError] = useState('');

  const closeAudio = useCallback(() => {
    stopChime.current?.();
    stopChime.current = null;
    const context = audio.current;
    audio.current = null;
    if (context) {
      context.onstatechange = null;
      void context.close().catch(() => {});
    }
  }, []);

  const dispose = useCallback(() => {
    attempt.current++;
    enabled.current = false;
    closeAudio();
  }, [closeAudio]);

  const disable = useCallback(() => {
    dispose();
    setStatus('off');
    setError('');
  }, [dispose]);

  const reset = useCallback(() => {
    tracker.current.reset();
    setHasBaseline(false);
    disable();
  }, [disable]);

  useEffect(() => dispose, [dispose]);

  const playSelected = useCallback((context: AudioContext) => {
    stopChime.current?.();
    stopChime.current = playOrderChime(context, selected.current, duration.current);
  }, []);

  const test = useCallback(() => {
    try {
      if (!audio.current) throw new Error('Audio unavailable');
      playSelected(audio.current);
    } catch {
      enabled.current = false;
      setStatus('off');
      setError('無法播放音效，請重新啟用音效，並檢查裝置音量。');
      closeAudio();
    }
  }, [closeAudio, playSelected]);

  const unlockAudio = useCallback(async (enableNotifications: boolean) => {
    const currentAttempt = ++attempt.current;
    enabled.current = false;
    closeAudio();
    setStatus('enabling');
    setError('');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      // Both selecting a preview and enabling notifications are user gestures.
      const context = new AudioContext();
      audio.current = context;
      await Promise.race([
        context.resume(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Audio blocked')), 3000);
        }),
      ]);
      if (attempt.current !== currentAttempt) return;
      playSelected(context);
      enabled.current = enableNotifications;
      setStatus(enableNotifications ? 'on' : 'off');
      context.onstatechange = () => {
        if (audio.current === context && context.state !== 'running' && enabled.current) {
          enabled.current = false;
          setStatus('off');
          setError('音效已暫停，請點選「啟用音效」重新啟用。');
        }
      };
    } catch {
      if (attempt.current !== currentAttempt) return;
      closeAudio();
      setStatus('off');
      setError('無法播放音效，請再次點選音效按鈕，並檢查瀏覽器音效設定。');
    } finally {
      clearTimeout(timeout);
    }
  }, [closeAudio, playSelected]);

  const enable = useCallback(() => unlockAudio(true), [unlockAudio]);

  const selectSound = useCallback((soundId: OrderSoundId) => {
    selected.current = soundId;
    setSelectedSound(soundId);
    try {
      localStorage.setItem(storageKey, soundId);
    } catch {
      // Selection still works for this page when browser storage is unavailable.
    }
    if (audio.current?.state === 'running') {
      setError('');
      test();
    } else {
      void unlockAudio(enabled.current);
    }
  }, [storageKey, test, unlockAudio]);

  const changeDuration = useCallback((seconds: number) => {
    if (!isSoundDuration(seconds)) return;
    stopChime.current?.();
    stopChime.current = null;
    duration.current = seconds;
    setDurationSeconds(seconds);
    try {
      localStorage.setItem(durationStorageKey, String(seconds));
    } catch {
      // Apply for this page even when browser storage is unavailable.
    }
  }, [durationStorageKey]);

  const observeOrders = useCallback((ids: string[], eligibleIds: string[] = ids) => {
    const hasNewOrder = tracker.current.observe(ids, eligibleIds);
    setHasBaseline(true);
    // Reading the selection from a ref keeps polling and its baseline stable.
    if (hasNewOrder && enabled.current) test();
  }, [test]);

  return { status, hasBaseline, error, selectedSound, selectSound, durationSeconds, changeDuration,
    enable, disable, test, reset, observeOrders };
}
