import z from "zod";

// User schemas
export const UserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  whatsapp: z.string(),
  times_invited: z.number(),
  is_blocked: z.number(),
  blocked_until: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type User = z.infer<typeof UserSchema>;

// Registration schemas
export const RegistrationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  week_start_date: z.string(),
  status: z.string(), // 'pending', 'confirmed', 'waitlist', 'cancelled'
  registration_order: z.number(),
  manually_confirmed: z.number().optional(),
  is_first_time: z.number().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Registration = z.infer<typeof RegistrationSchema>;

// Combined registration with user data
export const RegistrationWithUserSchema = RegistrationSchema.extend({
  user: UserSchema,
});

export type RegistrationWithUser = z.infer<typeof RegistrationWithUserSchema>;

// Settings schema
export const SettingsSchema = z.object({
  max_capacity: z.number(),
  gira_prefix: z.string().optional(),
  gira_text: z.string(),
  header_text: z.string(),
  event_date: z.string(), // Data da gira
  event_time: z.string(), // Hora da gira
  registration_opens_at: z.string(), // Data e hora de abertura (datetime completo)
  registration_closes_at: z.string(), // Data e hora de fechamento (datetime completo)
  logo_url: z.string().optional(),
  logo_size: z.number().optional(),
  theme_mode: z.string().optional(), // 'auto' ou 'manual'
  theme_color_1: z.string().optional(), // Primeira cor em hex
  theme_color_2: z.string().optional(), // Segunda cor em hex (para gradiente)
  whatsapp_confirmed_message: z.string().optional(),
  whatsapp_waitlist_message: z.string().optional(),
  whatsapp_waitlist_secondary_message: z.string().optional(),
  has_active_event: z.boolean().optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;

// API request/response schemas
export const RegisterRequestSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  whatsapp: z.string().regex(/^\d{11}$/),
  is_first_time: z.boolean().optional(),
});

export const CancelRequestSchema = z.object({
  whatsapp: z.string().regex(/^\d{11}$/),
});

export const AdminLoginRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const UpdateSettingsRequestSchema = z.object({
  max_capacity: z.number().min(1).optional(),
  gira_prefix: z.string().optional(),
  gira_text: z.string().optional(),
  header_text: z.string().optional(),
  event_date: z.string().optional(),
  event_time: z.string().optional(),
  registration_opens_at: z.string().optional(),
  registration_closes_at: z.string().optional(),
  logo_url: z.string().optional(),
  logo_size: z.number().optional(),
  theme_mode: z.string().optional(),
  theme_color_1: z.string().optional(),
  theme_color_2: z.string().optional(),
  whatsapp_confirmed_message: z.string().optional(),
  whatsapp_waitlist_message: z.string().optional(),
  whatsapp_waitlist_secondary_message: z.string().optional(),
});

export const UpdateUserRequestSchema = z.object({
  user_id: z.number(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  whatsapp: z.string().regex(/^\d{11}$/),
});

export const ChangePasswordRequestSchema = z.object({
  current_password: z.string(),
  new_password: z.string().min(4),
});

export const DeleteHistoryRequestSchema = z.object({
  ids: z.array(z.number()).optional(),
  filter: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    whatsapp: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
  }).optional(),
});

export const UpdateRegistrationOrderRequestSchema = z.object({
  registration_id: z.number(),
  new_order: z.number().min(1),
});

export const RegistrationActionRequestSchema = z.object({
  registration_id: z.number(),
  action: z.enum(['confirm', 'delete', 'move_to_waitlist', 'move_to_waitlist_secondary', 'move_to_blocked', 'move_to_confirmed', 'move_to_pending']),
});

export const UnblockUserRequestSchema = z.object({
  user_id: z.number(),
});

export const BlockUserDirectlyRequestSchema = z.object({
  whatsapp: z.string(),
  reason: z.string().optional(),
});

export const BlockedUserActionRequestSchema = z.object({
  user_id: z.number(),
  action: z.enum(['move_to_pending', 'move_to_waitlist', 'move_to_waitlist_secondary', 'move_to_confirmed', 'unblock']),
});

// Admin user schemas
export const AdminUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  is_master: z.number(),
  permissions: z.string(), // 'all' or comma-separated list like 'list,settings,history'
  granular_permissions: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type AdminUser = z.infer<typeof AdminUserSchema>;

export const CreateAdminUserRequestSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
  confirm_password: z.string().min(4),
  permissions: z.array(z.string()),
  granular_permissions: z.string().optional(),
  master_password: z.string().optional(),
});

export const UpdateAdminUserRequestSchema = z.object({
  admin_id: z.number(),
  username: z.string().min(3).optional(),
  password: z.string().min(4).optional(),
  permissions: z.array(z.string()).optional(),
  granular_permissions: z.string().optional(),
  master_password: z.string().optional(),
});

export const DeleteAdminUserRequestSchema = z.object({
  admin_id: z.number(),
  master_password: z.string().optional(),
});

export const AddUserRequestSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  whatsapp: z.string().regex(/^\d{11,15}$/),
  master_password: z.string(),
});

export const DeleteUsersRequestSchema = z.object({
  user_ids: z.array(z.number()).optional(),
  delete_all: z.boolean().optional(),
  filter: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    whatsapp: z.string().optional(),
  }).optional(),
});
