
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  ADMIN_API_KEY: string;
};

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'restaurant-pos'
  });
});

app.get('/api/menu', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT
        p.id,
        p.product_code,
        p.name,
        p.english_name,
        p.price,
        p.sale_type,
        p.customization_tag,
        p.description,
        p.available,
        p.category_id,
        c.name AS sub_category_name,
        c.parent_id AS main_category_id,
        m.name AS main_category_name
      FROM products p
      JOIN categories c
        ON p.category_id = c.id
      JOIN categories m
        ON c.parent_id = m.id
      WHERE p.available = 1
        AND c.active = 1
        AND m.active = 1
      ORDER BY
        m.sort_order,
        c.sort_order,
        p.sort_order,
        p.id
    `).all();

    return c.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Menu query failed:', error);

    return c.json({
      success: false,
      error: 'Database error'
    }, 500);
  }
});

app.get('/api/categories', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT
        id,
        parent_id,
        name,
        english_name,
        sort_order
      FROM categories
      WHERE active = 1
      ORDER BY sort_order, id
    `).all();

    return c.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Categories query failed:', error);
    return c.json({
      success: false,
      error: 'Database error'
    }, 500);
  }
});


type CreateOrderItem = {
  product_code: string;
  quantity: number;
};

type CreateOrderRequest = {
  dining_mode: 'dinein' | 'takeout';
  table_id: string | null;
  items: CreateOrderItem[];
};

type ProductRow = {
  product_code: string;
  name: string;
  price: number;
  available: number;
};

const VALID_TABLE_IDS = new Set([
  'T01', 'T02', 'T03', 'T04',
  'T05', 'T06', 'T07', 'T08',
]);

