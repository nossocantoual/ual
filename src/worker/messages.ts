import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

// Get default WhatsApp messages
app.get('/', async (c) => {
  const confirmedRow = await c.env.DB.prepare(
    'SELECT value FROM settings WHERE key = ?'
  ).bind('default_whatsapp_confirmed_message').first();
  
  const waitlistRow = await c.env.DB.prepare(
    'SELECT value FROM settings WHERE key = ?'
  ).bind('default_whatsapp_waitlist_message').first();
  
  const waitlistSecondaryRow = await c.env.DB.prepare(
    'SELECT value FROM settings WHERE key = ?'
  ).bind('default_whatsapp_waitlist_secondary_message').first();
  
  return c.json({
    confirmed: (confirmedRow as any)?.value || '',
    waitlist: (waitlistRow as any)?.value || '',
    waitlist_secondary: (waitlistSecondaryRow as any)?.value || '',
  }, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Save default WhatsApp messages
app.post('/', async (c) => {
  const body = await c.req.json();
  const { confirmed, waitlist, waitlist_secondary } = body;
  
  // Update or insert each message
  await c.env.DB.prepare(
    'INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, COALESCE((SELECT created_at FROM settings WHERE key = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)'
  ).bind('default_whatsapp_confirmed_message', confirmed || '', 'default_whatsapp_confirmed_message').run();
  
  await c.env.DB.prepare(
    'INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, COALESCE((SELECT created_at FROM settings WHERE key = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)'
  ).bind('default_whatsapp_waitlist_message', waitlist || '', 'default_whatsapp_waitlist_message').run();
  
  await c.env.DB.prepare(
    'INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, COALESCE((SELECT created_at FROM settings WHERE key = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)'
  ).bind('default_whatsapp_waitlist_secondary_message', waitlist_secondary || '', 'default_whatsapp_waitlist_secondary_message').run();
  
  return c.json({ success: true, message: 'Mensagens padrão salvas com sucesso!' }, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

export default app;
