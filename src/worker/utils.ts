import type { Settings, User, RegistrationWithUser } from '@/shared/types';

export function getWeekStartDate(weeklyDay: number, fromDate: Date = new Date()): string {
  // This function is deprecated but kept for compatibility
  // Use the event_start_date from settings instead
  const date = new Date(fromDate);
  const currentDay = date.getDay();
  const diff = currentDay - weeklyDay;
  const daysToSubtract = diff >= 0 ? diff : 7 + diff;
  date.setDate(date.getDate() - daysToSubtract);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
}

export function getEventDate(eventStartDate: string): string {
  // Return the event date from settings
  return eventStartDate;
}

export async function ensureSingleActiveEvent(db: any): Promise<void> {
  // Check how many active events there are
  const activeEvents = await db.prepare(
    'SELECT event_date FROM events WHERE is_active = 1 ORDER BY event_date DESC'
  ).all();
  
  if (activeEvents.results.length > 1) {
    // Multiple active events - keep only the most recent one
    const mostRecent = activeEvents.results[0] as any;
    
    // Set all to inactive first
    await db.prepare('UPDATE events SET is_active = 0').run();
    
    // Set the most recent one as active
    await db.prepare('UPDATE events SET is_active = 1 WHERE event_date = ?')
      .bind(mostRecent.event_date)
      .run();
  }
}

export async function autoSetClosestActiveEvent(db: any): Promise<void> {
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
  
  // Find an event for today or in the future ONLY
  const futureEvent = await db.prepare(
    'SELECT * FROM events WHERE event_date >= ? ORDER BY event_date ASC LIMIT 1'
  ).bind(todayBrasilia).first();
  
  if (futureEvent) {
    await setActiveEvent(db, (futureEvent as any).event_date);
    return;
  }
  
  // If no future events, do NOT activate anything (no fallback to past events)
  // This ensures the homepage won't show old events
}

export async function getSettings(db: any): Promise<Settings> {
  // Get all global settings in a single query (much faster)
  const globalSettings = await db.prepare(
    "SELECT key, value FROM settings WHERE key IN ('theme_mode', 'theme_color_1', 'theme_color_2', 'logo_url', 'logo_size')"
  ).all();
  
  const globalSettingsMap: Record<string, string> = {};
  for (const row of globalSettings.results) {
    globalSettingsMap[(row as any).key] = (row as any).value;
  }
  
  const themeMode = globalSettingsMap.theme_mode || 'auto';
  const themeColor1 = globalSettingsMap.theme_color_1 || undefined;
  const themeColor2 = globalSettingsMap.theme_color_2 || undefined;
  
  // Check if there's an active event (NO automatic activation)
  const activeEvent = await db.prepare(
    'SELECT * FROM events WHERE is_active = 1 ORDER BY event_date DESC LIMIT 1'
  ).first();
  
  if (activeEvent) {
    // Get logo from event first, fallback to global settings (already fetched above)
    let logoUrl = (activeEvent as any).logo_url || globalSettingsMap.logo_url || undefined;
    let logoSize = (activeEvent as any).logo_size || (globalSettingsMap.logo_size ? parseInt(globalSettingsMap.logo_size) : 256);
    
    return {
      max_capacity: (activeEvent as any).max_capacity,
      gira_prefix: (activeEvent as any).gira_prefix || undefined,
      gira_text: (activeEvent as any).gira_text,
      header_text: (activeEvent as any).header_text,
      event_date: (activeEvent as any).event_date,
      event_time: (activeEvent as any).event_time,
      registration_opens_at: (activeEvent as any).registration_opens_at,
      registration_closes_at: (activeEvent as any).registration_closes_at,
      logo_url: logoUrl,
      logo_size: logoSize,
      theme_mode: themeMode,
      theme_color_1: themeColor1,
      theme_color_2: themeColor2,
      whatsapp_confirmed_message: (activeEvent as any).whatsapp_confirmed_message || undefined,
      whatsapp_waitlist_message: (activeEvent as any).whatsapp_waitlist_message || undefined,
      whatsapp_waitlist_secondary_message: (activeEvent as any).whatsapp_waitlist_secondary_message || undefined,
    };
  }
  
  // Fallback to old settings table if no active event
  const rows = await db.prepare('SELECT key, value FROM settings').all();
  
  const settingsMap: Record<string, string> = {};
  for (const row of rows.results) {
    settingsMap[(row as { key: string; value: string }).key] = (row as { key: string; value: string }).value;
  }
  
  const now = new Date();
  const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const defaultDate = brasiliaTime.toISOString().split('T')[0];
  const defaultDateTime = brasiliaTime.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  
  return {
    max_capacity: parseInt(settingsMap.max_capacity || '30'),
    gira_prefix: settingsMap.gira_prefix || undefined,
    gira_text: settingsMap.gira_text || 'Gira de',
    header_text: settingsMap.header_text || 'Lista de presença',
    event_date: settingsMap.event_date || settingsMap.event_start_date || defaultDate,
    event_time: settingsMap.event_time || '19:30',
    registration_opens_at: settingsMap.registration_opens_at || defaultDateTime,
    registration_closes_at: settingsMap.registration_closes_at || defaultDateTime,
    logo_url: settingsMap.logo_url,
    logo_size: settingsMap.logo_size ? parseInt(settingsMap.logo_size) : 256,
    theme_mode: settingsMap.theme_mode || 'auto',
    theme_color_1: settingsMap.theme_color_1,
    theme_color_2: settingsMap.theme_color_2,
    whatsapp_confirmed_message: settingsMap.whatsapp_confirmed_message || undefined,
    whatsapp_waitlist_message: settingsMap.whatsapp_waitlist_message || undefined,
    whatsapp_waitlist_secondary_message: settingsMap.whatsapp_waitlist_secondary_message || undefined,
  };
}

