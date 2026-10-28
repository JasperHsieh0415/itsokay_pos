type DiscountItem = { productCode: string; quantity: number };

export function calculateMealDrinkDiscount(items: DiscountItem[]) {
  let meals = 0;
  let drinks = 0;
  for (const item of items) {
    if (!/^M\d{3}$/.test(item.productCode)) continue;
    const code = Number(item.productCode.slice(1));
    if (code >= 1 && code <= 14) meals += item.quantity;
    if (code >= 35 && code <= 53) drinks += item.quantity;
  }
  const pairCount = Math.min(meals, drinks);
  return { pairCount, discountAmount: pairCount * 30 };
}
