import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import app from './index.ts';

// Exercise the HTTP handlers against SQLite with the actual migration schema.
function setup(t) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  for (const file of ['0001_init.sql', '0002_add_menu_categories.sql', '0003_create_orders.sql', '0004_add_kitchen_workflow.sql']) {
    sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  }
  sqlite.exec(`INSERT INTO products (id, product_code, name, price, station) VALUES
    (201, 'M005', '漢堡套餐', 300, 'kitchen'),
    (202, 'M009', '咖哩雞', 250, 'kitchen'),
    (203, 'M036', '飲品', 100, 'bar'),
    (204, 'M018', '豬肉漢堡', 230, 'kitchen'),
    (205, 'PLAIN', '一般餐點', 150, 'kitchen');`);
  function prepare(sql) {
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async all() { return { results: sqlite.prepare(sql).all(...values) }; },
      async first() { return sqlite.prepare(sql).get(...values) ?? null; },
      run() { return sqlite.prepare(sql).run(...values); },
    };
  }
  const env = {
    DB: { prepare, async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.all());
        sqlite.exec('COMMIT');
        return result;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    } },
    ADMIN_API_KEY: 'admin-test', CHEF_API_KEY: 'chef-test',
  };
  return {
    sqlite,
    patch(path, body, role = 'admin') {
      return app.request(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env[`${role.toUpperCase()}_API_KEY`]}` },
        body: JSON.stringify(body),
      }, env);
    },
    post(items) {
      return app.request('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dining_mode: 'takeout', table_id: null, items }),
      }, env);
    },
    get(role) {
      return app.request(`/api/${role}/orders`, {
        headers: { Authorization: `Bearer ${env[`${role.toUpperCase()}_API_KEY`]}` },
      }, env);
    },
  };
}

const option = (option_id, group_id = 'burger-extra') => ({ group_id, option_id });

test('custom prices, quantities and separate combinations persist and reach both staff APIs', async (t) => {
  const { post, get, sqlite } = setup(t);
  const response = await post([
    { product_code: 'M005', quantity: 2, selected_options: [option('cheese'), option('bacon')] },
    { product_code: 'M005', quantity: 1, selected_options: [option('pineapple')] },
    { product_code: 'M009', quantity: 1, selected_options: [option('bread', 'starch')] },
  ]);
  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.total_amount, 1225);
  const rows = sqlite.prepare('SELECT unit_price, line_total FROM order_items ORDER BY rowid').all();
  assert.deepEqual(rows.map((row) => [row.unit_price, row.line_total]), [[330, 660], [315, 315], [250, 250]]);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM order_item_options').get().count, 4);
  for (const role of ['admin', 'chef']) {
    const result = await get(role);
    assert.equal(result.status, 200);
    const data = (await result.json()).data;
    const items = role === 'admin' ? data[0].items : data;
    assert.deepEqual(items.map((item) => item.selected_options.map((selected) => selected.option_name)), [['起司', '培根'], ['鳳梨'], ['麵包']]);
  }
});

test('plain items, free required choices and M018 customization succeed', async (t) => {
  const { post } = setup(t);
  const response = await post([
    { product_code: 'PLAIN', quantity: 2 },
    { product_code: 'M036', quantity: 1, selected_options: [option('Hot', 'temp')] },
    { product_code: 'M018', quantity: 1, selected_options: [option('cheese')] },
  ]);
  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.total_amount, 645);
});

test('invalid, duplicate, missing, multiple single-choice and forged-price options reject without writes', async (t) => {
  const { post, sqlite } = setup(t);
  const invalidItems = [
    { product_code: 'M005', selected_options: null },
    { product_code: 'M005', selected_options: {} },
    { product_code: 'M005', selected_options: [null] },
    { product_code: 'M005', selected_options: [option('unknown')] },
    { product_code: 'PLAIN', selected_options: [option('cheese')] },
    { product_code: 'M005', selected_options: [option('cheese'), option('cheese')] },
    { product_code: 'M009' },
    { product_code: 'M009', selected_options: [option('rice', 'starch'), option('bread', 'starch')] },
    { product_code: 'M005', selected_options: [{ ...option('cheese'), price_delta: -300 }] },
    { product_code: 'M005', unit_price: 1 },
  ];
  for (const item of invalidItems) {
    const response = await post([{ product_code: 'PLAIN', quantity: 1 }, { quantity: 1, ...item }]);
    assert.equal(response.status, 400, JSON.stringify(item));
  }
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM orders').get().count, 0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM order_items').get().count, 0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM order_item_options').get().count, 0);
});

test('force completion updates unfinished kitchen items atomically and removes the chef ticket', async (t) => {
  const { post, patch, get, sqlite } = setup(t);
  const created = await post([
    { product_code: 'PLAIN', quantity: 1 },
    { product_code: 'M005', quantity: 1 },
    { product_code: 'M018', quantity: 1 },
    { product_code: 'M036', quantity: 1, selected_options: [option('Hot', 'temp')] },
  ]);
  const { order_id } = (await created.json()).data;
  sqlite.exec(`UPDATE order_items SET kitchen_status = 'preparing' WHERE product_code = 'M005';
    UPDATE order_items SET kitchen_status = 'ready', kitchen_completed_at = '2026-01-01 00:00:00' WHERE product_code = 'M018';`);
  const path = `/api/admin/orders/${order_id}/status`;
  const body = { status: 'completed', expected_status: 'pending' };
  assert.equal((await patch(path, body)).status, 409);
  assert.equal((await patch(path, { ...body, force: true }, 'chef')).status, 401);
  assert.equal((await patch(path, { ...body, force: true })).status, 200);
  const admin = (await (await get('admin')).json()).data[0];
  assert.equal(admin.status, 'completed');
  assert.ok(admin.items.filter((item) => item.station === 'kitchen').every((item) => item.kitchen_status === 'ready'));
  assert.equal(admin.items.find((item) => item.station === 'bar').kitchen_status, 'not_required');
  const kitchen = sqlite.prepare("SELECT kitchen_completed_at FROM order_items WHERE station = 'kitchen'").all();
  assert.ok(kitchen.every((item) => item.kitchen_completed_at));
  assert.equal(sqlite.prepare("SELECT kitchen_completed_at FROM order_items WHERE product_code = 'M018'").get().kitchen_completed_at, '2026-01-01 00:00:00');
  assert.deepEqual((await (await get('chef')).json()).data, []);
  const itemId = sqlite.prepare("SELECT id FROM order_items WHERE product_code = 'PLAIN'").get().id;
  assert.equal((await patch(`/api/chef/items/${itemId}/status`, { status: 'ready', expected_status: 'pending' }, 'chef')).status, 409);
  assert.equal((await patch(path, { ...body, force: true })).status, 409);
});

test('force completion rejects invalid and stale requests without changing kitchen state', async (t) => {
  const { post, patch, sqlite } = setup(t);
  const { order_id } = (await (await post([{ product_code: 'PLAIN', quantity: 1 }])).json()).data;
  const path = `/api/admin/orders/${order_id}/status`;
  for (const body of [
    { status: 'completed', expected_status: 'pending', force: 'true' },
    { status: 'cancelled', expected_status: 'pending', force: true },
    { status: 'completed', expected_status: 'cancelled', force: true },
  ]) assert.equal((await patch(path, body)).status, 400);
  assert.equal((await patch(path, { status: 'completed', expected_status: 'confirmed', force: true })).status, 409);
  assert.equal((await patch(path, { status: 'cancelled', expected_status: 'pending' })).status, 200);
  assert.equal((await patch(path, { status: 'completed', expected_status: 'pending', force: true })).status, 409);
  assert.equal(sqlite.prepare('SELECT kitchen_status FROM order_items').get().kitchen_status, 'pending');
  assert.equal(sqlite.prepare('SELECT status FROM orders').get().status, 'cancelled');
});

test('force completion rolls back kitchen changes if completing the order fails', async (t) => {
  const { post, patch, sqlite } = setup(t);
  const { order_id } = (await (await post([{ product_code: 'PLAIN', quantity: 1 }])).json()).data;
  sqlite.exec(`CREATE TRIGGER fail_completion BEFORE UPDATE ON orders
    BEGIN SELECT RAISE(ABORT, 'test transaction failure'); END;`);
  const response = await patch(`/api/admin/orders/${order_id}/status`, {
    status: 'completed', expected_status: 'pending', force: true,
  });
  assert.equal(response.status, 500);
  assert.equal(sqlite.prepare('SELECT status FROM orders').get().status, 'pending');
  const item = sqlite.prepare('SELECT kitchen_status, kitchen_completed_at FROM order_items').get();
  assert.equal(item.kitchen_status, 'pending');
  assert.equal(item.kitchen_completed_at, null);
});