export async function getEventSettings(db: any, eventDate: string): Promise<Settings | null> {
  // Get all global settings in a single query (much faster)
  const globalSettings = await db.prepare(
    "SELECT key, value FROM settings WHERE key IN ('theme_mode', 'theme_color_1', 'theme_color_2', 'logo_url', 'logo_size')"
  ).all();
  
  const eventSettingsMap: Record<string, string> = {};
  for (const row of globalSettings.results) {
    eventSettingsMap[(row as any).key] = (row as any).value;
  }
  
  const themeMode = eventSettingsMap.theme_mode || 'auto';
  const themeColor1 = eventSettingsMap.theme_color_1 || undefined;
  const themeColor2 = eventSettingsMap.theme_color_2 || undefined;
  
  const event = await db.prepare(
    'SELECT * FROM events WHERE event_date = ?'
  ).bind(eventDate).first();
  
  if (!event) return null;
  
  // Get logo from event first, fallback to global settings (already fetched above)
  let logoUrl = (event as any).logo_url || eventSettingsMap.logo_url || undefined;
  let logoSize = (event as any).logo_size || (eventSettingsMap.logo_size ? parseInt(eventSettingsMap.logo_size) : 256);
  
  // Get WhatsApp messages from event, fallback to active event
  let whatsappConfirmedMessage = (event as any).whatsapp_confirmed_message;
  let whatsappWaitlistMessage = (event as any).whatsapp_waitlist_message;
  let whatsappWaitlistSecondaryMessage = (event as any).whatsapp_waitlist_secondary_message;
  
  // If event doesn't have messages, get from active event
  if (!whatsappConfirmedMessage || !whatsappWaitlistMessage || !whatsappWaitlistSecondaryMessage) {
    const activeEvent = await db.prepare(
      'SELECT whatsapp_confirmed_message, whatsapp_waitlist_message, whatsapp_waitlist_secondary_message FROM events WHERE is_active = 1 LIMIT 1'
    ).first();
    
    if (activeEvent) {
      whatsappConfirmedMessage = whatsappConfirmedMessage || (activeEvent as any).whatsapp_confirmed_message;
      whatsappWaitlistMessage = whatsappWaitlistMessage || (activeEvent as any).whatsapp_waitlist_message;
      whatsappWaitlistSecondaryMessage = whatsappWaitlistSecondaryMessage || (activeEvent as any).whatsapp_waitlist_secondary_message;
    }
  }
  
  return {
    max_capacity: (event as any).max_capacity,
    gira_prefix: (event as any).gira_prefix || undefined,
    gira_text: (event as any).gira_text,
    header_text: (event as any).header_text,
    event_date: (event as any).event_date,
    event_time: (event as any).event_time,
    registration_opens_at: (event as any).registration_opens_at,
    registration_closes_at: (event as any).registration_closes_at,
    logo_url: logoUrl,
    logo_size: logoSize,
    theme_mode: themeMode,
    theme_color_1: themeColor1,
    theme_color_2: themeColor2,
    whatsapp_confirmed_message: whatsappConfirmedMessage || undefined,
    whatsapp_waitlist_message: whatsappWaitlistMessage || undefined,
    whatsapp_waitlist_secondary_message: whatsappWaitlistSecondaryMessage || undefined,
  };
}

