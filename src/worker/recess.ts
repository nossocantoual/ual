import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>();

// Create or update recess
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { start_date, end_date, image_url, image_size, message, theme_mode, theme_color_1, theme_color_2, is_active } = body;

    // Always deactivate all existing recesses first
    await c.env.DB.prepare('UPDATE recess SET is_active = 0').run();

    // Only insert new recess if is_active is true
    if (is_active) {
      if (!start_date || !end_date) {
        return c.json({ success: false, error: 'Datas de início e fim são obrigatórias' }, 400);
      }

      // When activating recess, deactivate all active events
      await c.env.DB.prepare('UPDATE events SET is_active = 0').run();

      // Insert new recess
      await c.env.DB.prepare(
        `INSERT INTO recess (start_date, end_date, image_url, image_size, message, theme_mode, theme_color_1, theme_color_2, is_active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      )
        .bind(start_date, end_date, image_url || null, image_size || 256, message || 'Voltaremos em breve. Agradecemos a compreensão! 🙏', theme_mode || 'manual', theme_color_1, theme_color_2, 1)
        .run();
    }

    return c.json({ success: true, message: is_active ? 'Recesso ativado com sucesso' : 'Recesso desativado com sucesso' });
  } catch (error) {
    console.error('Error saving recess:', error);
    return c.json({ success: false, error: 'Erro ao salvar recesso' }, 500);
  }
});

// Get current recess (most recent, regardless of active status)
app.get('/current', async (c) => {
  try {
    const recess = await c.env.DB.prepare(
      `SELECT * FROM recess 
       ORDER BY created_at DESC
       LIMIT 1`
    ).first();

    if (!recess) {
      return c.json(null);
    }

    return c.json(recess);
  } catch (error) {
    console.error('Error fetching current recess:', error);
    return c.json(null);
  }
});

// Get active recess
app.get('/active', async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const recess = await c.env.DB.prepare(
      `SELECT * FROM recess 
       WHERE is_active = 1 
       AND start_date <= ? 
       AND end_date >= ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
      .bind(today, today)
      .first();

    if (!recess) {
      return c.json({ active: false });
    }

    return c.json({ active: true, recess });
  } catch (error) {
    console.error('Error fetching active recess:', error);
    return c.json({ active: false });
  }
});

// Deactivate all recesses (manual deactivation - does NOT activate any event)
app.post('/deactivate-all', async (c) => {
  try {
    // Deactivate all recesses - no automatic event activation
    await c.env.DB.prepare('UPDATE recess SET is_active = 0').run();
    return c.json({ success: true, message: 'Todos os recessos foram desativados' });
  } catch (error) {
    console.error('Error deactivating recesses:', error);
    return c.json({ success: false, error: 'Erro ao desativar recessos' }, 500);
  }
});

export default app;
