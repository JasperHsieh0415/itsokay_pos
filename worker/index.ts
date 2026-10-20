
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'restaurant-pos'
  });
});

app.get('/api/menu', async (c) => {
  try {
    const { results } = await c.env.restaurant_pos_db
      .prepare(`
        SELECT id, name, price
        FROM products
        WHERE available = 1
        ORDER BY id
      `)
      .all();

    return c.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('D1 query failed:', error);

    return c.json({
      success: false,
      error: 'Database error'
    }, 500);
  }
});

export default app;

