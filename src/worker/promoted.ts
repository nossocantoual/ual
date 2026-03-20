import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// Update promoted_from for a registration
app.post('/update-promoted-from', async (c) => {
  const { registration_id, promoted_from } = await c.req.json();
  
  if (!registration_id) {
    return c.json({ error: 'ID da inscrição é obrigatório' }, 400);
  }
  
  if (promoted_from && promoted_from !== 'waitlist' && promoted_from !== 'waitlist_secondary') {
    return c.json({ error: 'Valor de promoted_from inválido' }, 400);
  }
  
  // Update the registration
  await c.env.DB.prepare(
    'UPDATE registrations SET promoted_from = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(promoted_from || null, registration_id).run();
  
  return c.json({ success: true });
});

export default app;
