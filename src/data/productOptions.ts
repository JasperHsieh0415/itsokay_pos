
export type ProductOption = {
  id: string;
  name: string;
  englishName: string;
  priceDelta: number;
};

export type ProductOptionGroup = {
  id: string;
  name: string;
  englishName: string;
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
  M005: [
    {
      id: 'burger-extra',
      name: '加購配料', englishName: 'Extra toppings',
      selectionType: 'multiple',
      required: false,
      maxSelect: 3,
      options: [
        { id: 'cheese', name: '起司', englishName: 'Cheese', priceDelta: 15 },
        { id: 'bacon', name: '培根', englishName: 'Bacon', priceDelta: 15 },
        { id: 'pineapple', name: '鳳梨', englishName: 'Pineapple', priceDelta: 15 },
      ],
    },
  ],

  M006: [
    {
      id: 'burger-extra',
      name: '加購配料', englishName: 'Extra toppings',
      selectionType: 'multiple',
      required: false,
      maxSelect: 3,
      options: [
        { id: 'cheese', name: '起司', englishName: 'Cheese', priceDelta: 15 },
        { id: 'bacon', name: '培根', englishName: 'Bacon', priceDelta: 15 },
        { id: 'pineapple', name: '鳳梨', englishName: 'Pineapple', priceDelta: 15 },
      ],
    },
  ],

  M007: [
    {
      id: 'burger-extra',
      name: '加購配料', englishName: 'Extra toppings',
      selectionType: 'multiple',
      required: false,
      maxSelect: 3,
      options: [
        { id: 'cheese', name: '起司', englishName: 'Cheese', priceDelta: 15 },
        { id: 'bacon', name: '培根', englishName: 'Bacon', priceDelta: 15 },
        { id: 'pineapple', name: '鳳梨', englishName: 'Pineapple', priceDelta: 15 },
      ],
    },
  ],

  M008: [
    {
      id: 'burger-extra',
      name: '加購配料', englishName: 'Extra toppings',
      selectionType: 'multiple',
      required: false,
      maxSelect: 3,
      options: [
        { id: 'cheese', name: '起司', englishName: 'Cheese', priceDelta: 15 },
        { id: 'bacon', name: '培根', englishName: 'Bacon', priceDelta: 15 },
        { id: 'pineapple', name: '鳳梨', englishName: 'Pineapple', priceDelta: 15 },
      ],
    },
  ],

  // 椰汁咖哩雞
  M009: [
    {
      id: 'starch',
      name: '主食選擇', englishName: 'Choice of side',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'rice', name: '薑黃飯', englishName: 'Turmeric rice', priceDelta: 0 },
        { id: 'bread', name: '麵包', englishName: 'Bread', priceDelta: 0 },
      ],
    },
  ],

  M010: [
    {
      id: 'starch',
      name: '素食版本', englishName: 'Vegetarian options',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'vegan', name: '全素', englishName: 'Vegan', priceDelta: 0 },
        { id: 'Lacto-ovo', name: '蛋奶素', englishName: 'Lacto-ovo vegetarian', priceDelta: 0 },
      ],
    },
  ],

  M013: [
    {
      id: 'starch',
      name: '素食版本', englishName: 'Vegetarian options',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'vegan', name: '全素', englishName: 'Vegan', priceDelta: 0 },
        { id: 'Lacto-ovo', name: '蛋奶素', englishName: 'Lacto-ovo vegetarian', priceDelta: 0 },
      ],
    },
  ],

  M015: [
    {
      id: 'burger-extra',
      name: '加購配料', englishName: 'Extra toppings',
      selectionType: 'multiple',
      required: false,
      maxSelect: 3,
      options: [
        { id: 'cheese', name: '起司', englishName: 'Cheese', priceDelta: 15 },
        { id: 'bacon', name: '培根', englishName: 'Bacon', priceDelta: 15 },
        { id: 'pineapple', name: '鳳梨', englishName: 'Pineapple', priceDelta: 15 },
      ],
    },
  ],

  M016: [
    {
      id: 'burger-extra',
      name: '加購配料', englishName: 'Extra toppings',
      selectionType: 'multiple',
      required: false,
      maxSelect: 3,
      options: [
        { id: 'cheese', name: '起司', englishName: 'Cheese', priceDelta: 15 },
        { id: 'bacon', name: '培根', englishName: 'Bacon', priceDelta: 15 },
        { id: 'pineapple', name: '鳳梨', englishName: 'Pineapple', priceDelta: 15 },
      ],
    },
  ],

  M017: [
    {
      id: 'burger-extra',
      name: '加購配料', englishName: 'Extra toppings',
      selectionType: 'multiple',
      required: false,
      maxSelect: 3,
      options: [
        { id: 'cheese', name: '起司', englishName: 'Cheese', priceDelta: 15 },
        { id: 'bacon', name: '培根', englishName: 'Bacon', priceDelta: 15 },
        { id: 'pineapple', name: '鳳梨', englishName: 'Pineapple', priceDelta: 15 },
      ],
    },
  ],

  M018: [
    {
      id: 'burger-extra',
      name: '加購配料', englishName: 'Extra toppings',
      selectionType: 'multiple',
      required: false,
      maxSelect: 3,
      options: [
        { id: 'cheese', name: '起司', englishName: 'Cheese', priceDelta: 15 },
        { id: 'bacon', name: '培根', englishName: 'Bacon', priceDelta: 15 },
        { id: 'pineapple', name: '鳳梨', englishName: 'Pineapple', priceDelta: 15 },
      ],
    },
  ],

  M019: [
    {
      id: 'drinks',
      name: '飲品選擇', englishName: 'Choice of drink',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'Americano (Iced)', name: '美式咖啡(冰)', englishName: 'Iced Americano', priceDelta: 0 },
        { id: 'Americano (Hot)', name: '美式咖啡(熱)', englishName: 'Hot Americano', priceDelta: 0 },
        { id: 'Earl Grey Tea (Hot)', name: '伯爵茶(熱)', englishName: 'Hot Earl Grey tea', priceDelta: 0 },
      ],
    },
  ],

  M020: [
    {
      id: 'drinks',
      name: '飲品選擇', englishName: 'Choice of drink',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'Americano (Iced)', name: '美式咖啡(冰)', englishName: 'Iced Americano', priceDelta: 0 },
        { id: 'Americano (Hot)', name: '美式咖啡(熱)', englishName: 'Hot Americano', priceDelta: 0 },
        { id: 'Earl Grey Tea (Hot)', name: '伯爵茶(熱)', englishName: 'Hot Earl Grey tea', priceDelta: 0 },
      ],
    },
  ],

  M021: [
    {
      id: 'drinks',
      name: '飲品選擇', englishName: 'Choice of drink',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'Americano (Iced)', name: '美式咖啡(冰)', englishName: 'Iced Americano', priceDelta: 0 },
        { id: 'Americano (Hot)', name: '美式咖啡(熱)', englishName: 'Hot Americano', priceDelta: 0 },
        { id: 'Earl Grey Tea (Hot)', name: '伯爵茶(熱)', englishName: 'Hot Earl Grey tea', priceDelta: 0 },
      ],
    },
  ],

  M023: [
    {
      id: 'drinks',
      name: '飲品選擇', englishName: 'Choice of drink',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'Americano (Iced)', name: '美式咖啡(冰)', englishName: 'Iced Americano', priceDelta: 0 },
        { id: 'Americano (Hot)', name: '美式咖啡(熱)', englishName: 'Hot Americano', priceDelta: 0 },
        { id: 'Earl Grey Tea (Hot)', name: '伯爵茶(熱)', englishName: 'Hot Earl Grey tea', priceDelta: 0 },
      ],
    },
  ],

  M036: [
    {
      id: 'temp',
      name: '冷熱選擇', englishName: 'Temperature',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'Iced', name: '冰', englishName: 'Iced', priceDelta: 0 },
        { id: 'Hot', name: '熱', englishName: 'Hot', priceDelta: 0 },
      ],
    },
  ],

  M037: [
    {
      id: 'temp',
      name: '冷熱選擇', englishName: 'Temperature',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'Iced', name: '冰', englishName: 'Iced', priceDelta: 0 },
        { id: 'Hot', name: '熱', englishName: 'Hot', priceDelta: 0 },
      ],
    },
  ],

  M038: [
    {
      id: 'temp',
      name: '冷熱選擇', englishName: 'Temperature',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'Iced', name: '冰', englishName: 'Iced', priceDelta: 0 },
        { id: 'Hot', name: '熱', englishName: 'Hot', priceDelta: 0 },
      ],
    },
  ],

  M039: [
    {
      id: 'temp',
      name: '冷熱選擇', englishName: 'Temperature',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'Iced', name: '冰', englishName: 'Iced', priceDelta: 0 },
        { id: 'Hot', name: '熱', englishName: 'Hot', priceDelta: 0 },
      ],
    },
  ],

  M042: [
    {
      id: 'temp',
      name: '冷熱選擇', englishName: 'Temperature',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'Iced', name: '冰', englishName: 'Iced', priceDelta: 0 },
        { id: 'Hot', name: '熱', englishName: 'Hot', priceDelta: 0 },
      ],
    },
  ],

  M043: [
    {
      id: 'temp',
      name: '冷熱選擇', englishName: 'Temperature',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'Iced', name: '冰', englishName: 'Iced', priceDelta: 0 },
        { id: 'Hot', name: '熱', englishName: 'Hot', priceDelta: 0 },
      ],
    },
  ],

  M048: [
    {
      id: 'temp',
      name: '冷熱選擇', englishName: 'Temperature',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'Iced', name: '冰', englishName: 'Iced', priceDelta: 0 },
        { id: 'Hot', name: '熱', englishName: 'Hot', priceDelta: 0 },
      ],
    },
  ],

  M049: [
    {
      id: 'temp',
      name: '冷熱選擇', englishName: 'Temperature',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'Iced', name: '冰', englishName: 'Iced', priceDelta: 0 },
        { id: 'Hot', name: '熱', englishName: 'Hot', priceDelta: 0 },
      ],
    },
  ],

  M050: [
    {
      id: 'temp',
      name: '冷熱選擇', englishName: 'Temperature',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'Iced', name: '冰', englishName: 'Iced', priceDelta: 0 },
        { id: 'Hot', name: '熱', englishName: 'Hot', priceDelta: 0 },
      ],
    },
  ],

  M053: [
    {
      id: 'temp',
      name: '冷熱選擇', englishName: 'Temperature',
      selectionType: 'single',
      required: true,
      options: [
        { id: 'Iced', name: '冰', englishName: 'Iced', priceDelta: 0 },
        { id: 'Hot', name: '熱', englishName: 'Hot', priceDelta: 0 },
      ],
    },
  ],
};
