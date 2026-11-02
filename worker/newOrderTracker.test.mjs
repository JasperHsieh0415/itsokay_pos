import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NewOrderTracker } from '../src/utils/newOrderTracker.ts';

test('first successful snapshot is silent, including an empty snapshot', () => {
  const tracker = new NewOrderTracker();
  assert.equal(tracker.observe(['old']), false);
  assert.equal(tracker.observe(['old']), false);
  tracker.reset();
  assert.equal(tracker.observe([]), false);
  assert.equal(tracker.observe(['new']), true);
});

test('new orders notify once per snapshot, regardless of chef item duplication', () => {
  const tracker = new NewOrderTracker();
  tracker.observe(['old', 'old']);
  assert.equal(tracker.observe(['old', 'new', 'new', 'another']), true);
  assert.equal(tracker.observe(['another', 'new', 'old', 'new']), false);
});

test('same-count replacements notify; updates, removals and reappearances do not', () => {
  const tracker = new NewOrderTracker();
  tracker.observe(['a', 'b']);
  assert.equal(tracker.observe(['a', 'c']), true);
  assert.equal(tracker.observe(['c']), false);
  assert.equal(tracker.observe(['b', 'c', 'a']), false);
  assert.equal(tracker.observe([]), false);
  assert.equal(tracker.observe(['c']), false);
});

test('already completed orders are recorded silently and never replayed', () => {
  const tracker = new NewOrderTracker();
  tracker.observe(['old']);
  assert.equal(tracker.observe(['old', 'completed'], ['old']), false);
  assert.equal(tracker.observe(['completed'], ['completed']), false);
  assert.equal(tracker.observe(['completed', 'new'], ['new']), true);
});

test('recording while muted prevents replay when sound is enabled', () => {
  const tracker = new NewOrderTracker();
  tracker.observe([]);
  // The hook observes every successful snapshot even while muted.
  tracker.observe(['muted-order']);
  assert.equal(tracker.observe(['muted-order']), false);
  assert.equal(tracker.observe(['muted-order', 'new']), true);
});

test('failed fetches leave the baseline intact and recovery detects new IDs', () => {
  const tracker = new NewOrderTracker();
  tracker.observe(['old']);
  // Fetch failures do not call observe.
  assert.equal(tracker.observe(['old', 'during-outage']), true);
  assert.equal(tracker.observe(['old', 'during-outage']), false);
});

test('a new login resets the baseline and permits fresh notifications', () => {
  const tracker = new NewOrderTracker();
  tracker.observe(['old']);
  tracker.observe(['old', 'new']);
  tracker.reset();
  assert.equal(tracker.observe(['new']), false);
  assert.equal(tracker.observe(['new', 'old']), true);
});