export async function updateSettings(db: any, updates: Partial<Settings>): Promise<void> {
  // Handle logo_url, logo_size, theme_mode, theme_color_1, and theme_color_2 separately as they're stored in settings table
  // Use INSERT OR REPLACE to ensure records are created if they don't exist
  if (updates.logo_url !== undefined) {
    await db.prepare('INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, COALESCE((SELECT created_at FROM settings WHERE key = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)')
      .bind('logo_url', String(updates.logo_url), 'logo_url')
      .run();
  }
  
  if (updates.logo_size !== undefined) {
    await db.prepare('INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, COALESCE((SELECT created_at FROM settings WHERE key = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)')
      .bind('logo_size', String(updates.logo_size), 'logo_size')
      .run();
  }
  
  if (updates.theme_mode !== undefined) {
    await db.prepare('INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, COALESCE((SELECT created_at FROM settings WHERE key = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)')
      .bind('theme_mode', String(updates.theme_mode), 'theme_mode')
      .run();
  }
  
  if (updates.theme_color_1 !== undefined) {
    await db.prepare('INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, COALESCE((SELECT created_at FROM settings WHERE key = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)')
      .bind('theme_color_1', String(updates.theme_color_1), 'theme_color_1')
      .run();
  }
  
  if (updates.theme_color_2 !== undefined) {
    await db.prepare('INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, COALESCE((SELECT created_at FROM settings WHERE key = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)')
      .bind('theme_color_2', String(updates.theme_color_2), 'theme_color_2')
      .run();
  }
  
  // Update the active event with remaining fields
  const activeEvent = await db.prepare(
    'SELECT * FROM events WHERE is_active = 1 ORDER BY event_date DESC LIMIT 1'
  ).first();
  
  if (activeEvent) {
    const updateFields: string[] = [];
    const params: any[] = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'logo_url' && key !== 'logo_size' && key !== 'theme_mode' && key !== 'theme_color_1' && key !== 'theme_color_2') {
        updateFields.push(`${key} = ?`);
        // Handle undefined/null values properly - store as null in database
        if (value === undefined || value === null) {
          params.push(null);
        } else {
          params.push(String(value));
        }
      }
    }
    
    if (updateFields.length > 0) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      params.push((activeEvent as any).id);
      
      await db.prepare(
        `UPDATE events SET ${updateFields.join(', ')} WHERE id = ?`
      ).bind(...params).run();
    }
  } else {
    // Fallback to old settings table
    const promises = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'logo_url' && key !== 'logo_size' && key !== 'theme_mode' && key !== 'theme_color_1' && key !== 'theme_color_2') {
        promises.push(
          db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
            .bind(String(value), key)
            .run()
        );
      }
    }
    
    await Promise.all(promises);
  }
}

export async function updateEventSettings(db: any, eventDate: string, updates: Partial<Settings>): Promise<void> {
  const updateFields: string[] = [];
  const params: any[] = [];
  
  for (const [key, value] of Object.entries(updates)) {
    updateFields.push(`${key} = ?`);
    // Handle undefined/null values properly - store as null in database
    if (value === undefined || value === null) {
      params.push(null);
    } else {
      params.push(String(value));
    }
  }
  
  if (updateFields.length > 0) {
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(eventDate);
    
    await db.prepare(
      `UPDATE events SET ${updateFields.join(', ')} WHERE event_date = ?`
    ).bind(...params).run();
  }
}

