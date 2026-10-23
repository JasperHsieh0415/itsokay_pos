
export type ProductOption = {
  id: string;
  name: string;
  priceDelta: number;
};

export type ProductOptionGroup = {
  id: string;
  name: string;
  selectionType: 'single' | 'multiple';
  required: boolean;
  maxSelect?: number;
  options: ProductOption[];
};

export const productOptions: Record<
  string,
  ProductOptionGroup[]
> = {
  // 竹炭漢堡套餐
  M007: [
    {
      id: 'burger-extra',
      name: '加購配料',
      selectionType: 'multiple',
      required: false,
      maxSelect: 3,
      options: [
        { id: 'cheese', name: '起司', priceDelta: 15 },
        { id: 'bacon', name: '培根', priceDelta: 15 },
        { id: 'pineapple', name: '鳳梨', priceDelta: 15 },
      ],
    },
  ],

  M008: [
    {
      id: 'burger-extra',
      name: '加購配料',
      selectionType: 'multiple',
      required: false,
      maxSelect: 3,
      options: [
        { id: 'cheese', name: '起司', priceDelta: 15 },
        { id: 'bacon', name: '培根', priceDelta: 15 },
        { id: 'pineapple', name: '鳳梨', priceDelta: 15 },
      ],
    },
  ],

  // 椰汁咖哩雞
  M009: [
    {
      id: 'starch',
      name: '主食選擇',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'rice', name: '薑黃飯', priceDelta: 0 },
        { id: 'bread', name: '麵包', priceDelta: 0 },
      ],
    },
  ],

  // M023 飲品種類尚待確認，因此暫不加入
};
