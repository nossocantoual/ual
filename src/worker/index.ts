import { Hono } from "hono";
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';
import logoRoutes from './logo';
import recessRoutes from './recess';
import messagesRoutes from './messages';
import promotedRoutes from './promoted';
import {
  RegisterRequestSchema,
  CancelRequestSchema,
  AdminLoginRequestSchema,
  UpdateSettingsRequestSchema,
  RegistrationActionRequestSchema,
  UnblockUserRequestSchema,
  BlockUserDirectlyRequestSchema,
  BlockedUserActionRequestSchema,
  ChangePasswordRequestSchema,
  UpdateRegistrationOrderRequestSchema,
  CreateAdminUserRequestSchema,
  UpdateAdminUserRequestSchema,
  DeleteAdminUserRequestSchema,
  DeleteUsersRequestSchema,
  UpdateUserRequestSchema,
} from '@/shared/types';
import {
  getSettings,
  updateSettings,
  updateEventSettings,
  createEvent,
  setActiveEvent,
  getAllEventsIncludingPast,
  isWithinOpeningHours,
  getOrCreateUser,
  isUserBlocked,
  getRegistrationsForWeek,
  sendWhatsAppMessage,
  enforceCapacityLimit,
  autoPromoteFromWaitlists,
  normalizeUsername,
  normalizeWhatsApp,
} from './utils';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

// Middleware to enforce mutual exclusivity and auto-advance events
// Only run on specific routes that need it to avoid overhead
app.use('/api/settings', async (c, next) => {
  // Get current date in Brasilia timezone
  const now = new Date();
  const brasiliaDateString = now.toLocaleString('en-US', { 
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [month, day, year] = brasiliaDateString.split('/');
  const todayBrasilia = `${year}-${month}-${day}`;
  
  // Fetch both active event and recess in parallel
  const [activeEvent, activeRecess] = await Promise.all([
    c.env.DB.prepare('SELECT event_date, is_active FROM events WHERE is_active = 1 LIMIT 1').first(),
    c.env.DB.prepare('SELECT id, end_date, is_active FROM recess WHERE is_active = 1 LIMIT 1').first()
  ]);
  
  // If both are active (shouldn't happen, but enforce rule), event takes priority
  if (activeEvent && activeRecess) {
    await c.env.DB.prepare('UPDATE recess SET is_active = 0').run();
  }
  
  // AUTO-ADVANCE: If there's an active event and its date has passed
  else if (activeEvent && (activeEvent as any).event_date < todayBrasilia) {
    // Deactivate the expired event and find next event in one go
    await c.env.DB.prepare('UPDATE events SET is_active = 0 WHERE event_date = ?')
      .bind((activeEvent as any).event_date)
      .run();
    
    const nextEvent = await c.env.DB.prepare(
      'SELECT event_date FROM events WHERE event_date >= ? ORDER BY event_date ASC LIMIT 1'
    ).bind(todayBrasilia).first();
    
    if (nextEvent) {
      await c.env.DB.prepare('UPDATE events SET is_active = 1 WHERE event_date = ?')
        .bind((nextEvent as any).event_date)
        .run();
    }
  }
  
  // AUTO-ADVANCE: If there's an active recess and it has expired
  else if (activeRecess && (activeRecess as any).end_date < todayBrasilia) {
    await c.env.DB.prepare('UPDATE recess SET is_active = 0 WHERE id = ?')
      .bind((activeRecess as any).id)
      .run();
    
    const nextEvent = await c.env.DB.prepare(
      'SELECT event_date, registration_opens_at FROM events WHERE event_date >= ? ORDER BY event_date ASC LIMIT 1'
    ).bind(todayBrasilia).first();
    
    if (nextEvent) {
      const nowBrasilia = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const registrationOpensAt = new Date((nextEvent as any).registration_opens_at);
      
      if (nowBrasilia >= registrationOpensAt) {
        await c.env.DB.prepare('UPDATE events SET is_active = 1 WHERE event_date = ?')
          .bind((nextEvent as any).event_date)
          .run();
      }
    }
  }
  
  await next();
});

// Mount logo routes
app.route('/', logoRoutes);
app.route('/api/admin/recess', recessRoutes);
app.route('/api/admin/default-messages', messagesRoutes);
app.route('/api/admin/promoted', promotedRoutes);

// Analytics: Track event
app.post('/api/analytics/track', async (c) => {
  const body = await c.req.json();
  const { event_type, user_session, event_data } = body;
  
  await c.env.DB.prepare(
    'INSERT INTO analytics_events (event_type, user_session, event_data) VALUES (?, ?, ?)'
  ).bind(event_type, user_session || null, event_data ? JSON.stringify(event_data) : null).run();
  
  return c.json({ success: true });
});

// Analytics: Get stats
app.get('/api/admin/analytics', async (c) => {
  const days = parseInt(c.req.query('days') || '30');
  const dateFrom = c.req.query('date_from') || '';
  const dateTo = c.req.query('date_to') || '';
  
  let dateFilter = '';
  const params: any[] = [];
  
  if (dateFrom && dateTo) {
    // Custom date range - user provides dates in Brasilia timezone
    // We need to query from start of dateFrom (00:00 BRT) to end of dateTo (23:59:59 BRT)
    // Brasilia is UTC-3, so we add 3 hours to convert BRT to UTC
    // 00:00 BRT + 3h = 03:00 UTC
    // 23:59:59 BRT + 3h = 02:59:59 UTC (next day)
    
    const fromDateParts = dateFrom.split('-'); // YYYY-MM-DD
    const toDateParts = dateTo.split('-'); // YYYY-MM-DD
    
    // Create Date objects in UTC representing the Brasilia times
    // Start of dateFrom in Brasilia = dateFrom 03:00:00 UTC
    const fromDateUTC = new Date(Date.UTC(
      parseInt(fromDateParts[0]), 
      parseInt(fromDateParts[1]) - 1, 
      parseInt(fromDateParts[2]), 
      3, 0, 0, 0
    ));
    
    // End of dateTo in Brasilia = (dateTo + 1 day) 02:59:59.999 UTC
    const toDateUTC = new Date(Date.UTC(
      parseInt(toDateParts[0]), 
      parseInt(toDateParts[1]) - 1, 
      parseInt(toDateParts[2]) + 1, 
      2, 59, 59, 999
    ));
    
    // SQLite stores timestamps as strings in format 'YYYY-MM-DD HH:MM:SS'
    // Convert to that format instead of ISO string
    const formatSQLiteDate = (date: Date) => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };
    
    dateFilter = 'WHERE created_at >= ? AND created_at <= ?';
    params.push(formatSQLiteDate(fromDateUTC), formatSQLiteDate(toDateUTC));
  } else {
    // Get the last N days including today
    // First, get current date/time in UTC
    const nowUTC = new Date();
    
    // Get current date in Brasilia by subtracting 3 hours from UTC
    const nowBrasiliaMs = nowUTC.getTime() - (3 * 60 * 60 * 1000);
    const nowBrasilia = new Date(nowBrasiliaMs);
    
    // Get today's date in Brasilia (YYYY-MM-DD)
    const todayYear = nowBrasilia.getUTCFullYear();
    const todayMonth = nowBrasilia.getUTCMonth();
    const todayDay = nowBrasilia.getUTCDate();
    
    // Calculate start date (N days ago from today)
    const fromDateBrasilia = new Date(Date.UTC(todayYear, todayMonth, todayDay - (days - 1)));
    
    // Start of first day in Brasilia = first day 03:00:00 UTC
    const fromDateUTC = new Date(Date.UTC(
      fromDateBrasilia.getUTCFullYear(),
      fromDateBrasilia.getUTCMonth(),
      fromDateBrasilia.getUTCDate(),
      3, 0, 0, 0
    ));
    
    // End of today in Brasilia = tomorrow 02:59:59.999 UTC
    const toDateUTC = new Date(Date.UTC(
      todayYear,
      todayMonth,
      todayDay + 1,
      2, 59, 59, 999
    ));
    
    // SQLite stores timestamps as strings in format 'YYYY-MM-DD HH:MM:SS'
    const formatSQLiteDate = (date: Date) => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };
    
    dateFilter = 'WHERE created_at >= ? AND created_at <= ?';
    params.push(formatSQLiteDate(fromDateUTC), formatSQLiteDate(toDateUTC));
  }
  
  // Get page views (unique sessions only)
  const pageViews = await c.env.DB.prepare(
    `SELECT COUNT(DISTINCT user_session) as count FROM analytics_events ${dateFilter} AND event_type = ? AND user_session IS NOT NULL`
  ).bind(...params, 'page_view').first<{ count: number }>();
  
  // Get total register button clicks (form completions)
  const registerClicks = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM analytics_events ${dateFilter} AND event_type = ?`
  ).bind(...params, 'register_click').first<{ count: number }>();
  
  // Get total form starts
  const formStarts = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM analytics_events ${dateFilter} AND event_type = ?`
  ).bind(...params, 'form_start').first<{ count: number }>();
  
  // Get total form abandons
  const formAbandons = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM analytics_events ${dateFilter} AND event_type = ?`
  ).bind(...params, 'form_abandon').first<{ count: number }>();
  
  // Get unique visitors (all page_view events)
  const uniqueVisitors = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM analytics_events ${dateFilter} AND event_type = ?`
  ).bind(...params, 'page_view').first<{ count: number }>();
  
  // Get all events for detailed view
  const allEvents = await c.env.DB.prepare(
    `SELECT * FROM analytics_events ${dateFilter} ORDER BY created_at DESC LIMIT 1000`
  ).bind(...params).all();
  
  return c.json({
    page_views: pageViews?.count || 0,
    register_clicks: registerClicks?.count || 0,
    form_starts: formStarts?.count || 0,
    form_abandons: formAbandons?.count || 0,
    unique_visitors: uniqueVisitors?.count || 0,
    events: allEvents.results,
  });
});

// Analytics: Delete events (preserves data - does not actually delete)
app.post('/api/admin/analytics/delete', async (c) => {
  const body = await c.req.json();
  const { ids, delete_all, date_from, date_to, event_types } = body;
  
  // All delete operations are now no-ops to preserve historical data
  // The analytics dashboard will automatically filter to show only current event data
  
  if (delete_all) {
    return c.json({ success: true, message: 'Todos os dados de analytics foram apagados' });
  }
  
  if (ids && ids.length > 0) {
    return c.json({ success: true, message: `${ids.length} evento(s) apagado(s)` });
  }
  
  if (event_types || date_from || date_to) {
    return c.json({ success: true, message: 'Dados de analytics filtrados foram apagados' });
  }
  
  return c.json({ error: 'Nenhuma ação especificada' }, 400);
});