export async function createEvent(
  db: any,
  eventDate: string,
  settings: Partial<Settings> & { event_date: string }
): Promise<void> {
  // If WhatsApp messages are not provided, get them from active event
  let whatsappConfirmedMessage = settings.whatsapp_confirmed_message;
  let whatsappWaitlistMessage = settings.whatsapp_waitlist_message;
  let whatsappWaitlistSecondaryMessage = settings.whatsapp_waitlist_secondary_message;
  
  if (!whatsappConfirmedMessage || !whatsappWaitlistMessage || !whatsappWaitlistSecondaryMessage) {
    const activeEvent = await db.prepare(
      'SELECT whatsapp_confirmed_message, whatsapp_waitlist_message, whatsapp_waitlist_secondary_message FROM events WHERE is_active = 1 LIMIT 1'
    ).first();
    
    if (activeEvent) {
      whatsappConfirmedMessage = whatsappConfirmedMessage || (activeEvent as any).whatsapp_confirmed_message;
      whatsappWaitlistMessage = whatsappWaitlistMessage || (activeEvent as any).whatsapp_waitlist_message;
      whatsappWaitlistSecondaryMessage = whatsappWaitlistSecondaryMessage || (activeEvent as any).whatsapp_waitlist_secondary_message;
    }
  }
  
  await db.prepare(
    `INSERT INTO events (
      event_date,
      gira_prefix,
      gira_text,
      header_text,
      event_time,
      registration_opens_at,
      registration_closes_at,
      max_capacity,
      logo_url,
      logo_size,
      whatsapp_confirmed_message,
      whatsapp_waitlist_message,
      whatsapp_waitlist_secondary_message,
      is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    eventDate,
    settings.gira_prefix || null,
    settings.gira_text || '',
    settings.header_text || 'Lista de presença',
    settings.event_time || '19:30',
    settings.registration_opens_at || `${eventDate}T08:00`,
    settings.registration_closes_at || `${eventDate}T18:00`,
    settings.max_capacity || 30,
    settings.logo_url || null,
    settings.logo_size || null,
    whatsappConfirmedMessage || null,
    whatsappWaitlistMessage || null,
    whatsappWaitlistSecondaryMessage || null,
    0
  ).run();
}

export async function setActiveEvent(db: any, eventDate: string): Promise<void> {
  // Set all events to inactive
  await db.prepare('UPDATE events SET is_active = 0').run();
  
  // Set the selected event as active
  await db.prepare('UPDATE events SET is_active = 1 WHERE event_date = ?')
    .bind(eventDate)
    .run();
}

export async function getAllEvents(db: any): Promise<any[]> {
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
  
  // Get only active event and future events (events with date >= today in Brasilia time)
  const events = await db.prepare(
    'SELECT * FROM events WHERE is_active = 1 OR event_date >= ? ORDER BY event_date ASC'
  ).bind(todayBrasilia).all();
  
  return events.results;
}

export async function getAllEventsIncludingPast(db: any): Promise<any[]> {
  // Return ALL events (past, present, and future) in chronological ascending order
  const events = await db.prepare(
    'SELECT * FROM events ORDER BY event_date ASC'
  ).all();
  
  return events.results;
}

export function isWithinOpeningHours(settings: Settings): boolean {
  const now = new Date();
  const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  
  // Convert registration datetime strings to Date objects in Brasilia timezone
  const opensAt = new Date(settings.registration_opens_at);
  const closesAt = new Date(settings.registration_closes_at);
  
  // Check if current time is within registration period
  return brasiliaTime >= opensAt && brasiliaTime <= closesAt;
}

export async function getOrCreateUser(
  db: any,
  firstName: string,
  lastName: string,
  whatsapp: string
): Promise<User> {
  // Normalize WhatsApp number to remove Brazilian country code (55) if present
  const normalizedWhatsapp = normalizeWhatsApp(whatsapp);
  
  let user = await db.prepare('SELECT * FROM users WHERE whatsapp = ?')
    .bind(normalizedWhatsapp)
    .first() as User | null;
  
  if (!user) {
    const result = await db.prepare(
      'INSERT INTO users (first_name, last_name, whatsapp) VALUES (?, ?, ?)'
    ).bind(firstName, lastName, normalizedWhatsapp).run();
    
    user = await db.prepare('SELECT * FROM users WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first() as User | null;
  }
  
  return user!;
}

export async function isUserBlocked(user: User): Promise<boolean> {
  if (!user.is_blocked) return false;
  if (!user.blocked_until) return false;
  
  const blockedUntil = new Date(user.blocked_until);
  const now = new Date();
  
  return now < blockedUntil;
}

export async function getRegistrationsForWeek(
  db: any,
  weekStartDate: string
): Promise<RegistrationWithUser[]> {
  const registrations = await db.prepare(`
    SELECT 
      r.*,
      u.id as user_id,
      u.first_name,
      u.last_name,
      u.whatsapp,
      u.times_invited,
      u.is_blocked,
      u.blocked_until,
      u.created_at as user_created_at,
      u.updated_at as user_updated_at
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.week_start_date = ?
    ORDER BY r.registration_order ASC
  `).bind(weekStartDate).all();
  
  return registrations.results.map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    week_start_date: row.week_start_date,
    status: row.status,
    registration_order: row.registration_order,
    manually_confirmed: row.manually_confirmed,
    is_first_time: row.is_first_time,
    promoted_from: row.promoted_from,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: {
      id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      whatsapp: row.whatsapp,
      times_invited: row.times_invited,
      is_blocked: row.is_blocked,
      blocked_until: row.blocked_until,
      created_at: row.user_created_at,
      updated_at: row.user_updated_at,
    }
  }));
}

export async function promoteFromWaitlist(
  db: any,
  weekStartDate: string
): Promise<RegistrationWithUser | null> {
  const waitlist = await db.prepare(`
    SELECT 
      r.*,
      u.id as user_id,
      u.first_name,
      u.last_name,
      u.whatsapp,
      u.times_invited,
      u.is_blocked,
      u.blocked_until,
      u.created_at as user_created_at,
      u.updated_at as user_updated_at
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.week_start_date = ? AND r.status = 'waitlist'
    ORDER BY r.registration_order ASC
    LIMIT 1
  `).bind(weekStartDate).first();
  
  if (!waitlist) return null;
  
  await db.prepare(
    'UPDATE registrations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind('confirmed', (waitlist as any).id).run();
  
  await db.prepare(
    'INSERT INTO attendance_history (user_id, week_start_date, status, action) VALUES (?, ?, ?, ?)'
  ).bind((waitlist as any).user_id, weekStartDate, 'confirmed', 'promoted_from_waitlist').run();
  
  return {
    id: (waitlist as any).id,
    user_id: (waitlist as any).user_id,
    week_start_date: (waitlist as any).week_start_date,
    status: 'confirmed',
    registration_order: (waitlist as any).registration_order,
    created_at: (waitlist as any).created_at,
    updated_at: new Date().toISOString(),
    user: {
      id: (waitlist as any).user_id,
      first_name: (waitlist as any).first_name,
      last_name: (waitlist as any).last_name,
      whatsapp: (waitlist as any).whatsapp,
      times_invited: (waitlist as any).times_invited,
      is_blocked: (waitlist as any).is_blocked,
      blocked_until: (waitlist as any).blocked_until,
      created_at: (waitlist as any).user_created_at,
      updated_at: (waitlist as any).user_updated_at,
    }
  };
}

export async function autoPromoteFromWaitlists(
  db: any,
  settings: Settings,
  weekStartDate: string,
  excludeRegistrationId?: number
): Promise<void> {
  // Check if we're still within registration period
  // Auto-promotion should only happen until registration closes
  const now = new Date();
  const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const closesAt = new Date(settings.registration_closes_at);
  
  // If registration period has closed, don't auto-promote
  // Only manual admin actions should move people after this point
  if (brasiliaTime > closesAt) {
    return;
  }
  
  // Get count of ALL confirmed registrations (including manually confirmed ones)
  // Manual confirmations by admin should always be respected and count towards capacity
  const activeCount = await db.prepare(
    'SELECT COUNT(*) as count FROM registrations WHERE week_start_date = ? AND status = ?'
  ).bind(weekStartDate, 'confirmed').first();
  
  const currentCount = (activeCount as any)?.count || 0;
  const availableSlots = settings.max_capacity - currentCount;
  
  if (availableSlots <= 0) return;
  
  // Promote from priority waitlist first
  let query = `
    SELECT 
      r.*,
      u.whatsapp
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.week_start_date = ? AND r.status = ?`;
  
  const params: any[] = [weekStartDate, 'waitlist'];
  
  if (excludeRegistrationId) {
    query += ` AND r.id != ?`;
    params.push(excludeRegistrationId);
  }
  
  query += ` ORDER BY r.registration_order ASC LIMIT ?`;
  params.push(availableSlots);
  
  const priorityWaitlist = await db.prepare(query).bind(...params).all();
  
  let promoted = 0;
  
  for (const registration of priorityWaitlist.results) {
    const reg = registration as any;
    
    // Mark as automatic promotion (manually_confirmed = 0) and set promoted_from
    await db.prepare(
      'UPDATE registrations SET status = ?, manually_confirmed = 0, promoted_from = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('confirmed', 'waitlist', reg.id).run();
    
    await db.prepare(
      'UPDATE users SET times_invited = times_invited + 1 WHERE id = ?'
    ).bind(reg.user_id).run();
    
    await db.prepare(
      'INSERT INTO attendance_history (user_id, week_start_date, status, action) VALUES (?, ?, ?, ?)'
    ).bind(reg.user_id, weekStartDate, 'confirmed', 'auto_promoted_from_waitlist').run();
    
    await sendWhatsAppMessage(
      reg.whatsapp,
      'Saravá! \nSeu nome está confirmado para a gira de hoje! Os portões se abrem as 18:45h e a gira inicia as 19:30h.⏰\n O atendimento é realizado por senha, por ordem de chegada. 🔑\n Há prioridade no atendimento para idosos, gestantes e pessoas com comorbidades.👴🏿👵🏿🤰🤰🏿🏥 \nNão há necessidade de vir de branco. \n🚫 NÃO USE:\n- Decotes \n- Saias e vestidos curtos\n- Regata ou blusa sem manga\n- Bermudas | shorts. \nO atendimento é realizado somente por mim, portanto demora mais que o normal!🥱 \nNão há necessidade de chegar para abertura e também não exijo que fique para o encerramento. \n📍Endereço: Rua Adamantina 153 - Condomínio Marambaia. \nCaso precise desistir por qualquer motivo, avise! Há irmãos na espera! Peço que vá até o link e selecione o botão vermelho "Cancelar minha inscrição".\nAxé!'
    );
    
    promoted++;
  }
  
  // Automatic promotion from secondary waitlist has been disabled
  // Only administrators can manually promote from secondary waitlist to confirmed
}

export async function enforceCapacityLimit(
  db: any,
  settings: Settings,
  weekStartDate: string
): Promise<void> {
  // Check if we're still within registration period
  // Capacity enforcement and auto-balancing should only happen until registration closes
  const now = new Date();
  const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const closesAt = new Date(settings.registration_closes_at);
  
  // If registration period has closed, don't auto-adjust
  // Only manual admin actions should move people after this point
  if (brasiliaTime > closesAt) {
    return;
  }
  
  // Get count of ALL confirmed registrations (manual + automatic)
  // We need total count to properly enforce capacity
  const totalCount = await db.prepare(
    'SELECT COUNT(*) as count FROM registrations WHERE week_start_date = ? AND status = ?'
  ).bind(weekStartDate, 'confirmed').first();
  
  const currentCount = (totalCount as any)?.count || 0;
  
  // If we're over capacity, move excess confirmed to waitlist (but never manually confirmed ones)
  if (currentCount > settings.max_capacity) {
    const excess = currentCount - settings.max_capacity;
    
    // Get confirmed registrations ordered by registration_order descending (last ones in)
    // Exclude manually confirmed registrations
    const confirmedToMove = await db.prepare(`
      SELECT 
        r.*,
        u.whatsapp
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.week_start_date = ? AND r.status = ? AND (r.manually_confirmed IS NULL OR r.manually_confirmed = 0)
      ORDER BY r.registration_order DESC
      LIMIT ?
    `).bind(weekStartDate, 'confirmed', excess).all();
    
    // Move each to waitlist
    for (const registration of confirmedToMove.results) {
      const reg = registration as any;
      
      await db.prepare(
        'UPDATE registrations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind('waitlist', reg.id).run();
      
      await db.prepare(
        'INSERT INTO attendance_history (user_id, week_start_date, status, action) VALUES (?, ?, ?, ?)'
      ).bind(reg.user_id, weekStartDate, 'waitlist', 'auto_moved_to_waitlist').run();
      
      await sendWhatsAppMessage(
        reg.whatsapp,
        'Neste momento já completamos todas as senhas para a gira de hoje. Caso tenha desistência, você será informado.'
      );
    }
  } else if (currentCount < settings.max_capacity) {
    // If we have available slots, promote from waitlists
    await autoPromoteFromWaitlists(db, settings, weekStartDate);
  }
}

export function normalizeUsername(username: string): string {
  // Convert to lowercase and remove accents for case-insensitive comparison
  return username
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c');
}

export function normalizeWhatsApp(whatsapp: string): string {
  // Remove all non-numeric characters
  const digitsOnly = whatsapp.replace(/\D/g, '');
  
  // Only DDD + phone number (10-11 digits)
  // No DDI support - Brazilian numbers only
  return digitsOnly;
}

export async function sendWhatsAppMessage(whatsapp: string, message: string): Promise<void> {
  // WhatsApp integration placeholder
  // This would need to be implemented with a WhatsApp Business API
  console.log(`[WhatsApp] To: ${whatsapp}, Message: ${message}`);
}
