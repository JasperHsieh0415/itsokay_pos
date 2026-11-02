export const ORDER_SOUNDS = [
  { id: 'soft', label: '柔和雙音', description: '柔和的叮、叮聲' },
  { id: 'doorbell', label: '門鈴', description: '清楚的叮咚聲' },
  { id: 'electronic', label: '電子提示', description: '短促的嗶嗶聲' },
  { id: 'melody', label: '三音旋律', description: '音高逐步上升' },
  { id: 'bell', label: '鈴鐺風格', description: '清脆並帶有尾音' },
] as const;

export type OrderSoundId = typeof ORDER_SOUNDS[number]['id'];

export function isOrderSoundId(value: unknown): value is OrderSoundId {
  return ORDER_SOUNDS.some((sound) => sound.id === value);
}

type Tone = {
  offset: number;
  frequency: number;
  duration: number;
  volume: number;
  waveform?: OscillatorType;
};

export const DEFAULT_SOUND_SECONDS = 5;
export const MIN_SOUND_SECONDS = 1;
export const MAX_SOUND_SECONDS = 30;

export function isSoundDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
    && value >= MIN_SOUND_SECONDS && value <= MAX_SOUND_SECONDS;
}

// Schedule whole phrases across the requested duration; shorten or stretch a
// single phrase when needed, keeping oscillator pitch unchanged.
export function repeatForSeconds(
  tones: readonly Tone[], seconds: number, phraseInterval: number,
): Tone[] {
  if (!isSoundDuration(seconds)) throw new RangeError('Invalid sound duration');
  const phraseDuration = Math.max(...tones.map((tone) => tone.offset + tone.duration)) + 0.01;
  const repetitions = Math.max(
    seconds >= phraseDuration * 2 ? 2 : 1,
    Math.floor(seconds / phraseInterval),
  );
  if (repetitions === 1) {
    const scale = (seconds - 0.01) / (phraseDuration - 0.01);
    return tones.map((tone) => ({
      ...tone, offset: tone.offset * scale, duration: tone.duration * scale,
    }));
  }
  const interval = (seconds - phraseDuration) / (repetitions - 1);
  return Array.from({ length: repetitions }, (_, index) =>
    tones.map((tone) => ({ ...tone, offset: tone.offset + index * interval }))
  ).flat();
}

const PHRASE_INTERVALS: Record<OrderSoundId, number> = {
  soft: 0.6, doorbell: 1.5, electronic: 0.6, melody: 0.9, bell: 1.5,
};

const TONES: Record<OrderSoundId, readonly Tone[]> = {
  soft: [
    { offset: 0, frequency: 880, duration: 0.2, volume: 0.2 },
    { offset: 0.22, frequency: 1174.66, duration: 0.2, volume: 0.2 },
  ],
  doorbell: [
    { offset: 0, frequency: 659.25, duration: 0.55, volume: 0.2 },
    { offset: 0.45, frequency: 523.25, duration: 0.8, volume: 0.2 },
  ],
  electronic: [
    { offset: 0, frequency: 1046.5, duration: 0.09, volume: 0.07, waveform: 'square' },
    { offset: 0.18, frequency: 1046.5, duration: 0.09, volume: 0.07, waveform: 'square' },
  ],
  melody: [
    { offset: 0, frequency: 523.25, duration: 0.18, volume: 0.22, waveform: 'triangle' },
    { offset: 0.18, frequency: 659.25, duration: 0.18, volume: 0.22, waveform: 'triangle' },
    { offset: 0.36, frequency: 783.99, duration: 0.3, volume: 0.22, waveform: 'triangle' },
  ],
  // Quiet inharmonic overtones give the bell a metallic attack and fading tail.
  bell: [
    { offset: 0, frequency: 1046.5, duration: 1.2, volume: 0.16 },
    { offset: 0, frequency: 2888.34, duration: 0.7, volume: 0.045 },
    { offset: 0, frequency: 5651.1, duration: 0.35, volume: 0.015 },
  ],
};

export function playOrderChime(
  context: AudioContext, soundId: OrderSoundId, seconds = DEFAULT_SOUND_SECONDS,
): () => void {
  if (context.state !== 'running') throw new Error('Audio unavailable');
  const start = context.currentTime;
  const active = new Set<OscillatorNode>();
  for (const tone of repeatForSeconds(TONES[soundId], seconds, PHRASE_INTERVALS[soundId])) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = tone.waveform ?? 'sine';
    oscillator.frequency.value = tone.frequency;
    gain.gain.setValueAtTime(0, start + tone.offset);
    gain.gain.linearRampToValueAtTime(tone.volume, start + tone.offset + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + tone.offset + tone.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    active.add(oscillator);
    oscillator.onended = () => {
      active.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start + tone.offset);
    oscillator.stop(start + tone.offset + tone.duration + 0.01);
  }
  // Stop previous previews before playing the next selection.
  return () => {
    for (const oscillator of active) oscillator.stop();
  };
}
