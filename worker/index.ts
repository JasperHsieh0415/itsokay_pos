
import { Hono } from 'hono';
import { resolveOrderOptions, type OrderOption } from './orderOptions.ts';
import { calculateMealDrinkDiscount } from '../src/data/orderDiscount.ts';

type Bindings = {
  DB: D1Database;
  ADMIN_API_KEY: string;
  CHEF_API_KEY: string;
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
  c.header('Cache-Control', 'no-store');
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT
        p.id,
        p.product_code,
        p.name,
        p.english_name,
        CASE WHEN p.product_code IN ('M027', 'M047') THEN 0 ELSE p.price END AS price,
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
  selected_options?: unknown;
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
  station: 'kitchen' | 'bar' | 'none';
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

    // 僅接受選項識別碼；名稱與價格由後端決定。
    const allowedKeys = ['product_code', 'quantity', 'selected_options'];

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
      error: 'Invalid item data',
    }, 400);
  }

  // 不同客製化組合保留各自的訂單明細。
  const productCodes = [...new Set(items.map((item) => item.product_code))];

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
          available,
          station
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

      let options: OrderOption[];
      try {
        options = resolveOrderOptions(item.product_code, item.selected_options);
      } catch (error) {
        return c.json({
          success: false,
          error: error instanceof Error ? error.message : 'Invalid customization',
        }, 400);
      }
      const basePrice = ['M027', 'M047'].includes(product.product_code) ? 0 : product.price;
      const unitPrice = basePrice + options.reduce((sum, option) => sum + option.price_delta, 0);
      if (!Number.isSafeInteger(unitPrice) || unitPrice < 0) {
        return c.json({ success: false, error: 'Invalid calculated amount' }, 400);
      }
      const lineTotal = unitPrice * item.quantity;

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
        unitPrice,
        options,
        lineTotal,

        station: product.station,

        kitchenStatus:
          product.station === 'kitchen'
            ? 'pending'
            : 'not_required',
      });
    }

    if (!Number.isSafeInteger(totalAmount)) {
      return c.json({
        success: false,
        error: 'Order amount exceeds supported range',
      }, 400);
    }

    const subtotalAmount = totalAmount;
    const { discountAmount } = calculateMealDrinkDiscount(orderItems);
    totalAmount -= discountAmount;
    if (!Number.isSafeInteger(totalAmount) || totalAmount < 0) {
      return c.json({ success: false, error: 'Invalid discounted amount' }, 400);
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
            line_total,
            station,
            kitchen_status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          item.id,
          orderId,
          item.productCode,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.lineTotal,
          item.station,
          item.kitchenStatus
        )
      ),
    ];

    for (const item of orderItems) {
      for (const option of item.options) {
        statements.push(c.env.DB.prepare(`
          INSERT INTO order_item_options (
            id, order_item_id, group_id, option_id, option_name, price_delta
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(), item.id, option.group_id,
          option.option_id, option.option_name, option.price_delta
        ));
      }
    }

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
        subtotal_amount: subtotalAmount,
        discount_amount: discountAmount,
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


async function loadOrderOptions(db: D1Database, orderIds: string[]) {
  const optionsByItem = new Map<string, OrderOption[]>();
  const uniqueIds = [...new Set(orderIds)];
  for (let offset = 0; offset < uniqueIds.length; offset += 50) {
    const ids = uniqueIds.slice(offset, offset + 50);
    const { results } = await db.prepare(`
      SELECT opt.order_item_id, opt.group_id, opt.option_id, opt.option_name, opt.price_delta
      FROM order_item_options opt
      JOIN order_items item ON item.id = opt.order_item_id
      WHERE item.order_id IN (${ids.map(() => '?').join(',')})
      ORDER BY opt.rowid ASC
    `).bind(...ids).all<OrderOption & { order_item_id: string }>();
    for (const { order_item_id, ...option } of results) {
      const options = optionsByItem.get(order_item_id) ?? [];
      options.push(option);
      optionsByItem.set(order_item_id, options);
    }
  }
  return optionsByItem;
}

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
  id: string;
  product_code: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  station: 'kitchen' | 'bar' | 'none';
  kitchen_status: 'not_required' | 'pending' | 'preparing' | 'ready';
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['completed', 'cancelled'],

  // 相容先前已存在的測試訂單
  confirmed: ['completed', 'cancelled'],
  preparing: ['completed', 'cancelled'],
  ready: ['completed', 'cancelled'],

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

// Chef API 身分驗證
app.use('/api/chef/*', async (c, next) => {
  const configuredKey = c.env.CHEF_API_KEY;
  const supplied = c.req.header('Authorization');

  if (!configuredKey) {
    return c.json(
      {
        success: false,
        error: 'Chef API not configured',
      },
      503
    );
  }

  if (supplied !== `Bearer ${configuredKey}`) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      401
    );
  }

  await next();
});


// 只修改這筆訂單中的時價明細，不變更菜單商品價格。
app.patch('/api/admin/orders/:id/items/:itemId/price', async (c) => {
  const orderId = c.req.param('id');
  const itemId = c.req.param('itemId');
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json({ success: false, error: 'Invalid request body' }, 400);
  }
  const { unit_price: unitPrice, expected_unit_price: expectedPrice } = body as Record<string, unknown>;
  if (typeof unitPrice !== 'number' || !Number.isSafeInteger(unitPrice) || unitPrice < 0 ||
      typeof expectedPrice !== 'number' || !Number.isSafeInteger(expectedPrice) || expectedPrice < 0) {
    return c.json({ success: false, error: '單價必須是 0 或正整數' }, 400);
  }
  try {
    const item = await c.env.DB.prepare(`
      SELECT quantity FROM order_items
      WHERE id = ? AND order_id = ? AND product_code IN ('M027', 'M047')
    `).bind(itemId, orderId).first<{ quantity: number }>();
    if (!item) return c.json({ success: false, error: '找不到可修改價格的訂單明細' }, 404);
    const lineTotal = unitPrice * item.quantity;
    const delta = (unitPrice - expectedPrice) * item.quantity;
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(delta)) {
      return c.json({ success: false, error: '金額超出可支援範圍' }, 400);
    }
    // D1 batch 在同一交易依序執行。以差額更新總額，保留既有優惠，
    // 並在寫入當下檢查訂單狀態、舊單價，避免並行修改造成覆蓋。
    const results = await c.env.DB.batch([
      c.env.DB.prepare(`
        UPDATE orders SET total_amount = total_amount + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status NOT IN ('completed', 'cancelled')
          AND total_amount + ? BETWEEN 0 AND 9007199254740991
          AND (SELECT SUM(line_total) FROM order_items WHERE order_id = ?) + ?
              BETWEEN 0 AND 9007199254740991
          AND EXISTS (
            SELECT 1 FROM order_items WHERE id = ? AND order_id = orders.id
              AND product_code IN ('M027', 'M047') AND unit_price = ? AND quantity = ?
          )
        RETURNING id, total_amount
      `).bind(delta, orderId, delta, orderId, delta, itemId, expectedPrice, item.quantity),
      c.env.DB.prepare(`
        UPDATE order_items SET unit_price = ?, line_total = ?
        WHERE id = ? AND order_id = ? AND changes() = 1
        RETURNING id, order_id, product_code, unit_price, quantity, line_total
      `).bind(unitPrice, lineTotal, itemId, orderId),
    ]);
    // changes() 僅在前一個 UPDATE 確實更新訂單時才允許修改明細。
    if (!results[1].results.length) {
      return c.json({ success: false, error: '訂單已結束、價格已變更或金額超出範圍，請重新整理' }, 409);
    }
    return c.json({ success: true, data: { order: results[0].results[0], item: results[1].results[0] } });
  } catch (error) {
    console.error('Order item price update failed:', error);
    return c.json({ success: false, error: '儲存單價失敗' }, 500);
  }
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
        id, order_id, product_code, product_name, quantity,
        unit_price, line_total, station, kitchen_status
      FROM order_items
      WHERE order_id IN (${placeholders})
      ORDER BY rowid ASC
    `)
      .bind(...orders.map((order) => order.id))
      .all<OrderItemRow>();

    const optionsByItem = await loadOrderOptions(c.env.DB, orders.map((order) => order.id));
    const itemsByOrder = new Map<string, (OrderItemRow & { selected_options: OrderOption[] })[]>();

    for (const item of itemResult.results) {
      const existing = itemsByOrder.get(item.order_id) ?? [];
      existing.push({ ...item, selected_options: optionsByItem.get(item.id) ?? [] });
      itemsByOrder.set(item.order_id, existing);
    }

    const data = orders.map((order) => {
      const orderItems = itemsByOrder.get(order.id) ?? [];
      // 從下單時保存的原價明細與實收金額還原優惠，不以現在的菜單重新計價。
      const subtotalAmount = orderItems.reduce((sum, item) => sum + item.line_total, 0);
      return {
        ...order,
        subtotal_amount: subtotalAmount,
        discount_amount: subtotalAmount - order.total_amount,
        items: orderItems,
      };
    });

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
  const force = request.force === true;

  if ((request.force !== undefined && typeof request.force !== 'boolean') ||
      (force && newStatus !== 'completed')) {
    return c.json({ success: false, error: 'Invalid force completion request' }, 400);
  }

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
    const updateOrder = c.env.DB.prepare(`
      UPDATE orders
      SET
        status = ?,
        updated_at = CURRENT_TIMESTAMP

      WHERE id = ?
        AND status = ?

        -- 只有完成訂單需要檢查廚房狀態
        -- 取消訂單不受熟食製作進度限制
        AND (
          ? = 'cancelled'
          OR ? = 1
          OR NOT EXISTS (
            SELECT 1
            FROM order_items i
            WHERE i.order_id = orders.id
              AND i.station = 'kitchen'
              AND i.kitchen_status <> 'ready'
          )
        )

      RETURNING
        id,
        order_number,
        status,
        updated_at
    `)
      .bind(to, orderId, from, to, force ? 1 : 0);

    type UpdatedOrder = {
      id: string;
      order_number: string;
      status: OrderStatus;
      updated_at: string;
    };

    let updated: UpdatedOrder | null;
    if (force) {
      // 同一交易內同步熟食與訂單；狀態已改變時，兩者都不更新。
      const results = await c.env.DB.batch<UpdatedOrder>([
        c.env.DB.prepare(`
          UPDATE order_items
          SET kitchen_status = 'ready',
              kitchen_completed_at = CURRENT_TIMESTAMP
          WHERE order_id = ?
            AND station = 'kitchen'
            AND kitchen_status <> 'ready'
            AND EXISTS (
              SELECT 1 FROM orders o
              WHERE o.id = order_items.order_id AND o.status = ?
            )
        `).bind(orderId, from),
        updateOrder,
      ]);
      updated = results[1].results[0] ?? null;
    } else {
      updated = await updateOrder.first<UpdatedOrder>();
    }

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


type ChefOrderRow = {
  order_id: string;
  order_number: string;
  dining_mode: 'dinein' | 'takeout';
  table_id: string | null;
  created_at: string;
  item_id: string;
  product_name: string;
  quantity: number;
  kitchen_status: 'pending' | 'preparing' | 'ready';
};

app.get('/api/chef/orders', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT
        o.id AS order_id,
        o.order_number,
        o.dining_mode,
        o.table_id,
        o.created_at,

        i.id AS item_id,
        i.product_name,
        i.quantity,
        i.kitchen_status

      FROM order_items i
      INNER JOIN orders o
        ON o.id = i.order_id

      WHERE i.station = 'kitchen'
        AND o.status NOT IN ('cancelled', 'completed')
        AND (
          i.kitchen_status IN ('pending', 'preparing')
          OR o.created_at >= datetime('now', '-1 day')
        )

      ORDER BY
        o.created_at ASC,
        i.rowid ASC

      LIMIT 500
    `).all<ChefOrderRow>();

    const optionsByItem = await loadOrderOptions(c.env.DB, results.map((item) => item.order_id));
    c.header('Cache-Control', 'no-store');

    return c.json({
      success: true,
      data: results.map((item) => ({
        ...item,
        selected_options: optionsByItem.get(item.item_id) ?? [],
      })),
    });

  } catch (error) {
    console.error('Chef orders query failed:', error);

    return c.json(
      { success: false, error: 'Database error' },
      500
    );
  }
});


type ChefStatus = 'pending' | 'preparing' | 'ready';

app.patch('/api/chef/items/:id/status', async (c) => {
  const itemId = c.req.param('id');

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
    body === null ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    return c.json(
      { success: false, error: 'Invalid request' },
      400
    );
  }

  const request = body as Record<string, unknown>;

  const nextStatus = request.status;
  const expectedStatus = request.expected_status;

  const validTransition =
    nextStatus === 'ready' &&
    (
      expectedStatus === 'pending' ||
      expectedStatus === 'preparing'
    );
  if (!validTransition) {
    return c.json(
      { success: false, error: 'Invalid status transition' },
      400
    );
  }

  try {
    const updated = await c.env.DB.prepare(`
      UPDATE order_items
      SET
        kitchen_status = 'ready',
        kitchen_completed_at = CURRENT_TIMESTAMP

      WHERE id = ?
        AND station = 'kitchen'
        AND kitchen_status = ?
        AND EXISTS (
          SELECT 1
          FROM orders o
          WHERE o.id = order_items.order_id
            AND o.status NOT IN ('cancelled', 'completed')
        )

      RETURNING id, order_id, kitchen_status
    `)
      .bind(
        itemId,
        expectedStatus
      )
      .first<{
        id: string;
        order_id: string;
        kitchen_status: ChefStatus;
      }>();

    if (!updated) {
      return c.json(
        {
          success: false,
          error: 'Item not found, order closed, or status changed',
        },
        409
      );
    }

    return c.json({
      success: true,
      data: updated,
    });

  } catch (error) {
    console.error('Failed to update kitchen status:', error);

    return c.json(
      { success: false, error: 'Database error' },
      500
    );
  }
});



export default app;

