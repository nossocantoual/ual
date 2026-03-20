// Permission levels for fields
export type PermissionLevel = 'none' | 'read' | 'write';

// Granular permissions structure
export interface GranularPermissions {
  settings?: {
    gira_text?: PermissionLevel;
    header_text?: PermissionLevel;
    event_date?: PermissionLevel;
    event_time?: PermissionLevel;
    registration_opens_at?: PermissionLevel;
    registration_closes_at?: PermissionLevel;
    max_capacity?: PermissionLevel;
    clear_all_data?: PermissionLevel;
  };
  list?: {
    view_confirmed?: PermissionLevel;
    view_waitlist?: PermissionLevel;
    view_waitlist_secondary?: PermissionLevel;
    confirm_registration?: PermissionLevel;
    delete_registration?: PermissionLevel;
    move_registration?: PermissionLevel;
    export_csv?: PermissionLevel;
  };
  blocked?: {
    view_blocked?: PermissionLevel;
    unblock_user?: PermissionLevel;
    move_blocked_user?: PermissionLevel;
  };
  cadastrados?: {
    view_users?: PermissionLevel;
    delete_users?: PermissionLevel;
    export_users?: PermissionLevel;
  };
  usuarios?: {
    view_admins?: PermissionLevel;
    create_admin?: PermissionLevel;
    edit_admin?: PermissionLevel;
    delete_admin?: PermissionLevel;
    change_own_password?: PermissionLevel;
  };
  history?: {
    view_history?: PermissionLevel;
    export_history?: PermissionLevel;
    delete_history?: PermissionLevel;
  };
}

// Default permissions for new admin users
export const DEFAULT_GRANULAR_PERMISSIONS: GranularPermissions = {
  settings: {
    gira_text: 'none',
    header_text: 'none',
    event_date: 'none',
    event_time: 'none',
    registration_opens_at: 'none',
    registration_closes_at: 'none',
    max_capacity: 'none',
    clear_all_data: 'none',
  },
  list: {
    view_confirmed: 'none',
    view_waitlist: 'none',
    view_waitlist_secondary: 'none',
    confirm_registration: 'none',
    delete_registration: 'none',
    move_registration: 'none',
    export_csv: 'none',
  },
  blocked: {
    view_blocked: 'none',
    unblock_user: 'none',
    move_blocked_user: 'none',
  },
  cadastrados: {
    view_users: 'none',
    delete_users: 'none',
    export_users: 'none',
  },
  usuarios: {
    view_admins: 'none',
    create_admin: 'none',
    edit_admin: 'none',
    delete_admin: 'none',
    change_own_password: 'write',
  },
  history: {
    view_history: 'none',
    export_history: 'none',
    delete_history: 'none',
  },
};

// Helper to check if user has permission for a specific field
export function hasFieldPermission(
  granularPermissions: GranularPermissions | null,
  isMaster: boolean,
  section: keyof GranularPermissions,
  field: string,
  requiredLevel: 'read' | 'write' = 'read'
): boolean {
  // Master has all permissions
  if (isMaster) return true;
  
  if (!granularPermissions) return false;
  
  const sectionPerms = granularPermissions[section];
  if (!sectionPerms) return false;
  
  const fieldPerm = (sectionPerms as any)[field] as PermissionLevel | undefined;
  
  if (!fieldPerm || fieldPerm === 'none') return false;
  
  if (requiredLevel === 'write') {
    return fieldPerm === 'write';
  }
  
  return fieldPerm === 'read' || fieldPerm === 'write';
}

// Field labels for UI
export const FIELD_LABELS: Record<string, Record<string, string>> = {
  settings: {
    gira_text: 'Texto GIRA',
    header_text: 'Texto do Cabeçalho',
    event_date: 'Data da Gira',
    event_time: 'Hora da Gira',
    registration_opens_at: 'Abertura das Inscrições',
    registration_closes_at: 'Fechamento das Inscrições',
    max_capacity: 'Capacidade Máxima',
    clear_all_data: 'Apagar Dados do Evento',
  },
  list: {
    view_confirmed: 'Visualizar Lista de Confirmados',
    view_waitlist: 'Visualizar Lista de Espera Prioritária',
    view_waitlist_secondary: 'Visualizar Lista de Espera Secundária',
    confirm_registration: 'Confirmar Inscrição',
    delete_registration: 'Excluir Inscrição',
    move_registration: 'Mover Inscrição entre Listas',
    export_csv: 'Exportar CSV',
  },
  blocked: {
    view_blocked: 'Visualizar Usuários Suspensos',
    unblock_user: 'Desbloquear Usuário',
    move_blocked_user: 'Mover Usuário Suspenso para Listas',
  },
  cadastrados: {
    view_users: 'Visualizar Usuários Cadastrados',
    delete_users: 'Excluir Usuários',
    export_users: 'Exportar Usuários',
  },
  usuarios: {
    view_admins: 'Visualizar Administradores',
    create_admin: 'Criar Novo Administrador',
    edit_admin: 'Editar Administrador',
    delete_admin: 'Excluir Administrador',
    change_own_password: 'Alterar Própria Senha',
  },
  history: {
    view_history: 'Visualizar Histórico',
    export_history: 'Exportar Histórico',
    delete_history: 'Excluir Registros do Histórico',
  },
};
