import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateMealDrinkDiscount } from '../src/data/orderDiscount.ts';

const item = (productCode, quantity = 1) => ({ productCode, quantity });

test('each eligible meal and drink code pairs at both inclusive range boundaries', () => {
  for (let meal = 1; meal <= 14; meal++) {
    for (let drink = 35; drink <= 53; drink++) {
      assert.deepEqual(calculateMealDrinkDiscount([
        item(`M${String(meal).padStart(3, '0')}`),
        item(`M${String(drink).padStart(3, '0')}`),
      ]), { pairCount: 1, discountAmount: 30 });
    }
  }
});

test('quantity limits pairs, including separate customization lines and item removal', () => {
  const cases = [
    [[], 0],
    [[item('M001', 3)], 0],
    [[item('M035', 3)], 0],
    [[item('M001', 2), item('M035', 3)], 60],
    [[item('M014', 3), item('M053', 1)], 30],
    [[item('M005', 1), item('M005', 2), item('M036', 2), item('M036', 2)], 90],
    [[item('M005', 0), item('M036', 2)], 0],
    [[item('M000'), item('M015'), item('M034'), item('M054')], 0],
    [[item('M015'), item('M035')], 0],
    [[item('M001'), item('M034'), item('M054')], 0],
    [[item('M01'), item('M0035'), item('M001x'), item('m035')], 0],
  ];
  for (const [items, discountAmount] of cases) {
    assert.equal(calculateMealDrinkDiscount(items).discountAmount, discountAmount, JSON.stringify(items));
  }
});
