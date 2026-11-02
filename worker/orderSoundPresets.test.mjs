import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ORDER_SOUNDS, isSoundDuration, playOrderChime } from '../src/utils/orderSoundPresets.ts';

function audioRecorder() {
  const nodes = [];
  const context = {
    state: 'running', currentTime: 10, destination: {},
    createOscillator() {
      const node = {
        frequency: { value: 0 }, cancelled: false,
        connect() {}, disconnect() {},
        start(time) { this.startAt = time; },
        stop(time) {
          if (time === undefined) { this.cancelled = true; this.onended?.(); }
          else this.stopAt = time;
        },
      };
      nodes.push(node);
      return node;
    },
    createGain() {
      return {
        gain: {
          setValueAtTime() {}, linearRampToValueAtTime() {},
          exponentialRampToValueAtTime(value, time) { assert.ok(Number.isFinite(time)); },
        },
        connect() {}, disconnect() {},
      };
    },
  };
  return { context, nodes };
}

test('all sounds span the chosen duration at minimum, default and maximum values', () => {
  for (const { id } of ORDER_SOUNDS) {
    for (const seconds of [1, 2, 5, 12, 30]) {
      const { context, nodes } = audioRecorder();
      const cancel = playOrderChime(context, id, seconds);
      assert.ok(nodes.length > 0);
      assert.ok(Math.abs(Math.max(...nodes.map((n) => n.stopAt)) - 10 - seconds) < 1e-9,
        id + ' should finish after ' + seconds + ' seconds');
      assert.equal(Math.min(...nodes.map((n) => n.startAt)), 10);
      for (const node of nodes) {
        assert.ok(Number.isFinite(node.startAt) && Number.isFinite(node.stopAt));
        assert.ok(node.stopAt > node.startAt);
        assert.ok(node.startAt >= 10 && node.stopAt <= 10 + seconds + 1e-9);
      }
      cancel();
      assert.ok(nodes.every((n) => n.cancelled));
    }
  }
});

test('unsupported duration values reject before creating audio nodes', () => {
  for (const seconds of [0, -1, 31, 2.5, NaN, Infinity, '5', null]) {
    const { context, nodes } = audioRecorder();
    assert.equal(isSoundDuration(seconds), false);
    assert.throws(() => playOrderChime(context, 'soft', seconds), RangeError);
    assert.equal(nodes.length, 0);
  }
});

test('omitting duration uses five seconds and suspended audio is rejected', () => {
  const { context, nodes } = audioRecorder();
  playOrderChime(context, 'soft');
  assert.ok(Math.abs(Math.max(...nodes.map((n) => n.stopAt)) - 15) < 1e-9);
  context.state = 'suspended';
  assert.throws(() => playOrderChime(context, 'bell', 5), /Audio unavailable/);
});