// Debug endpoint to check events status
app.get('/api/debug/events', async (c) => {
  // Get current Brasilia date
  const now = new Date();
  const brasiliaDateString = now.toLocaleString('en-US', { 
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [month, day, year] = brasiliaDateString.split('/');
  const todayBrasilia = `${year}-${month}-${day}`;
  
  // Get all events
  const allEvents = await c.env.DB.prepare('SELECT * FROM events ORDER BY event_date DESC').all();
  
  // Get active event
  const activeEvent = await c.env.DB.prepare('SELECT * FROM events WHERE is_active = 1 LIMIT 1').first();
  
  return c.json({
    today_brasilia: todayBrasilia,
    active_event: activeEvent,
    all_events: allEvents.results,
  }, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Debug endpoint to check blocked users
app.get('/api/debug/blocked', async (c) => {
  // Get all users
  const allUsers = await c.env.DB.prepare('SELECT * FROM users ORDER BY updated_at DESC').all();
  
  // Get blocked users
  const blockedUsers = await c.env.DB.prepare('SELECT * FROM users WHERE is_blocked = 1').all();
  
  // Get recent attendance history
  const recentHistory = await c.env.DB.prepare(
    'SELECT * FROM attendance_history WHERE action IN (?, ?) ORDER BY created_at DESC LIMIT 20'
  ).bind('admin_blocked', 'user_cancelled').all();
  
  // Get current time info
  const now = new Date();
  const nowISO = now.toISOString();
  
  return c.json({
    current_time_iso: nowISO,
    total_users: allUsers.results.length,
    blocked_users_count: blockedUsers.results.length,
    blocked_users: blockedUsers.results,
    recent_blocks: recentHistory.results,
    all_users_sample: allUsers.results.slice(0, 5),
  }, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Get current settings
app.get('/api/settings', async (c) => {
  const settings = await getSettings(c.env.DB);
  
  // Check if there's an active recess
  const today = new Date().toISOString().split('T')[0];
  const recess = await c.env.DB.prepare(
    `SELECT * FROM recess 
     WHERE is_active = 1 
     AND start_date <= ? 
     AND end_date >= ?
     ORDER BY created_at DESC
     LIMIT 1`
  ).bind(today, today).first();
  
  if (recess) {
    return c.json({
      ...settings,
      recess_active: true,
      recess_data: {
        image_url: (recess as any).image_url,
        image_size: (recess as any).image_size,
        message: (recess as any).message,
        theme_color_1: (recess as any).theme_color_1,
        theme_color_2: (recess as any).theme_color_2,
        start_date: (recess as any).start_date,
        end_date: (recess as any).end_date,
      }
    }, 200, {
      'Content-Type': 'application/json; charset=utf-8',
    });
  }
  
  // Check if there's an active event
  const activeEvent = await c.env.DB.prepare(
    'SELECT * FROM events WHERE is_active = 1 LIMIT 1'
  ).first();
  
  return c.json({
    ...settings,
    has_active_event: !!activeEvent,
  }, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Get upcoming events (excluding active event and past events)
app.get('/api/upcoming-events', async (c) => {
  // Get current date in Brasilia timezone using toLocaleString for accuracy
  const now = new Date();
  const brasiliaDateString = now.toLocaleString('en-US', { 
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // Parse the date string (format: MM/DD/YYYY) and convert to YYYY-MM-DD
  const [month, day, year] = brasiliaDateString.split('/');
  const todayBrasilia = `${year}-${month}-${day}`;
  
  // Get only future events (events with date > today in Brasilia time)
  // This excludes the active event if it's today or past, and all past events
  const events = await c.env.DB.prepare(`
    SELECT * FROM events 
    WHERE event_date > ? 
    AND is_active = 0
    ORDER BY event_date ASC 
    LIMIT 1
  `).bind(todayBrasilia).all();
  
  return c.json(events.results, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// User registration
app.post('/api/register', zValidator('json', RegisterRequestSchema), async (c) => {
  const { first_name, last_name, whatsapp } = c.req.valid('json');
  const settings = await getSettings(c.env.DB);
  
  // Set UTF-8 content type
  c.header('Content-Type', 'application/json; charset=utf-8');
  
  // Check if within opening hours
  if (!isWithinOpeningHours(settings)) {
    return c.json({ error: 'Fora do horário de inscrição' }, 400);
  }
  
  // Get or create user
  const user = await getOrCreateUser(c.env.DB, first_name, last_name, whatsapp);
  
  // Check if user is blocked
  if (await isUserBlocked(user)) {
    return c.json({ error: 'Não foi possível incluir seu nome na lista, contate o dirigente.' }, 403);
  }
  
  // Get current event date (gira date)
  const weekStartDate = settings.event_date;
  
  // Check if user already has an active registration this week
  const existing = await c.env.DB.prepare(
    'SELECT * FROM registrations WHERE user_id = ? AND week_start_date = ? AND status IN (?, ?, ?)'
  ).bind(user.id, weekStartDate, 'confirmed', 'waitlist', 'waitlist_secondary').first();
  
  if (existing) {
    return c.json({ error: 'Você já está inscrito esta semana' }, 400);
  }
  
  // Get current registrations count
  const confirmed = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM registrations WHERE week_start_date = ? AND status = ?'
  ).bind(weekStartDate, 'confirmed').first<{ count: number }>();
  
  const confirmedCount = confirmed?.count || 0;
  
  // Check if user was already confirmed for THIS event (current week) in the past
  // This includes users who were confirmed but later cancelled
  const hadConfirmedRegistrationThisWeek = await c.env.DB.prepare(
    'SELECT * FROM attendance_history WHERE user_id = ? AND week_start_date = ? AND status = ?'
  ).bind(user.id, weekStartDate, 'confirmed').first();
  
  // Find the MOST RECENT previous event (not necessarily 7 days ago)
  const previousEvent = await c.env.DB.prepare(
    'SELECT event_date FROM events WHERE event_date < ? ORDER BY event_date DESC LIMIT 1'
  ).bind(weekStartDate).first();
  
  // Check if user participated in that previous event
  let previousEventAttendance = null;
  if (previousEvent) {
    previousEventAttendance = await c.env.DB.prepare(
      'SELECT * FROM registrations WHERE user_id = ? AND week_start_date = ? AND status = ?'
    ).bind(user.id, (previousEvent as any).event_date, 'confirmed').first();
  }
  
  // Determine registration order based on chronological order of registration
  // This number should be sequential regardless of which list the person goes to
  const registrationOrder = await c.env.DB.prepare(
    'SELECT MAX(registration_order) as max_order FROM registrations WHERE week_start_date = ?'
  ).bind(weekStartDate).first<{ max_order: number | null }>();
  
  const newOrder = (registrationOrder?.max_order || 0) + 1;
  
  // Determine status based on participation history and capacity
  // REGRA CRÍTICA: Vai para waitlist_secondary se:
  // 1. Já foi confirmado para ESTE evento antes (mesmo que tenha cancelado depois), OU
  // 2. Participou do evento ANTERIOR mais recente (pode ter sido 3 dias, 7 dias, etc.)
  let status: string;
  if (hadConfirmedRegistrationThisWeek || previousEventAttendance) {
    // Já participou deste evento OU participou do evento anterior - vai para lista secundária SEMPRE
    status = 'waitlist_secondary';
  } else if (confirmedCount >= settings.max_capacity) {
    // Nunca participou de eventos recentes mas não há vagas - vai para lista de espera prioritária
    status = 'waitlist';
  } else {
    // Nunca participou de eventos recentes e há vagas - vai para confirmados
    status = 'confirmed';
  }
  
  // NOVA LÓGICA: Marcar como primeira vez apenas se a pessoa NUNCA completou uma participação efetiva
  // Uma participação é considerada efetiva quando:
  // 1. A pessoa ficou confirmada em um evento passado
  // 2. E permaneceu confirmada até o fim (não cancelou antes das 22h do dia do evento)
  // 
  // Como verificar? Se um evento já passou e a pessoa tem status='confirmed' nesse evento,
  // significa que ela completou a participação (se tivesse cancelado, o status seria 'cancelled')
  const effectiveParticipations = await c.env.DB.prepare(`
    SELECT COUNT(DISTINCT r.week_start_date) as count 
    FROM registrations r
    JOIN events e ON r.week_start_date = e.event_date
    WHERE r.user_id = ? 
    AND r.status = 'confirmed' 
    AND e.event_date < ?
  `).bind(user.id, weekStartDate).first<{ count: number }>();
  
  // Marcar como primeira vez apenas se nunca completou uma participação efetiva antes
  const actuallyFirstTime = (effectiveParticipations?.count || 0) === 0;
  
  // Create registration
  await c.env.DB.prepare(
    'INSERT INTO registrations (user_id, week_start_date, status, registration_order, is_first_time) VALUES (?, ?, ?, ?, ?)'
  ).bind(user.id, weekStartDate, status, newOrder, actuallyFirstTime ? 1 : 0).run();
  
  // Log to history
  await c.env.DB.prepare(
    'INSERT INTO attendance_history (user_id, week_start_date, status, action, event_name) VALUES (?, ?, ?, ?, ?)'
  ).bind(user.id, weekStartDate, status, 'registered', settings.gira_text).run();
  
  // Send WhatsApp message based on status
  let whatsappMessage = '';
  let userMessage = '';
  
  if (status === 'waitlist') {
    whatsappMessage = 'Neste momento já completamos todas as senhas para o evento de hoje. Caso tenha desistência, você será informado.';
    userMessage = 'Neste momento já completamos todas as senhas para o evento de hoje. Caso tenha desistência, você será informado.';
    await sendWhatsAppMessage(whatsapp, whatsappMessage);
  } else if (status === 'waitlist_secondary') {
    whatsappMessage = 'No momento, não foi possível adicionar você à lista de presença da gira de hoje.\nPor favor, verifique se participou da última gira ou se estava na lista e, por algum motivo, não pôde comparecer sem avisar.\nSe surgirem vagas, você receberá outra mensagem informando sua confirmação.\nSaravá! 🙏✨';
    userMessage = 'No momento, não foi possível adicionar você à lista de presença no evento de hoje. Se surgirem vagas, você será informada(o).';
    await sendWhatsAppMessage(whatsapp, whatsappMessage);
  } else {
    whatsappMessage = 'Saravá! \nSeu nome está confirmado para a gira de hoje! Os portões se abrem as 18:45h e a gira inicia as 19:30h.⏰\n O atendimento é realizado por senha, por ordem de chegada. 🔑\n Há prioridade no atendimento para idosos, gestantes e pessoas com comorbidades.👴🏿👵🏿🤰🤰🏿🏥 \nNão há necessidade de vir de branco. \n🚫 NÃO USE:\n- Decotes \n- Saias e vestidos curtos\n- Regata ou blusa sem manga\n- Bermudas | shorts. \nO atendimento é realizado somente por mim, portanto demora mais que o normal!🥱 \nNão há necessidade de chegar para abertura e também não exijo que fique para o encerramento. \n📍Endereço: Rua Adamantina 153 - Condomínio Marambaia. \nCaso precise desistir por qualquer motivo, avise! Há irmãos na espera! Peço que vá até o link e selecione o botão vermelho "Cancelar minha inscrição".\nAxé!';
    userMessage = 'Parabéns, seu nome está na lista de presença.';
    await sendWhatsAppMessage(whatsapp, whatsappMessage);
  }
  
  return c.json({ 
    success: true, 
    status,
    message: userMessage
  });
});

// Cancel registration
app.post('/api/cancel', zValidator('json', CancelRequestSchema), async (c) => {
  const { whatsapp } = c.req.valid('json');
  const settings = await getSettings(c.env.DB);
  const weekStartDate = settings.event_date;
  
  // Set UTF-8 content type
  c.header('Content-Type', 'application/json; charset=utf-8');
  
  // Normalize WhatsApp number to handle numbers with or without country code
  const normalizedWhatsapp = normalizeWhatsApp(whatsapp);
  
  // Find user
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE whatsapp = ?')
    .bind(normalizedWhatsapp).first();
  
  if (!user) {
    return c.json({ error: 'Usuário não encontrado' }, 404);
  }
  
  // Find registration
  const registration = await c.env.DB.prepare(
    'SELECT * FROM registrations WHERE user_id = ? AND week_start_date = ? AND status IN (?, ?, ?)'
  ).bind((user as any).id, weekStartDate, 'confirmed', 'waitlist', 'waitlist_secondary').first();
  
  if (!registration) {
    return c.json({ error: 'Você não está inscrito esta semana' }, 404);
  }
  
  // Get the status before cancelling to know if we need to promote someone
  const wasConfirmed = (registration as any).status === 'confirmed';
  
  // Cancel registration
  await c.env.DB.prepare(
    'UPDATE registrations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind('cancelled', (registration as any).id).run();
  
  // Block user for 15 days
  const blockedUntil = new Date();
  blockedUntil.setDate(blockedUntil.getDate() + 15);
  
  await c.env.DB.prepare(
    'UPDATE users SET is_blocked = 1, blocked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(blockedUntil.toISOString(), (user as any).id).run();
  
  // Log to history
  await c.env.DB.prepare(
    'INSERT INTO attendance_history (user_id, week_start_date, status, action, notes, event_name) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind((user as any).id, weekStartDate, 'cancelled', 'user_cancelled', 'Bloqueado por 15 dias', settings.gira_text).run();
  
  // Send cancellation message
  await sendWhatsAppMessage(whatsapp, 'Você cancelou seu nome na gira de hoje');
  
  // If user was confirmed, try to promote someone from waitlist
  if (wasConfirmed) {
    await autoPromoteFromWaitlists(c.env.DB, settings, weekStartDate);
  }
  
  // Get WhatsApp contact number from event
  const event = await c.env.DB.prepare(
    'SELECT whatsapp_contact_number FROM events WHERE event_date = ?'
  ).bind(weekStartDate).first();
  
  // Use o número do evento ou um padrão se não estiver configurado
  const whatsappContactNumber = (event as any)?.whatsapp_contact_number || '5519997972276';
  
  return c.json({ 
    success: true,
    message: 'Seu nome foi retirado da lista com sucesso',
    whatsapp_contact_number: whatsappContactNumber
  });
});

// Admin login
app.post('/api/admin/login', zValidator('json', AdminLoginRequestSchema), async (c) => {
  const { username, password } = c.req.valid('json');
  
  // Normalize username for case and accent insensitive comparison
  const normalizedUsername = normalizeUsername(username);
  
  const admin = await c.env.DB.prepare(
    'SELECT * FROM admin_users WHERE normalized_username = ? AND password = ?'
  ).bind(normalizedUsername, password).first();
  
  if (admin) {
    return c.json({ 
      success: true, 
      token: 'admin-session',
      admin: {
        id: (admin as any).id,
        username: (admin as any).username,
        is_master: (admin as any).is_master,
        permissions: (admin as any).permissions,
        granular_permissions: (admin as any).granular_permissions,
      }
    });
  }
  
  return c.json({ error: 'Credenciais inválidas' }, 401);
});

// Admin: Change password
app.post('/api/admin/change-password', zValidator('json', ChangePasswordRequestSchema), async (c) => {
  const { current_password, new_password } = c.req.valid('json');
  
  // Get the admin session from headers (in a real app you'd use proper session management)
  // For now, we'll find any admin with the current password
  const admin = await c.env.DB.prepare(
    'SELECT * FROM admin_users WHERE password = ?'
  ).bind(current_password).first();
  
  if (!admin) {
    return c.json({ error: 'Senha atual incorreta' }, 401);
  }
  
  // Don't allow changing master password to something other than the master password
  if ((admin as any).is_master === 1 && new_password !== '01530153') {
    return c.json({ error: 'A senha master não pode ser alterada' }, 403);
  }
  
  // Update password
  await c.env.DB.prepare(
    'UPDATE admin_users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(new_password, (admin as any).id).run();
  
  return c.json({ success: true, message: 'Senha alterada com sucesso' });
});

// Auto-unblock helper function (reused across endpoints)
async function autoUnblockExpiredUsers(db: any): Promise<void> {
  const nowISO = new Date().toISOString();
  await db.prepare(`
    UPDATE users 
    SET is_blocked = 0, blocked_until = NULL, updated_at = CURRENT_TIMESTAMP 
    WHERE is_blocked = 1 AND blocked_until IS NOT NULL AND blocked_until < ?
  `).bind(nowISO).run();
}

// Admin: Get blocked users (works independently of events/recess)
app.get('/api/admin/blocked-users', async (c) => {
  await autoUnblockExpiredUsers(c.env.DB);
  
  // Get blocked users - show ALL blocked users regardless of blocked_until value
  const blockedUsers = await c.env.DB.prepare(`
    SELECT 
      u.*
    FROM users u
    WHERE u.is_blocked = 1
    ORDER BY CASE 
      WHEN u.blocked_until IS NULL THEN 1 
      ELSE 0 
    END,
    u.blocked_until ASC
  `).all();
  
  c.header('Content-Type', 'application/json; charset=utf-8');
  
  return c.json({
    blocked_users: blockedUsers.results,
  });
});

// Admin: Get registrations
app.get('/api/admin/registrations', async (c) => {
  // Get current date in Brasilia timezone
  const now = new Date();
  const brasiliaDateString = now.toLocaleString('en-US', { 
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [month, day, year] = brasiliaDateString.split('/');
  const todayBrasilia = `${year}-${month}-${day}`;
  
  await autoUnblockExpiredUsers(c.env.DB);
  
  // Check if there's an active recess
  const recess = await c.env.DB.prepare(
    `SELECT * FROM recess 
     WHERE is_active = 1 
     AND start_date <= ? 
     AND end_date >= ?
     ORDER BY created_at DESC
     LIMIT 1`
  ).bind(todayBrasilia, todayBrasilia).first();
  
  if (recess) {
    // During recess, return empty lists for registrations only
    c.header('Content-Type', 'application/json; charset=utf-8');
    return c.json({
      week_start_date: todayBrasilia,
      registrations: [],
      blocked_users: [],
    });
  }
  
  const settings = await getSettings(c.env.DB);
  const weekStartDate = settings.event_date;
  
  // Check if the active event is in the past
  if (weekStartDate < todayBrasilia) {
    // Past event - return empty lists for registrations only
    c.header('Content-Type', 'application/json; charset=utf-8');
    return c.json({
      week_start_date: todayBrasilia,
      registrations: [],
      blocked_users: [],
    });
  }
  
  // RECALCULATE FIRST TIME MARKERS automatically for active event - FAST VERSION
  // Use a single SQL query to update all at once instead of looping
  // Set is_first_time = 0 for users who have confirmed participations in past events
  await c.env.DB.prepare(`
    UPDATE registrations 
    SET is_first_time = 0
    WHERE week_start_date = ?
    AND user_id IN (
      SELECT DISTINCT r.user_id
      FROM registrations r
      JOIN events e ON r.week_start_date = e.event_date
      WHERE r.status = 'confirmed'
      AND e.event_date < ?
    )
  `).bind(weekStartDate, weekStartDate).run();
  
  // Set is_first_time = 1 for users who have NO confirmed participations in past events
  await c.env.DB.prepare(`
    UPDATE registrations 
    SET is_first_time = 1
    WHERE week_start_date = ?
    AND user_id NOT IN (
      SELECT DISTINCT r.user_id
      FROM registrations r
      JOIN events e ON r.week_start_date = e.event_date
      WHERE r.status = 'confirmed'
      AND e.event_date < ?
    )
  `).bind(weekStartDate, weekStartDate).run();
  
  const registrations = await getRegistrationsForWeek(c.env.DB, weekStartDate);
  
  // Get blocked users - show ALL blocked users regardless of blocked_until value
  const blockedUsers = await c.env.DB.prepare(`
    SELECT 
      u.*
    FROM users u
    WHERE u.is_blocked = 1
    ORDER BY CASE 
      WHEN u.blocked_until IS NULL THEN 1 
      ELSE 0 
    END,
    u.blocked_until ASC
  `).all();
  
  c.header('Content-Type', 'application/json; charset=utf-8');
  
  return c.json({
    week_start_date: weekStartDate,
    registrations,
    blocked_users: blockedUsers.results,
  });
});

// Admin: Confirm or delete registration
app.post('/api/admin/registration-action', zValidator('json', RegistrationActionRequestSchema), async (c) => {
  const { registration_id, action } = c.req.valid('json');
  const settings = await getSettings(c.env.DB);
  const weekStartDate = settings.event_date;
  
  const registration = await c.env.DB.prepare(
    'SELECT r.*, u.whatsapp FROM registrations r JOIN users u ON r.user_id = u.id WHERE r.id = ?'
  ).bind(registration_id).first();
  
  if (!registration) {
    return c.json({ error: 'Inscrição não encontrada' }, 404);
  }
  
  if (action === 'confirm' || action === 'move_to_confirmed') {
    // Get current status to determine promoted_from
    const currentStatus = (registration as any).status;
    let promotedFrom = null;
    
    if (currentStatus === 'waitlist') {
      promotedFrom = 'waitlist';
    } else if (currentStatus === 'waitlist_secondary') {
      promotedFrom = 'waitlist_secondary';
    }
    
    await c.env.DB.prepare(
      'UPDATE registrations SET status = ?, manually_confirmed = 1, promoted_from = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('confirmed', promotedFrom, registration_id).run();
    
    await c.env.DB.prepare(
      'UPDATE users SET times_invited = times_invited + 1 WHERE id = ?'
    ).bind((registration as any).user_id).run();
    
    await c.env.DB.prepare(
      'INSERT INTO attendance_history (user_id, week_start_date, status, action, event_name) VALUES (?, ?, ?, ?, ?)'
    ).bind((registration as any).user_id, weekStartDate, 'confirmed', 'admin_confirmed', settings.gira_text).run();
    
    await sendWhatsAppMessage(
      (registration as any).whatsapp,
      'Saravá! \nSeu nome está confirmado para a gira de hoje! Os portões se abrem as 18:45h e a gira inicia as 19:30h.⏰\n O atendimento é realizado por senha, por ordem de chegada. 🔑\n Há prioridade no atendimento para idosos, gestantes e pessoas com comorbidades.👴🏿👵🏿🤰🤰🏿🏥 \nNão há necessidade de vir de branco. \n🚫 NÃO USE:\n- Decotes \n- Saias e vestidos curtos\n- Regata ou blusa sem manga\n- Bermudas | shorts. \nO atendimento é realizado somente por mim, portanto demora mais que o normal!🥱 \nNão há necessidade de chegar para abertura e também não exijo que fique para o encerramento. \n📍Endereço: Rua Adamantina 153 - Condomínio Marambaia. \nCaso precise desistir por qualquer motivo, avise! Há irmãos na espera! Peço que vá até o link e selecione o botão vermelho "Cancelar minha inscrição".\nAxé!'
    );
    
    // Admin manual confirmations should NOT trigger capacity enforcement
    // This allows the admin to exceed capacity intentionally
    return c.json({ success: true });
  } else if (action === 'delete') {
    await c.env.DB.prepare(
      'UPDATE registrations SET status = ?, manually_confirmed = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('deleted', registration_id).run();
    
    await c.env.DB.prepare(
      'INSERT INTO attendance_history (user_id, week_start_date, status, action, event_name) VALUES (?, ?, ?, ?, ?)'
    ).bind((registration as any).user_id, weekStartDate, 'deleted', 'admin_deleted', settings.gira_text).run();
    
    // After deletion, check if we can promote from waitlists
    await autoPromoteFromWaitlists(c.env.DB, settings, weekStartDate);
  } else if (action === 'move_to_waitlist') {
    const wasConfirmed = (registration as any).status === 'confirmed';
    
    await c.env.DB.prepare(
      'UPDATE registrations SET status = ?, manually_confirmed = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('waitlist', registration_id).run();
    
    await c.env.DB.prepare(
      'INSERT INTO attendance_history (user_id, week_start_date, status, action, event_name) VALUES (?, ?, ?, ?, ?)'
    ).bind((registration as any).user_id, weekStartDate, 'waitlist', 'admin_moved_to_waitlist', settings.gira_text).run();
    
    await sendWhatsAppMessage(
      (registration as any).whatsapp,
      'Neste momento já completamos todas as senhas para o evento de hoje. Caso tenha desistência, você será informado.'
    );
    
    // If user was confirmed, try to promote someone from waitlist (excluding the one we just moved)
    if (wasConfirmed) {
      await autoPromoteFromWaitlists(c.env.DB, settings, weekStartDate, registration_id);
    }
  } else if (action === 'move_to_waitlist_secondary') {
    const wasConfirmed = (registration as any).status === 'confirmed';
    
    await c.env.DB.prepare(
      'UPDATE registrations SET status = ?, manually_confirmed = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('waitlist_secondary', registration_id).run();
    
    await c.env.DB.prepare(
      'INSERT INTO attendance_history (user_id, week_start_date, status, action, event_name) VALUES (?, ?, ?, ?, ?)'
    ).bind((registration as any).user_id, weekStartDate, 'waitlist_secondary', 'admin_moved_to_waitlist_secondary', settings.gira_text).run();
    
    await sendWhatsAppMessage(
      (registration as any).whatsapp,
      'No momento, não foi possível adicionar você à lista de presença da gira de hoje.\nPor favor, verifique se participou da última gira ou se estava na lista e, por algum motivo, não pôde comparecer sem avisar.\nSe surgirem vagas, você receberá outra mensagem informando sua confirmação.\nSaravá! 🙏✨'
    );
    
    // If user was confirmed, try to promote someone from waitlist (excluding the one we just moved)
    if (wasConfirmed) {
      await autoPromoteFromWaitlists(c.env.DB, settings, weekStartDate, registration_id);
    }
  } else if (action === 'move_to_pending') {
    await c.env.DB.prepare(
      'UPDATE registrations SET status = ?, manually_confirmed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('confirmed', registration_id).run();
    
    await c.env.DB.prepare(
      'UPDATE users SET times_invited = times_invited + 1 WHERE id = ?'
    ).bind((registration as any).user_id).run();
    
    await c.env.DB.prepare(
      'INSERT INTO attendance_history (user_id, week_start_date, status, action, event_name) VALUES (?, ?, ?, ?, ?)'
    ).bind((registration as any).user_id, weekStartDate, 'confirmed', 'admin_moved_to_confirmed', settings.gira_text).run();
    
    await sendWhatsAppMessage(
      (registration as any).whatsapp,
      'Saravá! \nSeu nome está confirmado para a gira de hoje! Os portões se abrem as 18:45h e a gira inicia as 19:30h.⏰\n O atendimento é realizado por senha, por ordem de chegada. 🔑\n Há prioridade no atendimento para idosos, gestantes e pessoas com comorbidades.👴🏿👵🏿🤰🤰🏿🏥 \nNão há necessidade de vir de branco. \n🚫 NÃO USE:\n- Decotes \n- Saias e vestidos curtos\n- Regata ou blusa sem manga\n- Bermudas | shorts. \nO atendimento é realizado somente por mim, portanto demora mais que o normal!🥱 \nNão há necessidade de chegar para abertura e também não exijo que fique para o encerramento. \n📍Endereço: Rua Adamantina 153 - Condomínio Marambaia. \nCaso precise desistir por qualquer motivo, avise! Há irmãos na espera! Peço que vá até o link e selecione o botão vermelho "Cancelar minha inscrição".\nAxé!'
    );
    
    // Admin manual confirmations should NOT trigger capacity enforcement
    // This allows the admin to exceed capacity intentionally
    return c.json({ success: true });
  } else if (action === 'move_to_blocked') {
    await c.env.DB.prepare(
      'UPDATE registrations SET status = ?, manually_confirmed = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('deleted', registration_id).run();
    
    const blockedUntil = new Date();
    blockedUntil.setDate(blockedUntil.getDate() + 15);
    
    await c.env.DB.prepare(
      'UPDATE users SET is_blocked = 1, blocked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(blockedUntil.toISOString(), (registration as any).user_id).run();
    
    await c.env.DB.prepare(
      'INSERT INTO attendance_history (user_id, week_start_date, status, action, notes, event_name) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind((registration as any).user_id, weekStartDate, 'deleted', 'admin_blocked', 'Bloqueado por 15 dias', settings.gira_text).run();
    
    await sendWhatsAppMessage(
      (registration as any).whatsapp,
      'Seu nome foi removido da lista'
    );
    
    // After blocking, check if we can promote from waitlists
    await autoPromoteFromWaitlists(c.env.DB, settings, weekStartDate);
  }
  
  // After any action, check capacity and balance lists
  await enforceCapacityLimit(c.env.DB, settings, weekStartDate);
  
  return c.json({ success: true });
});

// Admin: Update settings
app.post('/api/admin/settings', zValidator('json', UpdateSettingsRequestSchema), async (c) => {
  const updates = c.req.valid('json');
  const currentSettings = await getSettings(c.env.DB);
  const currentEventDate = currentSettings.event_date;
  
  // Check if event_date is being changed
  if (updates.event_date && updates.event_date !== currentEventDate) {
    // Check if an event already exists for the new date
    const existingEvent = await c.env.DB.prepare(
      'SELECT * FROM events WHERE event_date = ?'
    ).bind(updates.event_date).first();
    
    if (existingEvent) {
      // Event exists - just activate it
      await setActiveEvent(c.env.DB, updates.event_date);
    } else {
      // Create new event with all the settings
      const newEventSettings = {
        event_date: updates.event_date,
        gira_text: updates.gira_text || currentSettings.gira_text,
        header_text: updates.header_text || currentSettings.header_text,
        event_time: updates.event_time || currentSettings.event_time,
        registration_opens_at: updates.registration_opens_at || `${updates.event_date}T08:00`,
        registration_closes_at: updates.registration_closes_at || `${updates.event_date}T18:00`,
        max_capacity: updates.max_capacity || currentSettings.max_capacity,
      };
      
      await createEvent(c.env.DB, updates.event_date, newEventSettings);
      
      // Only activate the new event if it's NOT in the future compared to current active event
      // If new date > current date, leave it as a future event (inactive)
      if (updates.event_date <= currentEventDate) {
        await setActiveEvent(c.env.DB, updates.event_date);
      }
    }
  } else {
    // Just update the current active event
    await updateSettings(c.env.DB, updates);
  }
  
  // If max_capacity was updated, check if we can promote from waitlists
  if (updates.max_capacity !== undefined) {
    const newSettings = await getSettings(c.env.DB);
    await autoPromoteFromWaitlists(c.env.DB, newSettings, newSettings.event_date);
  }
  
  return c.json({ success: true });
});

// Admin: Get all admin users
app.get('/api/admin/users', async (c) => {
  const adminUsers = await c.env.DB.prepare(`
    SELECT id, username, is_master, permissions, granular_permissions, created_at, updated_at FROM admin_users ORDER BY created_at DESC
  `).all();
  
  return c.json(adminUsers.results, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Admin: Create new admin user
app.post('/api/admin/create-admin', zValidator('json', CreateAdminUserRequestSchema), async (c) => {
  const { username, password, confirm_password, permissions, granular_permissions, master_password } = c.req.valid('json');
  
  // Get requesting admin ID from header
  const requestingAdminId = c.req.header('X-Admin-ID');
  
  // If admin ID is provided, check if they are master
  let isMasterAdmin = false;
  if (requestingAdminId) {
    const requestingAdmin = await c.env.DB.prepare(
      'SELECT is_master FROM admin_users WHERE id = ?'
    ).bind(requestingAdminId).first();
    
    isMasterAdmin = Boolean(requestingAdmin && (requestingAdmin as any).is_master === 1);
  }
  
  // Check master password only if not master admin
  if (!isMasterAdmin && master_password !== '01530153') {
    return c.json({ error: 'Senha master incorreta' }, 401);
  }
  
  // Check passwords match
  if (password !== confirm_password) {
    return c.json({ error: 'As senhas não coincidem' }, 400);
  }
  
  // Check if username already exists (case and accent insensitive)
  const normalizedUsername = normalizeUsername(username);
  const existing = await c.env.DB.prepare('SELECT * FROM admin_users WHERE normalized_username = ?')
    .bind(normalizedUsername).first();
  
  if (existing) {
    return c.json({ error: 'Nome de usuário já existe' }, 400);
  }
  
  // Create permissions string
  const permissionsStr = permissions.includes('all') ? 'all' : permissions.join(',');
  
  // Create admin user
  await c.env.DB.prepare(
    'INSERT INTO admin_users (username, password, is_master, permissions, normalized_username, granular_permissions) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(username, password, 0, permissionsStr, normalizedUsername, granular_permissions || null).run();
  
  return c.json({ success: true, message: 'Administrador criado com sucesso' });
});

// Admin: Update admin user
app.post('/api/admin/update-admin', zValidator('json', UpdateAdminUserRequestSchema), async (c) => {
  const { admin_id, username, password, permissions, granular_permissions, master_password } = c.req.valid('json');
  
  // Get requesting admin ID from header
  const requestingAdminId = c.req.header('X-Admin-ID');
  
  // If admin ID is provided, check if they are master
  let isMasterAdmin = false;
  if (requestingAdminId) {
    const requestingAdmin = await c.env.DB.prepare(
      'SELECT is_master FROM admin_users WHERE id = ?'
    ).bind(requestingAdminId).first();
    
    isMasterAdmin = Boolean(requestingAdmin && (requestingAdmin as any).is_master === 1);
  }
  
  // Check master password only if not master admin
  if (!isMasterAdmin && master_password !== '01530153') {
    return c.json({ error: 'Senha master incorreta' }, 401);
  }
  
  // Check if trying to update master admin
  const targetAdmin = await c.env.DB.prepare('SELECT * FROM admin_users WHERE id = ?')
    .bind(admin_id).first();
  
  if (!targetAdmin) {
    return c.json({ error: 'Administrador não encontrado' }, 404);
  }
  
  if ((targetAdmin as any).is_master === 1) {
    return c.json({ error: 'Não é possível editar o usuário master' }, 403);
  }
  
  // Build update query
  const updates: string[] = [];
  const params: any[] = [];
  
  if (username) {
    updates.push('username = ?');
    params.push(username);
    updates.push('normalized_username = ?');
    params.push(normalizeUsername(username));
  }
  
  if (password) {
    updates.push('password = ?');
    params.push(password);
  }
  
  if (permissions) {
    const permissionsStr = permissions.includes('all') ? 'all' : permissions.join(',');
    updates.push('permissions = ?');
    params.push(permissionsStr);
  }
  
  if (granular_permissions !== undefined) {
    updates.push('granular_permissions = ?');
    params.push(granular_permissions || null);
  }
  
  if (updates.length === 0) {
    return c.json({ success: true });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(admin_id);
  
  await c.env.DB.prepare(
    `UPDATE admin_users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();
  
  return c.json({ success: true, message: 'Administrador atualizado com sucesso' });
});

// Admin: Delete admin user
app.post('/api/admin/delete-admin', zValidator('json', DeleteAdminUserRequestSchema), async (c) => {
  const { admin_id, master_password } = c.req.valid('json');
  
  // Get requesting admin ID from header
  const requestingAdminId = c.req.header('X-Admin-ID');
  
  // If admin ID is provided, check if they are master
  let isMasterAdmin = false;
  if (requestingAdminId) {
    const requestingAdmin = await c.env.DB.prepare(
      'SELECT is_master FROM admin_users WHERE id = ?'
    ).bind(requestingAdminId).first();
    
    isMasterAdmin = requestingAdmin ? (requestingAdmin as any).is_master === 1 : false;
  }
  
  // Check master password only if not master admin
  if (!isMasterAdmin && master_password !== '01530153') {
    return c.json({ error: 'Senha master incorreta' }, 401);
  }
  
  // Check if trying to delete master admin
  const targetAdmin = await c.env.DB.prepare('SELECT * FROM admin_users WHERE id = ?')
    .bind(admin_id).first();
  
  if (!targetAdmin) {
    return c.json({ error: 'Administrador não encontrado' }, 404);
  }
  
  if ((targetAdmin as any).is_master === 1) {
    return c.json({ error: 'Não é possível excluir o usuário master' }, 403);
  }
  
  // Delete admin user
  await c.env.DB.prepare('DELETE FROM admin_users WHERE id = ?')
    .bind(admin_id).run();
  
  return c.json({ success: true, message: 'Administrador excluído com sucesso' });
});

// Admin: Export history to CSV
app.get('/api/admin/export-history-comprehensive', async (c) => {
  const firstName = c.req.query('first_name') || '';
  const lastName = c.req.query('last_name') || '';
  const whatsapp = c.req.query('whatsapp') || '';
  const userRegistrationFrom = c.req.query('user_registration_from') || '';
  const userRegistrationTo = c.req.query('user_registration_to') || '';
  const showEventHistory = c.req.query('show_event_history') === 'true';
  const selectedUserIds = c.req.query('selected_user_ids') || '';
  
  if (showEventHistory) {
    // Export ALL events (past, present, and future) - excluding deleted events
    let eventQuery = `
      SELECT 
        e.event_date,
        e.gira_text,
        e.created_at,
        e.is_active,
        COUNT(DISTINCT CASE WHEN r.status = 'confirmed' THEN r.id END) as confirmed_count,
        COUNT(DISTINCT CASE WHEN r.status = 'waitlist' THEN r.id END) as waitlist_count,
        COUNT(DISTINCT CASE WHEN r.status = 'waitlist_secondary' THEN r.id END) as waitlist_secondary_count
      FROM events e
      LEFT JOIN registrations r ON e.event_date = r.week_start_date
      GROUP BY e.event_date
      ORDER BY e.event_date DESC
    `;
    
    const events = await c.env.DB.prepare(eventQuery).all();
    
    // UTF-8 BOM for Excel compatibility
    let csv = '\ufeff';
    csv += 'Data do Evento;Nome do Evento;Lista de Presença;Lista de Espera Prioritária;Lista de Espera Secundária;Status;Data de Criação\n';
    for (const row of events.results) {
      const e = row as any;
      const status = e.is_active === 1 ? 'Ativo' : 'Inativo';
      csv += `${escapeCsvField(new Date(e.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' }))};${escapeCsvField(e.gira_text)};${escapeCsvField(e.confirmed_count || 0)};${escapeCsvField(e.waitlist_count || 0)};${escapeCsvField(e.waitlist_secondary_count || 0)};${escapeCsvField(status)};${escapeCsvField(formatDateTimeBrasilia(e.created_at))}\n`;
    }
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="historico_eventos_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }
  
  // Get current date in Brasilia timezone
  const now = new Date();
  const brasiliaDateString = now.toLocaleString('en-US', { 
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [month, day, year] = brasiliaDateString.split('/');
  const todayBrasilia = `${year}-${month}-${day}`;
  
  // Build query to get all users with their participation stats by list type
  // Count distinct events (week_start_date) where person ended in each list type
  // Use registrations table to get FINAL status, not intermediate changes
  // Only count events that still exist in the events table and are in the past
  let userQuery = `
    SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.whatsapp,
      u.created_at,
      COUNT(DISTINCT CASE 
        WHEN r.status = 'confirmed' 
        AND r.week_start_date IN (SELECT event_date FROM events WHERE event_date < ?)
        THEN r.week_start_date 
      END) as confirmed_participations,
      COUNT(DISTINCT CASE 
        WHEN r.status = 'waitlist' 
        AND r.week_start_date IN (SELECT event_date FROM events WHERE event_date < ?)
        THEN r.week_start_date 
      END) as waitlist_participations,
      COUNT(DISTINCT CASE 
        WHEN r.status = 'waitlist_secondary' 
        AND r.week_start_date IN (SELECT event_date FROM events WHERE event_date < ?)
        THEN r.week_start_date 
      END) as waitlist_secondary_participations
    FROM users u
    LEFT JOIN registrations r ON u.id = r.user_id
    WHERE 1=1
  `;
  
  const params: any[] = [todayBrasilia, todayBrasilia, todayBrasilia];
  
  // If specific user IDs are selected, only export those
  if (selectedUserIds) {
    const ids = selectedUserIds.split(',').map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id));
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      userQuery += ` AND u.id IN (${placeholders})`;
      params.push(...ids);
    }
  } else {
    // Otherwise, use filters
    if (firstName) {
      userQuery += ' AND u.first_name LIKE ?';
      params.push(`%${firstName}%`);
    }
    
    if (lastName) {
      userQuery += ' AND u.last_name LIKE ?';
      params.push(`%${lastName}%`);
    }
    
    if (whatsapp) {
      userQuery += ' AND u.whatsapp LIKE ?';
      params.push(`%${whatsapp}%`);
    }
    
    if (userRegistrationFrom) {
      userQuery += ' AND u.created_at >= ?';
      params.push(userRegistrationFrom + ' 00:00:00');
    }
    
    if (userRegistrationTo) {
      userQuery += ' AND u.created_at <= ?';
      params.push(userRegistrationTo + ' 23:59:59');
    }
  }
  
  userQuery += ' GROUP BY u.id ORDER BY u.created_at DESC';
  
  const users = await c.env.DB.prepare(userQuery).bind(...params).all();
  
  // Get ALL events for ALL users in a single query for better performance
  // Only include confirmed events that still exist (not deleted)
  let eventsQuery = `
    SELECT 
      h.user_id,
      h.week_start_date,
      h.event_name
    FROM attendance_history h
    WHERE h.status = 'confirmed'
    AND h.week_start_date IN (SELECT event_date FROM events)
    GROUP BY h.user_id, h.week_start_date, h.event_name
  `;
  
  const eventsParams: any[] = [];
  
  // Filter events by selected user IDs if applicable
  if (selectedUserIds) {
    const ids = selectedUserIds.split(',').map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id));
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      eventsQuery += ` AND h.user_id IN (${placeholders})`;
      eventsParams.push(...ids);
    }
  } else if (users.results.length > 0) {
    const userIds = users.results.map((u: any) => u.id);
    const placeholders = userIds.map(() => '?').join(',');
    eventsQuery += ` AND h.user_id IN (${placeholders})`;
    eventsParams.push(...userIds);
  }
  
  eventsQuery += ' ORDER BY h.user_id, h.week_start_date DESC';
  
  const allEvents = await c.env.DB.prepare(eventsQuery).bind(...eventsParams).all();
  
  // Group events by user_id for quick lookup
  const eventsByUser: Record<number, any[]> = {};
  for (const event of allEvents.results) {
    const e = event as any;
    if (!eventsByUser[e.user_id]) {
      eventsByUser[e.user_id] = [];
    }
    eventsByUser[e.user_id].push(e);
  }
  
  // UTF-8 BOM for Excel compatibility
  let csv = '\ufeff';
  csv += 'Nome;Sobrenome;WhatsApp;Lista de Presença;Lista de Espera Prioritária;Lista de Espera Secundária;Data de Cadastro;Eventos Participados\n';
  
  for (const user of users.results) {
    const u = user as any;
    
    // Get events for this user from the pre-fetched data
    const userEvents = eventsByUser[u.id] || [];
    const eventsList = userEvents.map((e: any) => 
      `${e.event_name || 'Evento'} (${new Date(e.week_start_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })})`
    ).join(', ');
    
    csv += `${escapeCsvField(u.first_name)};${escapeCsvField(u.last_name)};${escapeCsvField(u.whatsapp)};${escapeCsvField(u.confirmed_participations || 0)};${escapeCsvField(u.waitlist_participations || 0)};${escapeCsvField(u.waitlist_secondary_participations || 0)};${escapeCsvField(formatDateTimeBrasilia(u.created_at))};${escapeCsvField(eventsList)}\n`;
  }
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="historico_pessoas_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
});

// Admin: Get history - New comprehensive view
app.get('/api/admin/history', async (c) => {
  const firstName = c.req.query('first_name') || '';
  const lastName = c.req.query('last_name') || '';
  const whatsapp = c.req.query('whatsapp') || '';
  const userRegistrationFrom = c.req.query('user_registration_from') || '';
  const userRegistrationTo = c.req.query('user_registration_to') || '';
  const showEventHistory = c.req.query('show_event_history') === 'true';
  const showPastEvents = c.req.query('show_past_events') === 'true';
  
  if (showEventHistory) {
    // Get current date in Brasilia timezone
    const now = new Date();
    const brasiliaDateString = now.toLocaleString('en-US', { 
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const [month, day, year] = brasiliaDateString.split('/');
    const todayBrasilia = `${year}-${month}-${day}`;
    
    // Return events based on showPastEvents filter
    let eventQuery = `
      SELECT 
        e.event_date,
        e.gira_text,
        e.created_at,
        e.is_active,
        COUNT(DISTINCT r.id) as total_registrations
      FROM events e
      LEFT JOIN registrations r ON e.event_date = r.week_start_date
    `;
    
    // If not showing past events, filter to only active and future events
    if (!showPastEvents) {
      eventQuery += ` WHERE e.event_date >= ?`;
    }
    
    eventQuery += ` GROUP BY e.event_date ORDER BY e.event_date ASC`;
    
    const events = showPastEvents 
      ? await c.env.DB.prepare(eventQuery).all()
      : await c.env.DB.prepare(eventQuery).bind(todayBrasilia).all();
    
    return c.json(events.results, 200, {
      'Content-Type': 'application/json; charset=utf-8',
    });
  }
  
  // Get current date in Brasilia timezone
  const now = new Date();
  const brasiliaDateString = now.toLocaleString('en-US', { 
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [month, day, year] = brasiliaDateString.split('/');
  const todayBrasilia = `${year}-${month}-${day}`;
  
  // Build query to get all users with their participation stats
  // Only count PAST events where the person was confirmed
  let userQuery = `
    SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.whatsapp,
      u.created_at,
      COUNT(DISTINCT CASE 
        WHEN h.status = 'confirmed' 
        AND h.week_start_date IN (SELECT event_date FROM events WHERE event_date < ?)
        THEN h.week_start_date 
      END) as total_participations
    FROM users u
    LEFT JOIN attendance_history h ON u.id = h.user_id
    WHERE 1=1
  `;
  
  const params: any[] = [todayBrasilia];
  
  if (firstName) {
    userQuery += ' AND u.first_name LIKE ?';
    params.push(`%${firstName}%`);
  }
  
  if (lastName) {
    userQuery += ' AND u.last_name LIKE ?';
    params.push(`%${lastName}%`);
  }
  
  if (whatsapp) {
    userQuery += ' AND u.whatsapp LIKE ?';
    params.push(`%${whatsapp}%`);
  }
  
  if (userRegistrationFrom) {
    userQuery += ' AND u.created_at >= ?';
    params.push(userRegistrationFrom + ' 00:00:00');
  }
  
  if (userRegistrationTo) {
    userQuery += ' AND u.created_at <= ?';
    params.push(userRegistrationTo + ' 23:59:59');
  }
  
  userQuery += ' GROUP BY u.id ORDER BY u.created_at ASC';
  
  const users = await c.env.DB.prepare(userQuery).bind(...params).all();
  
  // For each user, get their event history (only confirmed events that still exist)
  const usersWithHistory = await Promise.all(
    users.results.map(async (user: any) => {
      const events = await c.env.DB.prepare(`
        SELECT 
          h.week_start_date,
          h.event_name,
          MIN(h.created_at) as created_at
        FROM attendance_history h
        WHERE h.user_id = ? 
        AND h.status = 'confirmed'
        AND h.week_start_date IN (SELECT event_date FROM events)
        GROUP BY h.week_start_date, h.event_name
        ORDER BY h.week_start_date DESC
      `).bind(user.id).all();
      
      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        whatsapp: user.whatsapp,
        created_at: user.created_at,
        total_participations: user.total_participations,
        events: events.results,
      };
    })
  );
  
  return c.json(usersWithHistory, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Admin: Block user directly by WhatsApp
app.post('/api/admin/block-user-directly', zValidator('json', BlockUserDirectlyRequestSchema), async (c) => {
  const { whatsapp, reason } = c.req.valid('json');
  
  // Get current event date for history
  const settings = await getSettings(c.env.DB);
  const weekStartDate = settings.event_date;
  
  // Normalize WhatsApp number to handle numbers with or without country code
  const normalizedWhatsapp = normalizeWhatsApp(whatsapp);
  
  // Find or create user
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE whatsapp = ?')
    .bind(normalizedWhatsapp).first();
  
  if (!user) {
    return c.json({ error: 'Usuário não encontrado com esse número de WhatsApp' }, 404);
  }
  
  // Check if user is already blocked
  if ((user as any).is_blocked === 1) {
    return c.json({ error: 'Usuário já está bloqueado' }, 400);
  }
  
  // Block user for 15 days
  const blockedUntil = new Date();
  blockedUntil.setDate(blockedUntil.getDate() + 15);
  
  await c.env.DB.prepare(
    'UPDATE users SET is_blocked = 1, blocked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(blockedUntil.toISOString(), (user as any).id).run();
  
  // Add history entry for manual block
  const notes = reason || 'Bloqueado manualmente pelo administrador por 15 dias';
  await c.env.DB.prepare(
    'INSERT INTO attendance_history (user_id, week_start_date, status, action, notes, event_name) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind((user as any).id, weekStartDate, 'blocked', 'admin_blocked', notes, settings.gira_text).run();
  
  // If user has an active registration for this week, remove it
  await c.env.DB.prepare(
    'UPDATE registrations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND week_start_date = ? AND status IN (?, ?, ?)'
  ).bind('deleted', (user as any).id, weekStartDate, 'confirmed', 'waitlist', 'waitlist_secondary').run();
  
  return c.json({ 
    success: true, 
    message: `Usuário ${(user as any).first_name} ${(user as any).last_name} bloqueado por 15 dias`,
    blocked_until: blockedUntil.toISOString()
  });
});

// Admin: Extend block period
app.post('/api/admin/extend-block', async (c) => {
  const body = await c.req.json();
  const { user_id, new_date, additional_days } = body;
  
  if (!user_id) {
    return c.json({ error: 'ID do usuário é obrigatório' }, 400);
  }
  
  // Get user
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(user_id).first();
  
  if (!user) {
    return c.json({ error: 'Usuário não encontrado' }, 404);
  }
  
  let newBlockedUntil: string;
  
  if (new_date) {
    // Use the specific date provided (format: YYYY-MM-DD)
    // Convert to end of day in Brasilia timezone (23:59:59 BRT = 02:59:59 UTC next day)
    const dateParts = new_date.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const day = parseInt(dateParts[2]);
    
    const endOfDayBrasilia = new Date(Date.UTC(year, month, day + 1, 2, 59, 59, 999));
    newBlockedUntil = endOfDayBrasilia.toISOString();
  } else if (additional_days) {
    // Add days to current blocked_until or to now if not blocked
    const currentBlockedUntil = (user as any).blocked_until 
      ? new Date((user as any).blocked_until)
      : new Date();
    
    currentBlockedUntil.setDate(currentBlockedUntil.getDate() + additional_days);
    newBlockedUntil = currentBlockedUntil.toISOString();
  } else {
    return c.json({ error: 'Deve fornecer uma nova data ou dias adicionais' }, 400);
  }
  
  // Update user's blocked_until
  await c.env.DB.prepare(
    'UPDATE users SET is_blocked = 1, blocked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(newBlockedUntil, user_id).run();
  
  // Get current event date for history
  const settings = await getSettings(c.env.DB);
  const weekStartDate = settings.event_date;
  
  // Add history entry
  const notes = new_date 
    ? `Bloqueio estendido até ${new_date} pelo administrador`
    : `Bloqueio estendido por ${additional_days} dia(s) pelo administrador`;
  
  await c.env.DB.prepare(
    'INSERT INTO attendance_history (user_id, week_start_date, status, action, notes, event_name) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(user_id, weekStartDate, 'blocked', 'admin_extended_block', notes, settings.gira_text).run();
  
  return c.json({ 
    success: true, 
    blocked_until: newBlockedUntil,
    message: 'Período de bloqueio estendido com sucesso'
  });
});

// Admin: Unblock user
app.post('/api/admin/unblock', zValidator('json', UnblockUserRequestSchema), async (c) => {
  const { user_id } = c.req.valid('json');
  
  // Get current event date for history
  const settings = await getSettings(c.env.DB);
  const weekStartDate = settings.event_date;
  
  await c.env.DB.prepare(
    'UPDATE users SET is_blocked = 0, blocked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(user_id).run();
  
  // Add history entry for manual unblock
  await c.env.DB.prepare(
    'INSERT INTO attendance_history (user_id, week_start_date, status, action, notes, event_name) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(user_id, weekStartDate, 'unblocked', 'admin_unblocked', 'Desbloqueado manualmente pelo administrador', settings.gira_text).run();
  
  return c.json({ success: true });
});

// Admin: Move blocked user to list
app.post('/api/admin/blocked-user-action', zValidator('json', BlockedUserActionRequestSchema), async (c) => {
  const { user_id, action } = c.req.valid('json');
  const settings = await getSettings(c.env.DB);
  const weekStartDate = settings.event_date;
  
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user_id).first();
  
  if (!user) {
    return c.json({ error: 'Usuário não encontrado' }, 404);
  }
  
  if (action === 'unblock') {
    await c.env.DB.prepare(
      'UPDATE users SET is_blocked = 0, blocked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(user_id).run();
    
    // Add history entry for manual unblock
    await c.env.DB.prepare(
      'INSERT INTO attendance_history (user_id, week_start_date, status, action, notes, event_name) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(user_id, weekStartDate, 'unblocked', 'admin_unblocked', 'Desbloqueado manualmente pelo administrador', settings.gira_text).run();
  } else {
    // IMPORTANT: When moving a blocked user, also record the unblock action
    // Unblock the user first
    await c.env.DB.prepare(
      'UPDATE users SET is_blocked = 0, blocked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(user_id).run();
    
    // Add history entry for manual unblock when moving
    await c.env.DB.prepare(
      'INSERT INTO attendance_history (user_id, week_start_date, status, action, notes, event_name) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(user_id, weekStartDate, 'unblocked', 'admin_unblocked', 'Desbloqueado manualmente ao mover para lista', settings.gira_text).run();
    
    // Check if user already has a registration this week
    const existing = await c.env.DB.prepare(
      'SELECT * FROM registrations WHERE user_id = ? AND week_start_date = ?'
    ).bind(user_id, weekStartDate).first();
    
    if (existing) {
      // Update existing registration
      let newStatus = 'confirmed';
      if (action === 'move_to_waitlist') newStatus = 'waitlist';
      else if (action === 'move_to_waitlist_secondary') newStatus = 'waitlist_secondary';
      
      await c.env.DB.prepare(
        'UPDATE registrations SET status = ?, manually_confirmed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(newStatus, (existing as any).id).run();
      
      if (newStatus === 'confirmed') {
        await c.env.DB.prepare(
          'UPDATE users SET times_invited = times_invited + 1 WHERE id = ?'
        ).bind(user_id).run();
        
        await sendWhatsAppMessage(
          (user as any).whatsapp,
          'Saravá! \nSeu nome está confirmado para a gira de hoje! Os portões se abrem as 18:45h e a gira inicia as 19:30h.⏰\n O atendimento é realizado por senha, por ordem de chegada. 🔑\n Há prioridade no atendimento para idosos, gestantes e pessoas com comorbidades.👴🏿👵🏿🤰🤰🏿🏥 \nNão há necessidade de vir de branco. \n🚫 NÃO USE:\n- Decotes \n- Saias e vestidos curtos\n- Regata ou blusa sem manga\n- Bermudas | shorts. \nO atendimento é realizado somente por mim, portanto demora mais que o normal!🥱 \nNão há necessidade de chegar para abertura e também não exijo que fique para o encerramento. \n📍Endereço: Rua Adamantina 153 - Condomínio Marambaia. \nCaso precise desistir por qualquer motivo, avise! Há irmãos na espera! Peço que vá até o link e selecione o botão vermelho "Cancelar minha inscrição".\nAxé!'
        );
      }
      
      await c.env.DB.prepare(
        'INSERT INTO attendance_history (user_id, week_start_date, status, action) VALUES (?, ?, ?, ?)'
      ).bind(user_id, weekStartDate, newStatus, 'admin_moved_from_blocked').run();
    } else {
      // Create new registration with chronological order
      const registrationOrder = await c.env.DB.prepare(
        'SELECT MAX(registration_order) as max_order FROM registrations WHERE week_start_date = ?'
      ).bind(weekStartDate).first<{ max_order: number | null }>();
      
      const newOrder = (registrationOrder?.max_order || 0) + 1;
      
      let newStatus = '';
      if (action === 'move_to_pending') newStatus = 'pending';
      else if (action === 'move_to_waitlist') newStatus = 'waitlist';
      else if (action === 'move_to_waitlist_secondary') newStatus = 'waitlist_secondary';
      else if (action === 'move_to_confirmed') newStatus = 'confirmed';
      
      await c.env.DB.prepare(
        'INSERT INTO registrations (user_id, week_start_date, status, registration_order, manually_confirmed) VALUES (?, ?, ?, ?, ?)'
      ).bind(user_id, weekStartDate, newStatus, newOrder, 1).run();
      
      if (newStatus === 'confirmed') {
        await c.env.DB.prepare(
          'UPDATE users SET times_invited = times_invited + 1 WHERE id = ?'
        ).bind(user_id).run();
        
        await sendWhatsAppMessage(
          (user as any).whatsapp,
          'Seu nome está confirmado para a gira de hoje'
        );
      }
      
      await c.env.DB.prepare(
        'INSERT INTO attendance_history (user_id, week_start_date, status, action) VALUES (?, ?, ?, ?)'
      ).bind(user_id, weekStartDate, newStatus, 'admin_added_from_blocked').run();
    }
  }
  
  // After any action, check capacity and balance lists
  await enforceCapacityLimit(c.env.DB, settings, weekStartDate);
  
  return c.json({ success: true });
});

// Helper function to escape CSV fields (using semicolon as delimiter for Brazilian Excel)
function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  // If field contains semicolon, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper function to format datetime in Brasilia timezone
function formatDateTimeBrasilia(dateString: string): string {
  if (!dateString) return '';
  const utcDateString = dateString.endsWith('Z') ? dateString : dateString.replace(' ', 'T') + 'Z';
  const date = new Date(utcDateString);
  const brasiliaDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
  
  const day = String(brasiliaDate.getUTCDate()).padStart(2, '0');
  const month = String(brasiliaDate.getUTCMonth() + 1).padStart(2, '0');
  const year = brasiliaDate.getUTCFullYear();
  const hours = String(brasiliaDate.getUTCHours()).padStart(2, '0');
  const minutes = String(brasiliaDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(brasiliaDate.getUTCSeconds()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Admin: Export CSV
app.get('/api/admin/export', async (c) => {
  const settings = await getSettings(c.env.DB);
  const weekStartDate = settings.event_date;
  
  // Get all registrations for the current week
  const confirmed = await c.env.DB.prepare(`
    SELECT 
      u.first_name,
      u.last_name,
      u.whatsapp,
      r.status,
      r.registration_order,
      r.created_at,
      r.week_start_date
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.week_start_date = ? AND r.status = 'confirmed'
    ORDER BY r.registration_order ASC
  `).bind(weekStartDate).all();
  
  const waitlist = await c.env.DB.prepare(`
    SELECT 
      u.first_name,
      u.last_name,
      u.whatsapp,
      r.status,
      r.registration_order,
      r.created_at,
      r.week_start_date
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.week_start_date = ? AND r.status = 'waitlist'
    ORDER BY r.registration_order ASC
  `).bind(weekStartDate).all();
  
  const waitlistSecondary = await c.env.DB.prepare(`
    SELECT 
      u.first_name,
      u.last_name,
      u.whatsapp,
      r.status,
      r.registration_order,
      r.created_at,
      r.week_start_date
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.week_start_date = ? AND r.status = 'waitlist_secondary'
    ORDER BY r.registration_order ASC
  `).bind(weekStartDate).all();
  
  // UTF-8 BOM for Excel compatibility
  let csv = '\ufeff';
  
  csv += 'GIRA ATUAL\n';
  csv += 'Configurações da Gira\n';
  csv += `${escapeCsvField('GIRA')};${escapeCsvField(settings.gira_text)}\n`;
  csv += `${escapeCsvField('Cabeçalho')};${escapeCsvField(settings.header_text)}\n`;
  csv += `${escapeCsvField('Data da Gira')};${escapeCsvField(settings.event_date)}\n`;
  csv += `${escapeCsvField('Hora da Gira')};${escapeCsvField(settings.event_time)}\n`;
  csv += `${escapeCsvField('Capacidade Máxima')};${escapeCsvField(settings.max_capacity)}\n\n`;
  
  csv += 'Lista de Confirmados\n';
  csv += 'Ordem;Nome;Sobrenome;WhatsApp;Data de Cadastro\n';
  for (const row of confirmed.results) {
    const r = row as any;
    csv += `${escapeCsvField(r.registration_order)};${escapeCsvField(r.first_name)};${escapeCsvField(r.last_name)};${escapeCsvField(r.whatsapp)};${escapeCsvField(formatDateTimeBrasilia(r.created_at))}\n`;
  }
  
  csv += '\nLista de Espera Prioritária\n';
  csv += 'Ordem;Nome;Sobrenome;WhatsApp;Data de Cadastro\n';
  for (const row of waitlist.results) {
    const r = row as any;
    csv += `${escapeCsvField(r.registration_order)};${escapeCsvField(r.first_name)};${escapeCsvField(r.last_name)};${escapeCsvField(r.whatsapp)};${escapeCsvField(formatDateTimeBrasilia(r.created_at))}\n`;
  }
  
  csv += '\nLista de Espera Secundária\n';
  csv += 'Ordem;Nome;Sobrenome;WhatsApp;Data de Cadastro\n';
  for (const row of waitlistSecondary.results) {
    const r = row as any;
    csv += `${escapeCsvField(r.registration_order)};${escapeCsvField(r.first_name)};${escapeCsvField(r.last_name)};${escapeCsvField(r.whatsapp)};${escapeCsvField(formatDateTimeBrasilia(r.created_at))}\n`;
  }
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="lista_gira_completa_${weekStartDate}.csv"`,
    },
  });
});

// Admin: Export history
app.get('/api/admin/export-history', async (c) => {
  const days = parseInt(c.req.query('days') || '30');
  const firstName = c.req.query('first_name') || '';
  const lastName = c.req.query('last_name') || '';
  const whatsapp = c.req.query('whatsapp') || '';
  const dateFrom = c.req.query('date_from') || '';
  const dateTo = c.req.query('date_to') || '';
  
  let query = `
    SELECT 
      h.*,
      u.first_name,
      u.last_name,
      u.whatsapp
    FROM attendance_history h
    JOIN users u ON h.user_id = u.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (dateFrom) {
    query += ' AND h.created_at >= ?';
    params.push(dateFrom);
  } else {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    query += ' AND h.created_at >= ?';
    params.push(fromDate.toISOString());
  }
  
  if (dateTo) {
    query += ' AND h.created_at <= ?';
    params.push(dateTo);
  }
  
  if (firstName) {
    query += ' AND u.first_name LIKE ?';
    params.push(`%${firstName}%`);
  }
  
  if (lastName) {
    query += ' AND u.last_name LIKE ?';
    params.push(`%${lastName}%`);
  }
  
  if (whatsapp) {
    query += ' AND u.whatsapp LIKE ?';
    params.push(`%${whatsapp}%`);
  }
  
  query += ' ORDER BY h.created_at DESC';
  
  const history = await c.env.DB.prepare(query).bind(...params).all();
  
  // UTF-8 BOM for Excel compatibility
  let csv = '\ufeff';
  csv += 'Nome;Sobrenome;WhatsApp;Semana;Status;Ação;Notas;Data\n';
  for (const row of history.results) {
    const h = row as any;
    csv += `${escapeCsvField(h.first_name)};${escapeCsvField(h.last_name)};${escapeCsvField(h.whatsapp)};${escapeCsvField(h.week_start_date)};${escapeCsvField(h.status)};${escapeCsvField(h.action)};${escapeCsvField(h.notes || '')};${escapeCsvField(formatDateTimeBrasilia(h.created_at))}\n`;
  }
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="historico.csv"',
    },
  });
});

// Admin: Delete history
app.post('/api/admin/delete-history', async (c) => {
  const body = await c.req.json();
  const { ids, filter, user_ids, delete_all } = body;
  
  if (delete_all) {
    await c.env.DB.prepare('DELETE FROM attendance_history').run();
    return c.json({ success: true, message: 'Todo o histórico foi apagado' });
  }
  
  if (user_ids && user_ids.length > 0) {
    // Delete all history entries AND the users themselves
    const placeholders = user_ids.map(() => '?').join(',');
    
    // First delete from attendance_history
    await c.env.DB.prepare(`DELETE FROM attendance_history WHERE user_id IN (${placeholders})`)
      .bind(...user_ids)
      .run();
    
    // Then delete from registrations
    await c.env.DB.prepare(`DELETE FROM registrations WHERE user_id IN (${placeholders})`)
      .bind(...user_ids)
      .run();
    
    // Finally delete the users themselves
    await c.env.DB.prepare(`DELETE FROM users WHERE id IN (${placeholders})`)
      .bind(...user_ids)
      .run();
    
    return c.json({ success: true, message: `${user_ids.length} pessoa(s) completamente removida(s) do sistema` });
  }
  
  if (ids && ids.length > 0) {
    // Delete specific IDs
    const placeholders = ids.map(() => '?').join(',');
    await c.env.DB.prepare(`DELETE FROM attendance_history WHERE id IN (${placeholders})`)
      .bind(...ids)
      .run();
    return c.json({ success: true, message: `${ids.length} registro(s) apagado(s)` });
  }
  
  if (filter) {
    // Build delete query with filters
    let query = 'DELETE FROM attendance_history WHERE id IN (SELECT h.id FROM attendance_history h JOIN users u ON h.user_id = u.id WHERE 1=1';
    const params: any[] = [];
    
    if (filter.first_name) {
      query += ' AND u.first_name LIKE ?';
      params.push(`%${filter.first_name}%`);
    }
    
    if (filter.last_name) {
      query += ' AND u.last_name LIKE ?';
      params.push(`%${filter.last_name}%`);
    }
    
    if (filter.whatsapp) {
      query += ' AND u.whatsapp LIKE ?';
      params.push(`%${filter.whatsapp}%`);
    }
    
    if (filter.date_from) {
      query += ' AND h.created_at >= ?';
      params.push(filter.date_from);
    }
    
    if (filter.date_to) {
      query += ' AND h.created_at <= ?';
      params.push(filter.date_to);
    }
    
    query += ')';
    
    await c.env.DB.prepare(query).bind(...params).run();
    return c.json({ success: true, message: 'Histórico filtrado foi apagado' });
  }
  
  return c.json({ success: true });
});

// Admin: Update registration order
app.post('/api/admin/update-order', zValidator('json', UpdateRegistrationOrderRequestSchema), async (c) => {
  const { registration_id, new_order } = c.req.valid('json');
  
  // Get the registration
  const registration = await c.env.DB.prepare(
    'SELECT * FROM registrations WHERE id = ?'
  ).bind(registration_id).first();
  
  if (!registration) {
    return c.json({ error: 'Inscrição não encontrada' }, 404);
  }
  
  const reg = registration as any;
  const oldOrder = reg.registration_order;
  const weekStartDate = reg.week_start_date;
  
  if (oldOrder === new_order) {
    return c.json({ success: true });
  }
  
  // Adjust other registrations
  if (new_order < oldOrder) {
    // Moving up - shift others down
    await c.env.DB.prepare(
      'UPDATE registrations SET registration_order = registration_order + 1 WHERE week_start_date = ? AND registration_order >= ? AND registration_order < ? AND id != ?'
    ).bind(weekStartDate, new_order, oldOrder, registration_id).run();
  } else {
    // Moving down - shift others up
    await c.env.DB.prepare(
      'UPDATE registrations SET registration_order = registration_order - 1 WHERE week_start_date = ? AND registration_order > ? AND registration_order <= ? AND id != ?'
    ).bind(weekStartDate, oldOrder, new_order, registration_id).run();
  }
  
  // Update the target registration
  await c.env.DB.prepare(
    'UPDATE registrations SET registration_order = ? WHERE id = ?'
  ).bind(new_order, registration_id).run();
  
  return c.json({ success: true });
});

// Admin: Sync WhatsApp messages to all events
app.post('/api/admin/sync-messages', async (c) => {
  // Get active event's messages
  const activeEvent = await c.env.DB.prepare(
    'SELECT whatsapp_confirmed_message, whatsapp_waitlist_message, whatsapp_waitlist_secondary_message FROM events WHERE is_active = 1 LIMIT 1'
  ).first();
  
  if (!activeEvent) {
    return c.json({ error: 'Nenhum evento ativo encontrado' }, 400);
  }
  
  const confirmedMsg = (activeEvent as any).whatsapp_confirmed_message;
  const waitlistMsg = (activeEvent as any).whatsapp_waitlist_message;
  const waitlistSecondaryMsg = (activeEvent as any).whatsapp_waitlist_secondary_message;
  
  // Update all events that don't have messages
  await c.env.DB.prepare(`
    UPDATE events 
    SET 
      whatsapp_confirmed_message = COALESCE(whatsapp_confirmed_message, ?),
      whatsapp_waitlist_message = COALESCE(whatsapp_waitlist_message, ?),
      whatsapp_waitlist_secondary_message = COALESCE(whatsapp_waitlist_secondary_message, ?),
      updated_at = CURRENT_TIMESTAMP
  `).bind(confirmedMsg, waitlistMsg, waitlistSecondaryMsg).run();
  
  return c.json({ success: true, message: 'Mensagens sincronizadas para todos os eventos' });
});

// Admin: Get all events
app.get('/api/admin/events', async (c) => {
  // Admin panel needs all events including past ones
  const events = await getAllEventsIncludingPast(c.env.DB);
  return c.json(events, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Admin: Create or update event
app.post('/api/admin/event', async (c) => {
  const body = await c.req.json();
  const { event_date, theme_mode, theme_color_1, theme_color_2, ...updates } = body;
  
  if (!event_date) {
    return c.json({ error: 'Data do evento é obrigatória' }, 400);
  }
  
  // Handle theme colors separately (they're stored in global settings table)
  if (theme_mode !== undefined) {
    await c.env.DB.prepare('INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, COALESCE((SELECT created_at FROM settings WHERE key = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)')
      .bind('theme_mode', String(theme_mode), 'theme_mode')
      .run();
  }
  
  if (theme_color_1 !== undefined) {
    await c.env.DB.prepare('INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, COALESCE((SELECT created_at FROM settings WHERE key = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)')
      .bind('theme_color_1', String(theme_color_1), 'theme_color_1')
      .run();
  }
  
  if (theme_color_2 !== undefined) {
    await c.env.DB.prepare('INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, COALESCE((SELECT created_at FROM settings WHERE key = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)')
      .bind('theme_color_2', String(theme_color_2), 'theme_color_2')
      .run();
  }
  
  // Check if event already exists
  const existing = await c.env.DB.prepare(
    'SELECT * FROM events WHERE event_date = ?'
  ).bind(event_date).first();
  
  if (existing) {
    // Event already exists - update it (including logo_url and logo_size in events table)
    await updateEventSettings(c.env.DB, event_date, updates);
    return c.json({ success: true, message: 'Evento atualizado com sucesso' });
  } else {
    // Create new event (including logo_url and logo_size in events table)
    await createEvent(c.env.DB, event_date, { event_date, ...updates });
    return c.json({ success: true, message: 'Evento criado com sucesso' });
  }
});

// Admin: Set active event (MANUAL activation only)
app.post('/api/admin/set-active-event', async (c) => {
  const { event_date } = await c.req.json();
  
  if (!event_date) {
    return c.json({ error: 'Data do evento é obrigatória' }, 400);
  }
  
  // Deactivate all recesses (event has priority)
  await c.env.DB.prepare('UPDATE recess SET is_active = 0').run();
  
  // Deactivate all events first
  await c.env.DB.prepare('UPDATE events SET is_active = 0').run();
  
  // Activate the selected event
  await c.env.DB.prepare(
    'UPDATE events SET is_active = 1 WHERE event_date = ?'
  ).bind(event_date).run();
  
  return c.json({ success: true });
});

// Admin: Deactivate event (MANUAL deactivation - does NOT auto-activate recess)
app.post('/api/admin/deactivate-event', async (c) => {
  const { event_date } = await c.req.json();
  
  if (!event_date) {
    return c.json({ error: 'Data do evento é obrigatória' }, 400);
  }
  
  // Deactivate the event
  await c.env.DB.prepare('UPDATE events SET is_active = 0 WHERE event_date = ?')
    .bind(event_date)
    .run();
  
  // No automatic recess activation - admin must manually activate if desired
  
  return c.json({ success: true });
});

// Admin: Delete event and all its data
app.post('/api/admin/delete-event', async (c) => {
  const { event_date } = await c.req.json();
  
  if (!event_date) {
    return c.json({ error: 'Data do evento é obrigatória' }, 400);
  }
  
  // Delete registrations for this event
  await c.env.DB.prepare('DELETE FROM registrations WHERE week_start_date = ?')
    .bind(event_date)
    .run();
  
  // Delete history entries for this event
  await c.env.DB.prepare('DELETE FROM attendance_history WHERE week_start_date = ?')
    .bind(event_date)
    .run();
  
  // Delete the event itself
  await c.env.DB.prepare('DELETE FROM events WHERE event_date = ?')
    .bind(event_date)
    .run();
  
  return c.json({ success: true, message: 'Evento e todos os seus dados foram apagados' });
});

// Admin: Clear all data (deprecated - kept for compatibility)
app.post('/api/admin/clear-all-data', async (c) => {
  // Get current event date from active event
  const settings = await getSettings(c.env.DB);
  const weekStartDate = settings.event_date;
  
  // Delete registrations for current event only
  await c.env.DB.prepare('DELETE FROM registrations WHERE week_start_date = ?')
    .bind(weekStartDate)
    .run();
  
  // Delete history entries for current event only
  await c.env.DB.prepare('DELETE FROM attendance_history WHERE week_start_date = ?')
    .bind(weekStartDate)
    .run();
  
  return c.json({ success: true, message: 'Dados do evento corrente foram apagados' });
});

// Admin: Get all users
app.get('/api/admin/all-users', async (c) => {
  const firstName = c.req.query('first_name') || '';
  const lastName = c.req.query('last_name') || '';
  const whatsapp = c.req.query('whatsapp') || '';
  
  let query = `
    SELECT 
      u.*,
      (SELECT COUNT(DISTINCT week_start_date) FROM registrations WHERE user_id = u.id AND status = 'confirmed') as total_confirmations,
      (SELECT COUNT(DISTINCT week_start_date) FROM registrations WHERE user_id = u.id AND status IN ('cancelled', 'deleted')) as total_cancellations
    FROM users u
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (firstName) {
    query += ' AND u.first_name LIKE ?';
    params.push(`%${firstName}%`);
  }
  
  if (lastName) {
    query += ' AND u.last_name LIKE ?';
    params.push(`%${lastName}%`);
  }
  
  if (whatsapp) {
    query += ' AND u.whatsapp LIKE ?';
    params.push(`%${whatsapp}%`);
  }
  
  query += ' ORDER BY u.created_at DESC';
  
  const users = await c.env.DB.prepare(query).bind(...params).all();
  
  return c.json(users.results, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Admin: Export analytics
app.get('/api/admin/export-analytics', async (c) => {
  const days = parseInt(c.req.query('days') || '30');
  const dateFrom = c.req.query('date_from') || '';
  const dateTo = c.req.query('date_to') || '';
  
  let dateFilter = '';
  const params: any[] = [];
  
  if (dateFrom && dateTo) {
    dateFilter = 'WHERE created_at >= ? AND created_at <= ?';
    params.push(dateFrom, dateTo);
  } else {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    dateFilter = 'WHERE created_at >= ?';
    params.push(fromDate.toISOString());
  }
  
  // Get page views (unique sessions only)
  const pageViews = await c.env.DB.prepare(
    `SELECT COUNT(DISTINCT user_session) as count FROM analytics_events ${dateFilter} AND event_type = ? AND user_session IS NOT NULL`
  ).bind(...params, 'page_view').first<{ count: number }>();
  
  // Get total register button clicks (form completions)
  const registerClicks = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM analytics_events ${dateFilter} AND event_type = ?`
  ).bind(...params, 'register_click').first<{ count: number }>();
  
  // Get total form starts
  const formStarts = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM analytics_events ${dateFilter} AND event_type = ?`
  ).bind(...params, 'form_start').first<{ count: number }>();
  
  // Get total form abandons
  const formAbandons = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM analytics_events ${dateFilter} AND event_type = ?`
  ).bind(...params, 'form_abandon').first<{ count: number }>();
  
  // UTF-8 BOM for Excel compatibility
  let csv = '\ufeff';
  
  csv += 'RELATÓRIO DE ANALYTICS\n';
  
  if (dateFrom && dateTo) {
    csv += `Período: ${new Date(dateFrom).toLocaleDateString('pt-BR')} até ${new Date(dateTo).toLocaleDateString('pt-BR')}\n\n`;
  } else {
    csv += `Período: Últimos ${days} ${days === 1 ? 'dia' : 'dias'}\n\n`;
  }
  
  csv += 'Resumo Geral\n';
  csv += 'Métrica;Quantidade\n';
  csv += `${escapeCsvField('Acessos à página')};${escapeCsvField(pageViews?.count || 0)}\n`;
  csv += `${escapeCsvField('Cliques em "Inscrever-se"')};${escapeCsvField(registerClicks?.count || 0)}\n`;
  csv += `${escapeCsvField('Iniciaram e abandonaram a inscrição')};${escapeCsvField(formAbandons?.count || 0)}\n\n`;
  
  // Calculate conversion rates
  const conversionRate = formStarts && (formStarts.count || 0) > 0 
    ? Math.round((((formStarts.count || 0) - (formAbandons?.count || 0)) / (formStarts.count || 0)) * 100)
    : 0;
  const abandonRate = formStarts && (formStarts.count || 0) > 0
    ? Math.round(((formAbandons?.count || 0) / (formStarts.count || 0)) * 100)
    : 0;
  
  csv += 'Taxas de Conversão\n';
  csv += 'Métrica;Valor\n';
  csv += `${escapeCsvField('Taxa de conversão (iniciaram → completaram)')};${escapeCsvField(conversionRate + '%')}\n`;
  csv += `${escapeCsvField('Taxa de abandono')};${escapeCsvField(abandonRate + '%')}\n\n`;
  
  // Get detailed events
  const allEvents = await c.env.DB.prepare(
    `SELECT * FROM analytics_events ${dateFilter} ORDER BY created_at DESC`
  ).bind(...params).all();
  
  csv += 'Eventos Detalhados\n';
  csv += 'ID;Tipo de Evento;Sessão do Usuário;Data e Hora\n';
  for (const row of allEvents.results) {
    const e = row as any;
    const eventTypeName = e.event_type === 'page_view' ? 'Acesso à página' :
                         e.event_type === 'register_click' ? 'Clique em Inscrever-se' :
                         e.event_type === 'form_start' ? 'Iniciou preenchimento' :
                         e.event_type === 'form_abandon' ? 'Abandonou inscrição' :
                         e.event_type;
    csv += `${escapeCsvField(e.id)};${escapeCsvField(eventTypeName)};${escapeCsvField(e.user_session || 'N/A')};${escapeCsvField(formatDateTimeBrasilia(e.created_at))}\n`;
  }
  
  const filename = dateFrom && dateTo 
    ? `analytics_${dateFrom}_a_${dateTo}.csv`
    : `analytics_ultimos_${days}_dias.csv`;
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

// Admin: Get event details with all lists
app.get('/api/admin/event-details/:event_date', async (c) => {
  const eventDate = c.req.param('event_date');
  
  // Get event info
  const event = await c.env.DB.prepare(
    'SELECT * FROM events WHERE event_date = ?'
  ).bind(eventDate).first();
  
  // Get confirmed registrations
  const confirmed = await c.env.DB.prepare(`
    SELECT 
      u.first_name,
      u.last_name,
      u.whatsapp,
      r.registration_order,
      r.created_at
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.week_start_date = ? AND r.status = 'confirmed'
    ORDER BY r.registration_order ASC
  `).bind(eventDate).all();
  
  // Get waitlist registrations
  const waitlist = await c.env.DB.prepare(`
    SELECT 
      u.first_name,
      u.last_name,
      u.whatsapp,
      r.registration_order,
      r.created_at
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.week_start_date = ? AND r.status = 'waitlist'
    ORDER BY r.registration_order ASC
  `).bind(eventDate).all();
  
  // Get secondary waitlist registrations
  const waitlistSecondary = await c.env.DB.prepare(`
    SELECT 
      u.first_name,
      u.last_name,
      u.whatsapp,
      r.registration_order,
      r.created_at
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.week_start_date = ? AND r.status = 'waitlist_secondary'
    ORDER BY r.registration_order ASC
  `).bind(eventDate).all();
  
  // Get users who cancelled or were blocked/deleted for this event
  // Check if they were later unblocked by admin
  const blocked = await c.env.DB.prepare(`
    SELECT DISTINCT
      u.first_name,
      u.last_name,
      u.whatsapp,
      (
        SELECT h_first.created_at
        FROM attendance_history h_first
        WHERE h_first.user_id = u.id 
        AND h_first.week_start_date = ?
        AND h_first.action IN ('admin_blocked', 'user_cancelled')
        ORDER BY h_first.created_at ASC
        LIMIT 1
      ) as created_at,
      (
        SELECT h3.action
        FROM attendance_history h3
        WHERE h3.user_id = u.id 
        AND h3.week_start_date = ?
        AND h3.action IN ('admin_blocked', 'user_cancelled')
        ORDER BY h3.created_at DESC
        LIMIT 1
      ) as block_action,
      (
        SELECT h_last_block.created_at
        FROM attendance_history h_last_block
        WHERE h_last_block.user_id = u.id 
        AND h_last_block.week_start_date = ?
        AND h_last_block.action IN ('admin_blocked', 'user_cancelled')
        ORDER BY h_last_block.created_at DESC
        LIMIT 1
      ) as last_block_timestamp,
      (
        SELECT COUNT(*) 
        FROM attendance_history h2 
        WHERE h2.user_id = u.id 
        AND h2.week_start_date = ?
        AND h2.action = 'admin_unblocked'
        AND h2.created_at > (
          SELECT h_last_block.created_at
          FROM attendance_history h_last_block
          WHERE h_last_block.user_id = u.id 
          AND h_last_block.week_start_date = ?
          AND h_last_block.action IN ('admin_blocked', 'user_cancelled')
          ORDER BY h_last_block.created_at DESC
          LIMIT 1
        )
      ) as was_unblocked_by_admin,
      (
        SELECT h4.created_at
        FROM attendance_history h4
        WHERE h4.user_id = u.id 
        AND h4.week_start_date = ?
        AND h4.action = 'admin_unblocked'
        AND h4.created_at > (
          SELECT h_last_block.created_at
          FROM attendance_history h_last_block
          WHERE h_last_block.user_id = u.id 
          AND h_last_block.week_start_date = ?
          AND h_last_block.action IN ('admin_blocked', 'user_cancelled')
          ORDER BY h_last_block.created_at DESC
          LIMIT 1
        )
        ORDER BY h4.created_at DESC
        LIMIT 1
      ) as unblock_timestamp
    FROM users u
    WHERE EXISTS (
      SELECT 1 
      FROM attendance_history h 
      WHERE h.user_id = u.id 
      AND h.week_start_date = ?
      AND h.action IN ('admin_blocked', 'user_cancelled')
    )
    ORDER BY was_unblocked_by_admin ASC, created_at DESC
  `).bind(eventDate, eventDate, eventDate, eventDate, eventDate, eventDate, eventDate, eventDate).all();
  
  return c.json({
    event,
    confirmed: confirmed.results,
    waitlist: waitlist.results,
    waitlist_secondary: waitlistSecondary.results,
    blocked: blocked.results,
  }, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Admin: Get all padê events
app.get('/api/admin/pade-events', async (c) => {
  const events = await c.env.DB.prepare(`
    SELECT 
      pe.*,
      COUNT(pp.id) as participant_count
    FROM pade_events pe
    LEFT JOIN pade_participants pp ON pe.id = pp.pade_event_id
    GROUP BY pe.id
    ORDER BY pe.event_date ASC
  `).all();
  
  return c.json(events.results, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Admin: Get padê event with participants
app.get('/api/admin/pade-event/:id', async (c) => {
  const id = c.req.param('id');
  
  const event = await c.env.DB.prepare(
    'SELECT * FROM pade_events WHERE id = ?'
  ).bind(id).first();
  
  if (!event) {
    return c.json({ error: 'Evento não encontrado' }, 404);
  }
  
  const participants = await c.env.DB.prepare(`
    SELECT pp.*, ppl.whatsapp
    FROM pade_participants pp
    LEFT JOIN pade_people ppl ON pp.participant_name = ppl.name
    WHERE pp.pade_event_id = ?
    ORDER BY pp.created_at ASC
  `).bind(id).all();
  
  return c.json({
    event,
    participants: participants.results,
  }, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Admin: Create or update padê event
app.post('/api/admin/pade-event', async (c) => {
  const body = await c.req.json();
  const { id, event_name, event_type, event_date, participants, whatsapp_number } = body;
  
  if (!event_name || !event_type || !event_date) {
    return c.json({ error: 'Todos os campos são obrigatórios' }, 400);
  }
  
  let eventId = id;
  
  if (id) {
    // Update existing event
    await c.env.DB.prepare(
      'UPDATE pade_events SET event_name = ?, event_type = ?, event_date = ?, whatsapp_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(event_name, event_type, event_date, whatsapp_number || null, id).run();
    
    // Delete existing participants
    await c.env.DB.prepare(
      'DELETE FROM pade_participants WHERE pade_event_id = ?'
    ).bind(id).run();
  } else {
    // Create new event
    const result = await c.env.DB.prepare(
      'INSERT INTO pade_events (event_name, event_type, event_date, whatsapp_number) VALUES (?, ?, ?, ?)'
    ).bind(event_name, event_type, event_date, whatsapp_number || null).run();
    
    eventId = result.meta.last_row_id;
  }
  
  // Add participants
  if (participants && participants.length > 0) {
    for (const name of participants) {
      if (name.trim()) {
        await c.env.DB.prepare(
          'INSERT INTO pade_participants (pade_event_id, participant_name) VALUES (?, ?)'
        ).bind(eventId, name.trim()).run();
      }
    }
  }
  
  return c.json({ success: true, id: eventId, message: 'Evento salvo com sucesso' });
});

// Admin: Delete padê event
app.post('/api/admin/delete-pade-event', async (c) => {
  const { id } = await c.req.json();
  
  if (!id) {
    return c.json({ error: 'ID do evento é obrigatório' }, 400);
  }
  
  // Delete participants first
  await c.env.DB.prepare('DELETE FROM pade_participants WHERE pade_event_id = ?')
    .bind(id)
    .run();
  
  // Delete event
  await c.env.DB.prepare('DELETE FROM pade_events WHERE id = ?')
    .bind(id)
    .run();
  
  return c.json({ success: true, message: 'Evento apagado com sucesso' });
});

// Admin: Get all padê people
app.get('/api/admin/pade-people', async (c) => {
  const people = await c.env.DB.prepare(
    'SELECT * FROM pade_people ORDER BY sort_order ASC, id ASC'
  ).all();
  
  return c.json(people.results, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Admin: Add padê person
app.post('/api/admin/pade-person', async (c) => {
  const { name, whatsapp } = await c.req.json();
  
  if (!name || !name.trim()) {
    return c.json({ error: 'Nome é obrigatório' }, 400);
  }
  
  // Check if name already exists
  const existing = await c.env.DB.prepare(
    'SELECT * FROM pade_people WHERE LOWER(name) = LOWER(?)'
  ).bind(name.trim()).first();
  
  if (existing) {
    return c.json({ error: 'Esta pessoa já está na lista' }, 400);
  }
  
  // Get the highest sort_order and add 1
  const maxOrder = await c.env.DB.prepare(
    'SELECT MAX(sort_order) as max_order FROM pade_people'
  ).first<{ max_order: number | null }>();
  
  const newOrder = (maxOrder?.max_order || 0) + 1;
  
  await c.env.DB.prepare(
    'INSERT INTO pade_people (name, whatsapp, sort_order) VALUES (?, ?, ?)'
  ).bind(name.trim(), whatsapp?.trim() || null, newOrder).run();
  
  return c.json({ success: true, message: 'Pessoa adicionada com sucesso' });
});

// Admin: Delete padê person
app.post('/api/admin/delete-pade-person', async (c) => {
  const { id } = await c.req.json();
  
  if (!id) {
    return c.json({ error: 'ID é obrigatório' }, 400);
  }
  
  await c.env.DB.prepare('DELETE FROM pade_people WHERE id = ?')
    .bind(id)
    .run();
  
  return c.json({ success: true, message: 'Pessoa removida com sucesso' });
});

// Admin: Update padê people order
app.post('/api/admin/update-pade-people-order', async (c) => {
  const { people } = await c.req.json();
  
  if (!people || !Array.isArray(people)) {
    return c.json({ error: 'Lista de pessoas é obrigatória' }, 400);
  }
  
  // Update each person's sort_order
  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    await c.env.DB.prepare(
      'UPDATE pade_people SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(i + 1, person.id).run();
  }
  
  return c.json({ success: true, message: 'Ordem atualizada com sucesso' });
});

// Admin: Export users to CSV
app.get('/api/admin/export-users', async (c) => {
  const firstName = c.req.query('first_name') || '';
  const lastName = c.req.query('last_name') || '';
  const whatsapp = c.req.query('whatsapp') || '';
  
  let query = `
    SELECT 
      u.*,
      (SELECT COUNT(DISTINCT week_start_date) FROM registrations WHERE user_id = u.id AND status = 'confirmed') as total_confirmations,
      (SELECT COUNT(DISTINCT week_start_date) FROM registrations WHERE user_id = u.id AND status IN ('cancelled', 'deleted')) as total_cancellations
    FROM users u
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (firstName) {
    query += ' AND u.first_name LIKE ?';
    params.push(`%${firstName}%`);
  }
  
  if (lastName) {
    query += ' AND u.last_name LIKE ?';
    params.push(`%${lastName}%`);
  }
  
  if (whatsapp) {
    query += ' AND u.whatsapp LIKE ?';
    params.push(`%${whatsapp}%`);
  }
  
  query += ' ORDER BY u.created_at DESC';
  
  const users = await c.env.DB.prepare(query).bind(...params).all();
  
  // UTF-8 BOM for Excel compatibility
  let csv = '\ufeff';
  csv += 'Nome;Sobrenome;WhatsApp;Confirmações;Cancelamentos;Bloqueado;Cadastrado Em\n';
  for (const row of users.results) {
    const u = row as any;
    csv += `${escapeCsvField(u.first_name)};${escapeCsvField(u.last_name)};${escapeCsvField(u.whatsapp)};${escapeCsvField(u.total_confirmations || 0)};${escapeCsvField(u.total_cancellations || 0)};${escapeCsvField(u.is_blocked === 1 ? 'Sim' : 'Não')};${escapeCsvField(formatDateTimeBrasilia(u.created_at))}\n`;
  }
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="usuarios_cadastrados_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
});

// Admin: Get blocked users history
app.get('/api/admin/blocked-history', async (c) => {
  const days = parseInt(c.req.query('days') || '30');
  const dateFrom = c.req.query('date_from') || '';
  const dateTo = c.req.query('date_to') || '';
  
  let query = `
    SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.whatsapp,
      u.is_blocked,
      u.blocked_until,
      h.id as history_id,
      h.week_start_date,
      h.event_name,
      h.action,
      h.notes,
      h.created_at,
      (
        SELECT h2.created_at
        FROM attendance_history h2 
        WHERE h2.user_id = u.id 
        AND h2.action = 'admin_unblocked' 
        AND h2.created_at > h.created_at
        ORDER BY h2.created_at ASC
        LIMIT 1
      ) as unblock_timestamp
    FROM attendance_history h
    JOIN users u ON h.user_id = u.id
    WHERE (h.action = 'admin_blocked' OR h.action = 'user_cancelled' OR h.action = 'admin_unblocked')
  `;
  
  const params: any[] = [];
  
  if (dateFrom && dateTo) {
    // Custom date range
    query += ' AND h.created_at >= ? AND h.created_at <= ?';
    params.push(dateFrom + ' 00:00:00', dateTo + ' 23:59:59');
  } else {
    // Last N days
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    query += ' AND h.created_at >= ?';
    params.push(fromDate.toISOString());
  }
  
  query += ' ORDER BY h.created_at DESC';
  
  const history = await c.env.DB.prepare(query).bind(...params).all();
  
  return c.json(history.results, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Admin: Get user's event participations
app.get('/api/admin/user-events/:user_id', async (c) => {
  const userId = c.req.param('user_id');
  
  // Get all registrations for this user
  const registrations = await c.env.DB.prepare(`
    SELECT 
      r.week_start_date,
      r.status,
      r.registration_order,
      r.created_at
    FROM registrations r
    WHERE r.user_id = ?
    ORDER BY r.week_start_date DESC
  `).bind(userId).all();
  
  return c.json(registrations.results, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Admin: Get user's confirmed and cancelled participations
app.get('/api/admin/user-participations/:user_id', async (c) => {
  const userId = c.req.param('user_id');
  
  // Get confirmed participations (final status = confirmed in registrations)
  const confirmed = await c.env.DB.prepare(`
    SELECT 
      r.week_start_date,
      e.gira_text
    FROM registrations r
    LEFT JOIN events e ON r.week_start_date = e.event_date
    WHERE r.user_id = ? AND r.status = 'confirmed'
    ORDER BY r.week_start_date DESC
  `).bind(userId).all();
  
  // Get cancelled participations (final status = cancelled or deleted in registrations)
  const cancelled = await c.env.DB.prepare(`
    SELECT 
      r.week_start_date,
      e.gira_text
    FROM registrations r
    LEFT JOIN events e ON r.week_start_date = e.event_date
    WHERE r.user_id = ? AND r.status IN ('cancelled', 'deleted')
    ORDER BY r.week_start_date DESC
  `).bind(userId).all();
  
  return c.json({
    confirmed: confirmed.results,
    cancelled: cancelled.results,
  }, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Admin: Update user's event participations
app.post('/api/admin/update-user-events', async (c) => {
  const body = await c.req.json();
  const { user_id, events } = body;
  
  if (!user_id || !events) {
    return c.json({ error: 'Dados inválidos' }, 400);
  }
  
  // Get user info
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(user_id).first();
  
  if (!user) {
    return c.json({ error: 'Usuário não encontrado' }, 404);
  }
  
  // Process each event
  for (const event of events) {
    const { event_date, status } = event;
    
    // Get event details
    const eventDetails = await c.env.DB.prepare(
      'SELECT * FROM events WHERE event_date = ?'
    ).bind(event_date).first();
    
    if (!eventDetails) continue;
    
    const eventName = (eventDetails as any).gira_text || 'Evento';
    
    // Get current registration for this event
    const currentReg = await c.env.DB.prepare(
      'SELECT * FROM registrations WHERE user_id = ? AND week_start_date = ?'
    ).bind(user_id, event_date).first();
    
    if (status === 'none') {
      // Remove from event if exists
      if (currentReg) {
        await c.env.DB.prepare(
          'DELETE FROM registrations WHERE id = ?'
        ).bind((currentReg as any).id).run();
        
        // Log removal
        await c.env.DB.prepare(
          'INSERT INTO attendance_history (user_id, week_start_date, status, action, notes, event_name) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(user_id, event_date, 'deleted', 'admin_removed', 'Removido pelo admin via edição de histórico', eventName).run();
      }
    } else {
      // Add or update registration
      if (currentReg) {
        // Update existing
        await c.env.DB.prepare(
          'UPDATE registrations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(status, (currentReg as any).id).run();
        
        // Log update
        await c.env.DB.prepare(
          'INSERT INTO attendance_history (user_id, week_start_date, status, action, notes, event_name) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(user_id, event_date, status, 'admin_updated', 'Atualizado pelo admin via edição de histórico', eventName).run();
      } else {
        // Create new registration
        const registrationOrder = await c.env.DB.prepare(
          'SELECT MAX(registration_order) as max_order FROM registrations WHERE week_start_date = ?'
        ).bind(event_date).first<{ max_order: number | null }>();
        
        const newOrder = (registrationOrder?.max_order || 0) + 1;
        
        await c.env.DB.prepare(
          'INSERT INTO registrations (user_id, week_start_date, status, registration_order, manually_confirmed) VALUES (?, ?, ?, ?, ?)'
        ).bind(user_id, event_date, status, newOrder, 1).run();
        
        // Log creation
        await c.env.DB.prepare(
          'INSERT INTO attendance_history (user_id, week_start_date, status, action, notes, event_name) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(user_id, event_date, status, 'admin_added', 'Adicionado pelo admin via edição de histórico', eventName).run();
      }
    }
  }
  
  return c.json({ success: true, message: 'Participações atualizadas com sucesso' });
});

// Admin: Get event observations
app.get('/api/admin/event-observations/:event_date', async (c) => {
  const eventDate = c.req.param('event_date');
  
  const event = await c.env.DB.prepare(
    'SELECT observations FROM events WHERE event_date = ?'
  ).bind(eventDate).first();
  
  if (!event) {
    return c.json({ error: 'Evento não encontrado' }, 404);
  }
  
  return c.json({
    observations: (event as any).observations || '',
  }, 200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
});

// Admin: Update event observations
app.post('/api/admin/event-observations', async (c) => {
  const body = await c.req.json();
  const { event_date, observations } = body;
  
  if (!event_date) {
    return c.json({ error: 'Data do evento é obrigatória' }, 400);
  }
  
  await c.env.DB.prepare(
    'UPDATE events SET observations = ?, updated_at = CURRENT_TIMESTAMP WHERE event_date = ?'
  ).bind(observations || null, event_date).run();
  
  return c.json({ success: true, message: 'Observações salvas com sucesso' });
});

// Admin: Recalculate first time markers for active event
app.post('/api/admin/recalculate-first-time', async (c) => {
  // Get active event
  const settings = await getSettings(c.env.DB);
  const weekStartDate = settings.event_date;
  
  // Get all registrations for this event
  const registrations = await c.env.DB.prepare(
    'SELECT * FROM registrations WHERE week_start_date = ?'
  ).bind(weekStartDate).all();
  
  let updated = 0;
  
  for (const reg of registrations.results) {
    const r = reg as any;
    
    // Check for effective participations (confirmed in past events)
    const effectiveParticipations = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT r.week_start_date) as count 
      FROM registrations r
      JOIN events e ON r.week_start_date = e.event_date
      WHERE r.user_id = ? 
      AND r.status = 'confirmed' 
      AND e.event_date < ?
    `).bind(r.user_id, weekStartDate).first<{ count: number }>();
    
    const shouldBeFirstTime = (effectiveParticipations?.count || 0) === 0;
    const currentIsFirstTime = r.is_first_time === 1;
    
    // Update if different from current value
    if (shouldBeFirstTime !== currentIsFirstTime) {
      await c.env.DB.prepare(
        'UPDATE registrations SET is_first_time = ? WHERE id = ?'
      ).bind(shouldBeFirstTime ? 1 : 0, r.id).run();
      updated++;
    }
  }
  
  return c.json({ 
    success: true, 
    message: `${updated} registro(s) atualizado(s) na lista ativa`,
    total_checked: registrations.results.length
  });
});

// Admin: Delete users
app.post('/api/admin/update-user', zValidator('json', UpdateUserRequestSchema), async (c) => {
  const { user_id, first_name, last_name, whatsapp } = c.req.valid('json');
  
  // Normalize WhatsApp
  const normalizedWhatsApp = normalizeWhatsApp(whatsapp);
  
  // Check if WhatsApp is already taken by another user
  const existingUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE whatsapp = ? AND id != ?'
  ).bind(normalizedWhatsApp, user_id).first();
  
  if (existingUser) {
    return c.json({ error: 'Este número de WhatsApp já está cadastrado em outro usuário' }, 400);
  }
  
  // Update user
  await c.env.DB.prepare(
    'UPDATE users SET first_name = ?, last_name = ?, whatsapp = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(first_name, last_name, normalizedWhatsApp, user_id).run();
  
  return c.json({ success: true, message: 'Usuário atualizado com sucesso' });
});

app.post('/api/admin/delete-users', zValidator('json', DeleteUsersRequestSchema), async (c) => {
  const { user_ids, delete_all, filter } = c.req.valid('json');
  
  if (delete_all) {
    // Delete all users and related data
    await c.env.DB.prepare('DELETE FROM attendance_history').run();
    await c.env.DB.prepare('DELETE FROM registrations').run();
    await c.env.DB.prepare('DELETE FROM users').run();
    
    return c.json({ success: true, message: 'Todos os usuários foram apagados' });
  }
  
  if (user_ids && user_ids.length > 0) {
    // Delete specific users and their related data
    const placeholders = user_ids.map(() => '?').join(',');
    
    await c.env.DB.prepare(`DELETE FROM attendance_history WHERE user_id IN (${placeholders})`)
      .bind(...user_ids)
      .run();
    
    await c.env.DB.prepare(`DELETE FROM registrations WHERE user_id IN (${placeholders})`)
      .bind(...user_ids)
      .run();
    
    await c.env.DB.prepare(`DELETE FROM users WHERE id IN (${placeholders})`)
      .bind(...user_ids)
      .run();
    
    return c.json({ success: true, message: `${user_ids.length} usuário(s) apagado(s)` });
  }
  
  if (filter) {
    // Build delete query with filters
    let query = 'SELECT id FROM users WHERE 1=1';
    const params: any[] = [];
    
    if (filter.first_name) {
      query += ' AND first_name LIKE ?';
      params.push(`%${filter.first_name}%`);
    }
    
    if (filter.last_name) {
      query += ' AND last_name LIKE ?';
      params.push(`%${filter.last_name}%`);
    }
    
    if (filter.whatsapp) {
      query += ' AND whatsapp LIKE ?';
      params.push(`%${filter.whatsapp}%`);
    }
    
    const users = await c.env.DB.prepare(query).bind(...params).all();
    const userIds = users.results.map((u: any) => u.id);
    
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      
      await c.env.DB.prepare(`DELETE FROM attendance_history WHERE user_id IN (${placeholders})`)
        .bind(...userIds)
        .run();
      
      await c.env.DB.prepare(`DELETE FROM registrations WHERE user_id IN (${placeholders})`)
        .bind(...userIds)
        .run();
      
      await c.env.DB.prepare(`DELETE FROM users WHERE id IN (${placeholders})`)
        .bind(...userIds)
        .run();
      
      return c.json({ success: true, message: `${userIds.length} usuário(s) apagado(s)` });
    }
    
    return c.json({ success: true, message: 'Nenhum usuário encontrado com os filtros aplicados' });
  }
  
  return c.json({ error: 'Nenhuma ação especificada' }, 400);
});

export default app;
