
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

export default app;