app.post('/api/orders', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({
      success: false,
      error: 'Invalid JSON body',
    }, 400);
  }

  if (
    body === null ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    return c.json({
      success: false,
      error: 'Invalid request body',
    }, 400);
  }

  const request = body as Partial<CreateOrderRequest>;
  const diningMode = request.dining_mode;
  const tableId = request.table_id;

  // 1. 驗證用餐方式
  if (
    diningMode !== 'dinein' &&
    diningMode !== 'takeout'
  ) {
    return c.json({
      success: false,
      error: 'Invalid dining mode',
    }, 400);
  }

  // 2. 驗證桌號
  if (
    diningMode === 'dinein' &&
    (
      typeof tableId !== 'string' ||
      !VALID_TABLE_IDS.has(tableId)
    )
  ) {
    return c.json({
      success: false,
      error: 'Invalid table ID',
    }, 400);
  }

  if (
    diningMode === 'takeout' &&
    tableId != null
  ) {
    return c.json({
      success: false,
      error: 'Takeout must not have a table ID',
    }, 400);
  }

  // 3. 驗證商品清單
  if (
    !Array.isArray(request.items) ||
    request.items.length === 0 ||
    request.items.length > 50
  ) {
    return c.json({
      success: false,
      error: 'Invalid order items',
    }, 400);
  }

  const items = request.items;

  const validItems = items.every((item) => {
    if (
      item === null ||
      typeof item !== 'object' ||
      Array.isArray(item)
    ) {
      return false;
    }

    const itemRecord = item as unknown as Record<string, unknown>;

    // 本階段只允許一般商品。
    // 拒絕額外欄位，以免客製化選項被忽略。
    const allowedKeys = ['product_code', 'quantity'];

    if (
      Object.keys(itemRecord).some(
        (key) => !allowedKeys.includes(key)
      )
    ) {
      return false;
    }

    return (
      typeof item.product_code === 'string' &&
      item.product_code.length > 0 &&
      item.product_code.length <= 64 &&
      Number.isInteger(item.quantity) &&
      item.quantity >= 1 &&
      item.quantity <= 99
    );
  });

  if (!validItems) {
    return c.json({
      success: false,
      error: 'Invalid item data or unsupported customization',
    }, 400);
  }

  // 同一個 product_code 目前只能有一筆。
  // 後續支援不同客製化組合時再放寬。
  const productCodes = items.map(
    (item) => item.product_code
  );

  if (new Set(productCodes).size !== productCodes.length) {
    return c.json({
      success: false,
      error: 'Duplicate product codes',
    }, 400);
  }

  try {
    // 4. 一次取得所有商品目前售價
    const placeholders = productCodes
      .map(() => '?')
      .join(', ');

    const productResult = await c.env.DB
      .prepare(`
        SELECT
          product_code,
          name,
          price,
          available
        FROM products
        WHERE product_code IN (${placeholders})
      `)
      .bind(...productCodes)
      .all<ProductRow>();

    const productMap = new Map(
      productResult.results.map((product) => [
        product.product_code,
        product,
      ])
    );

    let totalAmount = 0;

    const orderItems = [];

    for (const item of items) {
      const product = productMap.get(item.product_code);

      if (
        !product ||
        product.available !== 1 ||
        !Number.isSafeInteger(product.price) ||
        product.price < 0
      ) {
        return c.json({
          success: false,
          error: `Product unavailable: ${item.product_code}`,
        }, 400);
      }

      const lineTotal = product.price * item.quantity;

      if (!Number.isSafeInteger(lineTotal)) {
        return c.json({
          success: false,
          error: 'Invalid calculated amount',
        }, 400);
      }

      totalAmount += lineTotal;

      orderItems.push({
        id: crypto.randomUUID(),
        productCode: product.product_code,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        lineTotal,
      });
    }

    if (!Number.isSafeInteger(totalAmount)) {
      return c.json({
        success: false,
        error: 'Order amount exceeds supported range',
      }, 400);
    }

    // 5. 產生訂單識別碼
    const orderId = crypto.randomUUID();

    // 使用 UUID 前 12 碼作為簡短展示編號。
    // UNIQUE constraint 仍會防止極少數的重複。
    const orderNumber = orderId
      .replaceAll('-', '')
      .slice(0, 12)
      .toUpperCase();

    // 6. 一次寫入訂單主檔及明細
    const statements = [
      c.env.DB.prepare(`
        INSERT INTO orders (
          id,
          order_number,
          dining_mode,
          table_id,
          status,
          total_amount
        )
        VALUES (?, ?, ?, ?, 'pending', ?)
      `).bind(
        orderId,
        orderNumber,
        diningMode,
        diningMode === 'dinein' ? tableId : null,
        totalAmount
      ),

      ...orderItems.map((item) =>
        c.env.DB.prepare(`
          INSERT INTO order_items (
            id,
            order_id,
            product_code,
            product_name,
            quantity,
            unit_price,
            line_total
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          item.id,
          orderId,
          item.productCode,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.lineTotal
        )
      ),
    ];

    await c.env.DB.batch(statements);

    return c.json({
      success: true,
      data: {
        order_id: orderId,
        order_number: orderNumber,
        dining_mode: diningMode,
        table_id: diningMode === 'dinein' ? tableId : null,
        status: 'pending',
        total_amount: totalAmount,
      },
    }, 201);

  } catch (error) {
    console.error('Failed to create order:', error);

    return c.json({
      success: false,
      error: 'Failed to create order',
    }, 500);
  }
});


type OrderRow = {
  id: string;
  order_number: string;
  dining_mode: 'dinein' | 'takeout';
  table_id: string | null;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
};

type OrderItemRow = {
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'ready', 'cancelled'],
  preparing: ['ready'],
  ready: ['completed'],
  completed: [],
  cancelled: [],
};

// 管理 API 身分驗證
app.use('/api/admin/*', async (c, next) => {
  const configuredKey = c.env.ADMIN_API_KEY;
  const supplied = c.req.header('Authorization');

  if (!configuredKey) {
    return c.json(
      { success: false, error: 'Admin API not configured' },
      503
    );
  }

  if (supplied !== `Bearer ${configuredKey}`) {
    return c.json(
      { success: false, error: 'Unauthorized' },
      401
    );
  }

  await next();
});

// 取得最近 50 筆訂單與商品明細
app.get('/api/admin/orders', async (c) => {
  try {
    const ordersResult = await c.env.DB.prepare(`
      SELECT
        id, order_number, dining_mode, table_id,
        status, total_amount, created_at
      FROM orders
      ORDER BY created_at DESC, id DESC
      LIMIT 50
    `).all<OrderRow>();

    const orders = ordersResult.results;

    if (orders.length === 0) {
      c.header('Cache-Control', 'no-store');
      return c.json({ success: true, data: [] });
    }

    const placeholders = orders.map(() => '?').join(',');

    const itemResult = await c.env.DB.prepare(`
      SELECT
        order_id, product_name, quantity,
        unit_price, line_total
      FROM order_items
      WHERE order_id IN (${placeholders})
      ORDER BY rowid ASC
    `)
      .bind(...orders.map((order) => order.id))
      .all<OrderItemRow>();

    const itemsByOrder = new Map<string, OrderItemRow[]>();

    for (const item of itemResult.results) {
      const existing = itemsByOrder.get(item.order_id) ?? [];
      existing.push(item);
      itemsByOrder.set(item.order_id, existing);
    }

    const data = orders.map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id) ?? [],
    }));

    c.header('Cache-Control', 'no-store');

    return c.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Admin orders query failed:', error);

    return c.json(
      { success: false, error: 'Database error' },
      500
    );
  }
});

// 更新訂單狀態
app.patch('/api/admin/orders/:id/status', async (c) => {
  const orderId = c.req.param('id');

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { success: false, error: 'Invalid JSON' },
      400
    );
  }

  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    return c.json(
      { success: false, error: 'Invalid request' },
      400
    );
  }

  const request = body as Record<string, unknown>;
  const newStatus = request.status;
  const expectedStatus = request.expected_status;

  const statuses: OrderStatus[] = [
    'pending', 'confirmed', 'preparing',
    'ready', 'completed', 'cancelled',
  ];

  if (
    typeof newStatus !== 'string' ||
    !statuses.includes(newStatus as OrderStatus) ||
    typeof expectedStatus !== 'string' ||
    !statuses.includes(expectedStatus as OrderStatus)
  ) {
    return c.json(
      { success: false, error: 'Invalid status' },
      400
    );
  }

  const from = expectedStatus as OrderStatus;
  const to = newStatus as OrderStatus;

  if (!NEXT_STATUS[from].includes(to)) {
    return c.json(
      { success: false, error: 'Invalid status transition' },
      400
    );
  }

  try {
    // expected_status 避免兩名店員同時修改時覆蓋對方結果
    const updated = await c.env.DB.prepare(`
      UPDATE orders
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = ?
      RETURNING id, order_number, status, updated_at
    `)
      .bind(to, orderId, from)
      .first<{
        id: string;
        order_number: string;
        status: OrderStatus;
        updated_at: string;
      }>();

    if (!updated) {
      return c.json(
        {
          success: false,
          error: 'Order not found or status already changed',
        },
        409
      );
    }

    c.header('Cache-Control', 'no-store');

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Update order status failed:', error);

    return c.json(
      { success: false, error: 'Database error' },
      500
    );
  }
});

export default app;

