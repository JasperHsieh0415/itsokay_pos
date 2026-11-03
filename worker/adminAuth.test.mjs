import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import app from './index.ts';
import { createAdminSession, hashPassword, verifyPassword } from './adminAuth.ts';

function setup(t) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  for (const name of ['0001_init.sql', '0002_add_menu_categories.sql', '0003_create_orders.sql', '0004_add_kitchen_workflow.sql', '0005_add_custom_discount.sql', '0006_create_users.sql', '0007_add_developer_role.sql']) {
    sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  }
  function prepare(sql) {
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async first() { return sqlite.prepare(sql).get(...values) ?? null; },
      async all() { return { results: sqlite.prepare(sql).all(...values) }; },
      async run() { return sqlite.prepare(sql).run(...values); },
    };
  }
  const env = { DB: { prepare }, ADMIN_API_KEY: 'initial-secret', CHEF_API_KEY: 'chef-secret', DEVELOPER_USERNAME: 'hidden-owner', DEVELOPER_PASSWORD: 'developer-initial' };
  const request = (path, options) => app.request(path, options, env);
  const login = (password = 'initial-secret') => request('/api/auth/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
  });
  const orders = (token) => request('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } });
  const change = (token, body) => request('/api/admin/account/password', {
    method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { sqlite, env, request, login, orders, change };
}

test('first login creates one hashed admin and replaces legacy key access with signed sessions', async (t) => {
  const { sqlite, login, orders } = setup(t);
  assert.equal((await login('wrong')).status, 401);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM users').get().count, 0);
  const response = await login();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const token = (await response.json()).data.token;
  const user = sqlite.prepare('SELECT * FROM users').get();
  assert.equal(user.username, 'admin');
  assert.notEqual(user.password_hash, 'initial-secret');
  assert.equal(await verifyPassword('initial-secret', user.password_hash), true);
  assert.equal((await orders(token)).status, 200);
  assert.equal((await orders('initial-secret')).status, 401);
  assert.equal((await orders(token + 'x')).status, 401);
  assert.equal((await login()).status, 200);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1);
});

test('password changes accept simple passwords and revoke all existing sessions and the initial key', async (t) => {
  const { login, change, orders, sqlite } = setup(t);
  const first = (await (await login()).json()).data.token;
  const second = (await (await login()).json()).data.token;
  const response = await change(first, { current_password: 'initial-secret', new_password: 'a', confirm_password: 'a' });
  assert.equal(response.status, 200);
  assert.equal((await orders(first)).status, 401);
  assert.equal((await orders(second)).status, 401);
  assert.equal((await orders('initial-secret')).status, 401);
  assert.equal((await login('initial-secret')).status, 401);
  const next = await login('a');
  assert.equal(next.status, 200);
  assert.equal((await orders((await next.json()).data.token)).status, 200);
  assert.equal(await verifyPassword('a', sqlite.prepare('SELECT password_hash FROM users').get().password_hash), true);
});

test('invalid current passwords, mismatched confirmation and invalid payloads never change the saved password', async (t) => {
  const { login, change, orders, request, sqlite } = setup(t);
  const token = (await (await login()).json()).data.token;
  const hash = sqlite.prepare('SELECT password_hash FROM users').get().password_hash;
  for (const body of [
    { current_password: 'wrong', new_password: 'b', confirm_password: 'b' },
    { current_password: 'initial-secret', new_password: 'b', confirm_password: 'c' },
    { current_password: 'initial-secret', new_password: '', confirm_password: '' },
    { current_password: 'initial-secret', new_password: 'x'.repeat(1025), confirm_password: 'x'.repeat(1025) },
    { current_password: 123, new_password: 'b', confirm_password: 'b' },
    {}, null, [],
  ]) assert.equal((await change(token, body)).status, 400);
  const malformed = await request('/api/admin/account/password', {
    method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(malformed.status, 400);
  assert.equal(sqlite.prepare('SELECT password_hash FROM users').get().password_hash, hash);
  assert.equal((await orders(token)).status, 200);
  assert.equal((await change('chef-secret', {})).status, 401);
  assert.equal((await request('/api/admin/account/password', { method: 'PATCH', body: '{}' })).status, 401);
});

test('spaces in passwords are preserved and no character complexity is required', async (t) => {
  const { login, change } = setup(t);
  const token = (await (await login()).json()).data.token;
  assert.equal((await change(token, { current_password: 'initial-secret', new_password: ' a ', confirm_password: ' a ' })).status, 200);
  assert.equal((await login('a')).status, 401);
  assert.equal((await login(' a ')).status, 200);
});

test('disabled or non-admin accounts cannot authenticate or fall back to the initial key', async (t) => {
  const { login, sqlite, orders, request } = setup(t);
  const token = (await (await login()).json()).data.token;
  sqlite.exec('UPDATE users SET active = 0');
  assert.equal((await login()).status, 401);
  assert.equal((await orders(token)).status, 401);
  assert.equal((await orders('initial-secret')).status, 401);
  sqlite.exec("UPDATE users SET active = 1, role = 'chef'");
  assert.equal((await login()).status, 401);
  assert.equal((await orders(token)).status, 401);
  assert.equal((await request('/api/chef/orders', { headers: { Authorization: 'Bearer chef-secret' } })).status, 401);
});

test('expired sessions and sessions signed with the wrong secret are rejected', async (t) => {
  const { login, sqlite, orders, env } = setup(t);
  await login();
  const user = sqlite.prepare('SELECT * FROM users').get();
  const wrong = await createAdminSession(user, 'wrong-secret');
  assert.equal((await orders(wrong)).status, 401);
  const now = Date.now();
  t.mock.method(Date, 'now', () => now - 13 * 60 * 60 * 1000);
  const expired = await createAdminSession(user, env.ADMIN_API_KEY);
  t.mock.restoreAll();
  assert.equal((await orders(expired)).status, 401);
});

test('existing admin rows use their saved password and malformed hashes fail closed', async (t) => {
  const { sqlite, login, orders } = setup(t);
  const hash = await hashPassword('saved');
  sqlite.prepare("INSERT INTO users (id, username, password_hash, role) VALUES ('existing', 'admin', ?, 'admin')").run(hash);
  assert.equal((await login('initial-secret')).status, 401);
  const response = await login('saved');
  assert.equal(response.status, 200);
  assert.equal((await orders((await response.json()).data.token)).status, 200);
  sqlite.exec("UPDATE users SET password_hash = 'invalid'");
  assert.equal((await login('saved')).status, 401);
});

const staffLogin = (request, scope, username, password) => request(`/api/auth/${scope}/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }),
});
const staffGet = (request, scope, token) => request(`/api/${scope}/orders`, { headers: { Authorization: `Bearer ${token}` } });

test('developer credentials work at both portals and either session can read and modify both roles', async (t) => {
  const { request, env, sqlite, change } = setup(t);
  sqlite.exec(`
    INSERT INTO products (id, product_code, name, price, station) VALUES (700, 'DEV-ITEM', 'Test', 100, 'kitchen');
    INSERT INTO orders (id, order_number, dining_mode, total_amount) VALUES ('dev-order', 'DEV-001', 'takeout', 100);
    INSERT INTO order_items (id, order_id, product_code, product_name, quantity, unit_price, line_total, station, kitchen_status)
    VALUES ('dev-item', 'dev-order', 'DEV-ITEM', 'Test', 1, 100, 100, 'kitchen', 'pending');
  `);
  for (const scope of ['admin', 'chef']) {
    const response = await staffLogin(request, scope, env.DEVELOPER_USERNAME, env.DEVELOPER_PASSWORD);
    assert.equal(response.status, 200);
    const token = (await response.json()).data.token;
    assert.equal((await staffGet(request, 'admin', token)).status, 200);
    assert.equal((await staffGet(request, 'chef', token)).status, 200);
    const finance = await request('/api/admin/finance/months', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(finance.status, 200);
    if (scope === 'admin') {
      const kitchen = await request('/api/chef/items/dev-item/status', {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ready', expected_status: 'pending' }),
      });
      assert.equal(kitchen.status, 200);
      assert.equal(sqlite.prepare("SELECT kitchen_status FROM order_items WHERE id = 'dev-item'").get().kitchen_status, 'ready');
    } else {
      const updated = await change(token, { current_password: env.DEVELOPER_PASSWORD, new_password: 'dev-next', confirm_password: 'dev-next' });
      assert.equal(updated.status, 200);
    }
  }
  const user = sqlite.prepare('SELECT * FROM users').get();
  assert.equal(user.role, 'developer');
  assert.notEqual(user.password_hash, env.DEVELOPER_PASSWORD);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1);
});

test('developer bootstrap requires both correct credentials and is never inferred from password alone', async (t) => {
  const { request, env, sqlite } = setup(t);
  for (const scope of ['admin', 'chef']) {
    for (const [username, password] of [
      [undefined, env.DEVELOPER_PASSWORD], ['unknown', env.DEVELOPER_PASSWORD],
      [env.DEVELOPER_USERNAME, 'wrong'], ['admin', env.DEVELOPER_PASSWORD], ['chef', env.DEVELOPER_PASSWORD],
    ]) assert.equal((await staffLogin(request, scope, username, password)).status, 401);
  }
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM users').get().count, 0);
  delete env.DEVELOPER_PASSWORD;
  assert.equal((await staffLogin(request, 'admin', env.DEVELOPER_USERNAME, 'developer-initial')).status, 401);
  env.DEVELOPER_PASSWORD = 'developer-initial';
  delete env.DEVELOPER_USERNAME;
  assert.equal((await staffLogin(request, 'chef', 'hidden-owner', env.DEVELOPER_PASSWORD)).status, 401);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM users').get().count, 0);
});

test('regular staff cannot cross roles, impersonate a developer, or modify its password', async (t) => {
  const { request, login, change, env, sqlite } = setup(t);
  const devResponse = await staffLogin(request, 'admin', env.DEVELOPER_USERNAME, env.DEVELOPER_PASSWORD);
  const devToken = (await devResponse.json()).data.token;
  const adminToken = (await (await login()).json()).data.token;
  const chefResponse = await staffLogin(request, 'chef', undefined, 'initial-secret');
  assert.equal(chefResponse.status, 200);
  const chefToken = (await chefResponse.json()).data.token;
  assert.equal((await staffGet(request, 'chef', chefToken)).status, 200);
  assert.equal((await staffGet(request, 'admin', chefToken)).status, 401);
  assert.equal((await staffGet(request, 'chef', adminToken)).status, 401);
  assert.equal((await staffLogin(request, 'chef', 'admin', 'initial-secret')).status, 200);
  const oldDevHash = sqlite.prepare("SELECT password_hash FROM users WHERE role = 'developer'").get().password_hash;
  const response = await change(adminToken, {
    current_password: 'initial-secret', new_password: 'regular-next', confirm_password: 'regular-next',
    id: sqlite.prepare("SELECT id FROM users WHERE role = 'developer'").get().id,
    username: env.DEVELOPER_USERNAME, role: 'developer',
  });
  assert.equal(response.status, 200);
  assert.equal(sqlite.prepare("SELECT password_hash FROM users WHERE role = 'developer'").get().password_hash, oldDevHash);
  assert.equal((await staffGet(request, 'admin', devToken)).status, 200);
  assert.equal((await staffGet(request, 'chef', devToken)).status, 200);
});

test('developer password changes revoke every portal session without changing normal admin credentials', async (t) => {
  const { request, login, env, change } = setup(t);
  const adminToken = (await (await login()).json()).data.token;
  const tokens = [];
  for (const scope of ['admin', 'chef']) {
    const response = await staffLogin(request, scope, env.DEVELOPER_USERNAME, env.DEVELOPER_PASSWORD);
    tokens.push((await response.json()).data.token);
  }
  assert.equal((await change(tokens[0], { current_password: env.DEVELOPER_PASSWORD, new_password: 'x', confirm_password: 'x' })).status, 200);
  for (const token of tokens) {
    for (const scope of ['admin', 'chef']) assert.equal((await staffGet(request, scope, token)).status, 401);
  }
  for (const scope of ['admin', 'chef']) {
    assert.equal((await staffLogin(request, scope, env.DEVELOPER_USERNAME, env.DEVELOPER_PASSWORD)).status, 401);
    const next = await staffLogin(request, scope, env.DEVELOPER_USERNAME, 'x');
    assert.equal(next.status, 200);
    assert.equal((await staffGet(request, scope, (await next.json()).data.token)).status, 200);
  }
  assert.equal((await staffGet(request, 'admin', adminToken)).status, 200);
  assert.equal((await login()).status, 200);
});

test('disabled developers cannot authenticate, use existing tokens, or be recreated from bootstrap secrets', async (t) => {
  const { request, env, sqlite } = setup(t);
  const response = await staffLogin(request, 'chef', env.DEVELOPER_USERNAME, env.DEVELOPER_PASSWORD);
  const token = (await response.json()).data.token;
  sqlite.exec("UPDATE users SET active = 0 WHERE role = 'developer'");
  for (const scope of ['admin', 'chef']) {
    assert.equal((await staffLogin(request, scope, env.DEVELOPER_USERNAME, env.DEVELOPER_PASSWORD)).status, 401);
    assert.equal((await staffGet(request, scope, token)).status, 401);
  }
  env.DEVELOPER_USERNAME = 'another-owner';
  assert.equal((await staffLogin(request, 'admin', env.DEVELOPER_USERNAME, env.DEVELOPER_PASSWORD)).status, 401);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1);
  assert.equal(sqlite.prepare('SELECT active FROM users').get().active, 0);
});

test('tampered developer sessions and role changes are rejected by both portals', async (t) => {
  const { request, env, sqlite } = setup(t);
  const response = await staffLogin(request, 'admin', env.DEVELOPER_USERNAME, env.DEVELOPER_PASSWORD);
  const token = (await response.json()).data.token;
  for (const scope of ['admin', 'chef']) assert.equal((await staffGet(request, scope, token + 'x')).status, 401);
  sqlite.exec("UPDATE users SET role = 'admin' WHERE role = 'developer'");
  for (const scope of ['admin', 'chef']) assert.equal((await staffGet(request, scope, token)).status, 401);
});

test('developer migration preserves existing accounts and enforces one developer', (t) => {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  sqlite.exec(readFileSync(new URL('../migrations/0006_create_users.sql', import.meta.url), 'utf8'));
  sqlite.exec("INSERT INTO users (id, username, password_hash, role, active, created_at, updated_at) VALUES ('old', 'admin', 'saved-hash', 'admin', 0, '2025-01-01', '2025-02-01')");
  const before = sqlite.prepare('SELECT * FROM users').all();
  sqlite.exec(readFileSync(new URL('../migrations/0007_add_developer_role.sql', import.meta.url), 'utf8'));
  assert.deepEqual(sqlite.prepare('SELECT * FROM users').all(), before);
  sqlite.exec("INSERT INTO users (id, username, password_hash, role) VALUES ('dev', 'owner', 'hash', 'developer')");
  assert.throws(() => sqlite.exec("INSERT INTO users (id, username, password_hash, role) VALUES ('dev2', 'owner2', 'hash', 'developer')"), /UNIQUE/);
  assert.throws(() => sqlite.exec("INSERT INTO users (id, username, password_hash, role) VALUES ('other', 'other', 'hash', 'invalid')"), /CHECK/);
});


test('chef can bootstrap the shared account and both portals use exactly the same password', async (t) => {
  const { request, sqlite, login } = setup(t);
  assert.equal((await staffLogin(request, 'chef', undefined, 'chef-secret')).status, 401);
  const chef = await staffLogin(request, 'chef', undefined, 'initial-secret');
  assert.equal(chef.status, 200);
  const chefToken = (await chef.json()).data.token;
  assert.equal(sqlite.prepare('SELECT username FROM users').get().username, 'admin');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1);
  const admin = await login();
  assert.equal(admin.status, 200);
  const adminToken = (await admin.json()).data.token;
  assert.equal((await staffGet(request, 'chef', chefToken)).status, 200);
  assert.equal((await staffGet(request, 'admin', chefToken)).status, 401);
  assert.equal((await staffGet(request, 'admin', adminToken)).status, 200);
  assert.equal((await staffGet(request, 'chef', adminToken)).status, 401);
  for (const scope of ['admin', 'chef']) {
    for (const raw of ['initial-secret', 'chef-secret']) assert.equal((await staffGet(request, scope, raw)).status, 401);
  }
});

test('changing the shared password invalidates both normal sessions and updates both portal logins', async (t) => {
  const { request, login, change } = setup(t);
  const adminToken = (await (await login()).json()).data.token;
  const chefToken = (await (await staffLogin(request, 'chef', undefined, 'initial-secret')).json()).data.token;
  assert.equal((await change(adminToken, { current_password: 'initial-secret', new_password: 'shared-next', confirm_password: 'shared-next' })).status, 200);
  assert.equal((await staffGet(request, 'admin', adminToken)).status, 401);
  assert.equal((await staffGet(request, 'chef', chefToken)).status, 401);
  for (const scope of ['admin', 'chef']) {
    assert.equal((await staffLogin(request, scope, undefined, 'initial-secret')).status, 401);
    assert.equal((await staffLogin(request, scope, undefined, 'chef-secret')).status, 401);
    const response = await staffLogin(request, scope, undefined, 'shared-next');
    assert.equal(response.status, 200);
    assert.equal((await staffGet(request, scope, (await response.json()).data.token)).status, 200);
  }
});

test('developer can use the existing password field with username:password and no username field', async (t) => {
  const { request, env, sqlite } = setup(t);
  for (const scope of ['admin', 'chef']) {
    for (const input of ['unknown:' + env.DEVELOPER_PASSWORD, env.DEVELOPER_USERNAME + ':wrong', env.DEVELOPER_PASSWORD]) {
      assert.equal((await staffLogin(request, scope, undefined, input)).status, 401);
    }
    const response = await staffLogin(request, scope, undefined, env.DEVELOPER_USERNAME + ':' + env.DEVELOPER_PASSWORD);
    assert.equal(response.status, 200);
    const token = (await response.json()).data.token;
    for (const target of ['admin', 'chef']) assert.equal((await staffGet(request, target, token)).status, 200);
  }
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1);
  sqlite.exec("UPDATE users SET active = 0 WHERE role = 'developer'");
  assert.equal((await staffLogin(request, 'chef', undefined, env.DEVELOPER_USERNAME + ':' + env.DEVELOPER_PASSWORD)).status, 401);
});

test('shared passwords containing colons remain unchanged and developer passwords preserve all trailing colons', async (t) => {
  const { request, env, login, change } = setup(t);
  const adminToken = (await (await login()).json()).data.token;
  const shared = ' staff:password: ';
  assert.equal((await change(adminToken, { current_password: 'initial-secret', new_password: shared, confirm_password: shared })).status, 200);
  for (const scope of ['admin', 'chef']) {
    assert.equal((await staffLogin(request, scope, undefined, shared)).status, 200);
    assert.equal((await staffLogin(request, scope, undefined, shared.trim())).status, 401);
  }
  env.DEVELOPER_PASSWORD = ' dev:with:colons ';
  for (const scope of ['admin', 'chef']) {
    assert.equal((await staffLogin(request, scope, undefined, env.DEVELOPER_USERNAME + ':' + env.DEVELOPER_PASSWORD)).status, 200);
  }
});

test('normal chef sessions cannot change the shared password or forge an admin scope', async (t) => {
  const { request, change } = setup(t);
  const response = await staffLogin(request, 'chef', undefined, 'initial-secret');
  const token = (await response.json()).data.token;
  assert.equal((await change(token, { current_password: 'initial-secret', new_password: 'bad', confirm_password: 'bad' })).status, 401);
  const [payload, signature] = token.split('.');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  claims.scope = 'admin';
  const forged = Buffer.from(JSON.stringify(claims)).toString('base64url') + '.' + signature;
  assert.equal((await staffGet(request, 'admin', forged)).status, 401);
  assert.equal((await staffGet(request, 'chef', forged)).status, 401);
});
