import { productOptions } from '../src/data/productOptions.ts';

export type OrderOption = {
  group_id: string;
  option_id: string;
  option_name: string;
  price_delta: number;
};

export function resolveOrderOptions(productCode: string, value: unknown): OrderOption[] {
  const groups = productOptions[productCode] ?? [];
  const selections = value === undefined ? [] : value;
  if (!Array.isArray(selections)) throw new Error('客製化選項格式錯誤');

  const resolved: OrderOption[] = [];
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  for (const selection of selections) {
    if (!selection || typeof selection !== 'object' || Array.isArray(selection) ||
        Object.keys(selection).some((key) => key !== 'group_id' && key !== 'option_id') ||
        typeof selection.group_id !== 'string' || typeof selection.option_id !== 'string') {
      throw new Error('客製化選項格式錯誤');
    }
    const group = groups.find((candidate) => candidate.id === selection.group_id);
    const option = group?.options.find((candidate) => candidate.id === selection.option_id);
    if (!group || !option) throw new Error('此商品不支援所選客製化選項');
    const key = JSON.stringify([group.id, option.id]);
    if (seen.has(key)) throw new Error('客製化選項不可重複');
    seen.add(key);
    counts.set(group.id, (counts.get(group.id) ?? 0) + 1);
    resolved.push({ group_id: group.id, option_id: option.id, option_name: option.name, price_delta: option.priceDelta });
  }
  for (const group of groups) {
    const count = counts.get(group.id) ?? 0;
    if (group.required && count === 0) throw new Error(`請選擇${group.name}`);
    const max = group.selectionType === 'single' ? 1 : group.maxSelect ?? group.options.length;
    if (count > max) throw new Error(`${group.name}最多可選 ${max} 項`);
  }
  return resolved;
}
