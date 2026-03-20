import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Home,
  Settings as SettingsIcon,
  Users,
  Clock,
  Download,
  Check,
  Trash2,
  ArrowDown,
  Ban,
  Unlock,
  MessageCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDownIcon,
  Key,
  Filter,
  X,
  Shield,
  Edit,
  LogOut,
  Save,
  Calendar,
  BarChart3,
  ChevronUp,
  ChevronDown,
} from '@/react-app/components/Icons';
import type { Settings, RegistrationWithUser, User } from '@/shared/types';
import type { GranularPermissions } from '@/shared/permissions';
import { DEFAULT_GRANULAR_PERMISSIONS } from '@/shared/permissions';
import PermissionEditor from '@/react-app/components/PermissionEditor';

type SortField = 'name' | 'date';
type SortOrder = 'asc' | 'desc';

interface SortState {
  field: SortField;
  order: SortOrder;
}

interface AdminUser {
  id: number;
  username: string;
  is_master: number;
  permissions: string;
  granular_permissions: string | null;
  created_at: string;
  updated_at: string;
}

interface CurrentAdmin {
  id: number;
  username: string;
  is_master: number;
  permissions: string;
  granular_permissions?: string | null;
}

export default function Admin() {
  const navigate = useNavigate();
  
  // Custom alert function
  const showAlert = (message: string) => {
    alert(message);
  };
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdmin | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'settings' | 'history' | 'blocked' | 'usuarios' | 'cadastrados' | 'eventos' | 'analytics' | 'pade' | 'mensagens'>('list');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [editedSettings, setEditedSettings] = useState<Settings | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationWithUser[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [weekStartDate, setWeekStartDate] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    registrationId?: number;
    userId?: number;
    userIds?: number[];
    userName: string;
    type: 'registration' | 'blocked' | 'user' | 'users-bulk';
    actionType?: 'delete' | 'move';
  } | null>(null);
  const [confirmedSort, setConfirmedSort] = useState<SortState>({ field: 'date', order: 'asc' });
  const [waitlistSort, setWaitlistSort] = useState<SortState>({ field: 'date', order: 'asc' });
  const [waitlistSecondarySort, setWaitlistSecondarySort] = useState<SortState>({ field: 'date', order: 'asc' });
  const [blockedSort, setBlockedSort] = useState<SortState>({ field: 'date', order: 'asc' });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showHistoryFilter, setShowHistoryFilter] = useState(false);
  const [historyFilter, setHistoryFilter] = useState({
    first_name: '',
    last_name: '',
    whatsapp: '',
    days: 30,
    periodType: 'days' as 'days' | 'custom',
    dateFrom: '',
    dateTo: '',
    userRegistrationFrom: '',
    userRegistrationTo: '',
    showEventHistory: false,
    showPastEvents: false,
  });
  const [historySort, setHistorySort] = useState<{
    field: 'name' | 'whatsapp' | 'created_at' | 'participations' | 'event_date' | 'registrations';
    order: 'asc' | 'desc';
  }>({ field: 'event_date', order: 'asc' });
  const [showHistorySort, setShowHistorySort] = useState(false);
  const [selectedHistoryItems, setSelectedHistoryItems] = useState<number[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showEditAdmin, setShowEditAdmin] = useState<number | null>(null);
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    password: '',
    confirm_password: '',
    permissions: [] as string[],
    granular_permissions: DEFAULT_GRANULAR_PERMISSIONS as GranularPermissions,
    master_password: '',
  });
  const [editAdmin, setEditAdmin] = useState({
    username: '',
    password: '',
    permissions: [] as string[],
    granular_permissions: DEFAULT_GRANULAR_PERMISSIONS as GranularPermissions,
    master_password: '',
  });
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [userFilter, setUserFilter] = useState({
    first_name: '',
    last_name: '',
    whatsapp: '',
  });
  const [showUserFilter, setShowUserFilter] = useState(false);
  const [userSortBy, setUserSortBy] = useState<'first_name' | 'last_name' | 'whatsapp' | 'confirmations' | 'cancellations'>('first_name');
  const [showUserSortDropdown, setShowUserSortDropdown] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<number[]>([]);
  const [userParticipations, setUserParticipations] = useState<Record<number, { confirmed: any[], cancelled: any[] }>>({});
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserData, setEditUserData] = useState({ first_name: '', last_name: '', whatsapp: '' });
  const [editUserError, setEditUserError] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventDate, setSelectedEventDate] = useState<string>('');
  const [showEventCalendar, setShowEventCalendar] = useState(false);
  const [newEventDate, setNewEventDate] = useState('');
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [editEventData, setEditEventData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsFilter, setAnalyticsFilter] = useState({
    days: 30,
    periodType: 'days' as 'days' | 'custom',
    dateFrom: '',
    dateTo: '',
  });
  const [selectedAnalyticsItems, setSelectedAnalyticsItems] = useState<number[]>([]);
  const [showAnalyticsFilter, setShowAnalyticsFilter] = useState(false);
  const [analyticsDeleteFilter, setAnalyticsDeleteFilter] = useState({
    event_types: [] as string[],
    dateFrom: '',
    dateTo: '',
  });
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappSendType, setWhatsappSendType] = useState<'number' | 'group'>('number');
  const [whatsappGroupLink, setWhatsappGroupLink] = useState('');
  const [showRecessForm, setShowRecessForm] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [showObservationsModal, setShowObservationsModal] = useState<string | null>(null);
  const [eventObservations, setEventObservations] = useState('');
  
  // PADÊ states
  const [padeEvents, setPadeEvents] = useState<any[]>([]);
  const [showPadeForm, setShowPadeForm] = useState(false);
  const [showPadeHistory, setShowPadeHistory] = useState(false);
  const [editingPadeEvent, setEditingPadeEvent] = useState<number | null>(null);
  const [padeFormData, setPadeFormData] = useState({
    event_name: '',
    event_type: '',
    event_date: '',
    participants: [] as string[],
    whatsapp_number: '',
  });
  const [padePeople, setPadePeople] = useState<any[]>([]);
  const [selectedPadePerson, setSelectedPadePerson] = useState('');
  const [showPadePeopleManager, setShowPadePeopleManager] = useState(false);
  const [newPadePersonName, setNewPadePersonName] = useState('');
  const [newPadePersonWhatsApp, setNewPadePersonWhatsApp] = useState('');
  
  // Blocked users history states
  const [showBlockedHistory, setShowBlockedHistory] = useState(false);
  const [blockedHistory, setBlockedHistory] = useState<any[]>([]);
  const [blockedHistoryFilter, setBlockedHistoryFilter] = useState({
    days: 30,
    periodType: 'days' as 'days' | 'custom',
    dateFrom: '',
    dateTo: '',
  });
  const [selectedBlockedHistoryItems, setSelectedBlockedHistoryItems] = useState<number[]>([]);
  const [showBlockUserForm, setShowBlockUserForm] = useState(false);
  const [blockUserWhatsApp, setBlockUserWhatsApp] = useState('');
  const [blockUserReason, setBlockUserReason] = useState('');
  const [expandedHistoryUsers, setExpandedHistoryUsers] = useState<number[]>([]);
  const [editingHistoryUser, setEditingHistoryUser] = useState<number | null>(null);
  const [editHistoryUserData, setEditHistoryUserData] = useState<{
    user_id: number;
    name: string;
    events: Array<{ event_date: string; gira_text: string; status: string }>;
  } | null>(null);
  
  // Extend block states
  const [showExtendBlockModal, setShowExtendBlockModal] = useState(false);
  const [extendBlockUserId, setExtendBlockUserId] = useState<number | null>(null);
  const [extendBlockUserName, setExtendBlockUserName] = useState('');
  const [extendBlockCurrentDate, setExtendBlockCurrentDate] = useState('');
  const [extendBlockNewDate, setExtendBlockNewDate] = useState('');
  const [extendBlockAdditionalDays, setExtendBlockAdditionalDays] = useState('');
  
  // Default WhatsApp messages states
  const [defaultMessages, setDefaultMessages] = useState({
    confirmed: '',
    waitlist: '',
    waitlist_secondary: '',
  });
  const [messagesError, setMessagesError] = useState('');
  const [messagesSuccess, setMessagesSuccess] = useState('');
  
  const [recessData, setRecessData] = useState<{
    start_date: string;
    end_date: string;
    image_url: string;
    image_size: number;
    message: string;
    keepCurrentImage: boolean;
    theme_color_1: string;
    theme_color_2: string;
    is_active: boolean;
  }>({
    start_date: '',
    end_date: '',
    image_url: '',
    image_size: 256,
    message: 'Voltaremos em breve. Agradecemos a compreensão! 🙏',
    keepCurrentImage: false,
    theme_color_1: '#3b82f6',
    theme_color_2: '#1e40af',
    is_active: false,
  });

  // Load saved WhatsApp data from localStorage on mount
  useEffect(() => {
    const savedNumber = localStorage.getItem('adminWhatsAppNumber');
    const savedType = localStorage.getItem('adminWhatsAppSendType') as 'number' | 'group' | null;
    const savedGroupLink = localStorage.getItem('adminWhatsAppGroupLink');
    
    if (savedNumber) {
      setWhatsappNumber(savedNumber);
    }
    if (savedType) {
      setWhatsappSendType(savedType);
    }
    if (savedGroupLink) {
      setWhatsappGroupLink(savedGroupLink);
    }
  }, []);

  // Save WhatsApp data to localStorage whenever it changes
  useEffect(() => {
    if (whatsappNumber) {
      localStorage.setItem('adminWhatsAppNumber', whatsappNumber);
    }
    localStorage.setItem('adminWhatsAppSendType', whatsappSendType);
    if (whatsappGroupLink) {
      localStorage.setItem('adminWhatsAppGroupLink', whatsappGroupLink);
    }
  }, [whatsappNumber, whatsappSendType, whatsappGroupLink]);

  // Refs to track timeout IDs for auto-clearing messages
  const settingsSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const settingsErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const passwordSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const passwordErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const adminSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const adminErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for saved login on mount
  useEffect(() => {
    const savedAdmin = localStorage.getItem('adminAuth');
    if (savedAdmin) {
      try {
        const admin = JSON.parse(savedAdmin);
        setIsLoggedIn(true);
        setCurrentAdmin(admin);
        loadData();
      } catch (e) {
        localStorage.removeItem('adminAuth');
      }
    }
  }, []);

  // Sync editedSettings with settings when settings change
  useEffect(() => {
    if (settings) {
      // Check if there's an active event
      const activeEvent = events.find((e: any) => e.is_active === 1);
      
      if (activeEvent) {
        // If there's an active event, load its settings
        setEditedSettings({ ...settings });
      } else {
        // If no active event, show empty fields
        setEditedSettings({
          max_capacity: 30,
          gira_prefix: '',
          gira_text: '',
          header_text: '',
          event_date: '',
          event_time: '',
          registration_opens_at: '',
          registration_closes_at: '',
          logo_url: settings.logo_url || '',
          logo_size: settings.logo_size || 256,
          theme_mode: 'auto',
          theme_color_1: '#3b82f6',
          theme_color_2: '#1e40af',
          whatsapp_confirmed_message: '',
          whatsapp_waitlist_message: '',
          whatsapp_waitlist_secondary_message: '',
        });
      }
    }
  }, [settings, events]);

  // Auto-clear settingsSuccess after 5 seconds
  useEffect(() => {
    if (settingsSuccess) {
      if (settingsSuccessTimeoutRef.current) {
        clearTimeout(settingsSuccessTimeoutRef.current);
      }
      settingsSuccessTimeoutRef.current = setTimeout(() => {
        setSettingsSuccess('');
      }, 5000);
    }
    return () => {
      if (settingsSuccessTimeoutRef.current) {
        clearTimeout(settingsSuccessTimeoutRef.current);
      }
    };
  }, [settingsSuccess]);

  // Auto-clear settingsError after 5 seconds
  useEffect(() => {
    if (settingsError) {
      if (settingsErrorTimeoutRef.current) {
        clearTimeout(settingsErrorTimeoutRef.current);
      }
      settingsErrorTimeoutRef.current = setTimeout(() => {
        setSettingsError('');
      }, 5000);
    }
    return () => {
      if (settingsErrorTimeoutRef.current) {
        clearTimeout(settingsErrorTimeoutRef.current);
      }
    };
  }, [settingsError]);

  // Auto-clear passwordSuccess after 5 seconds
  useEffect(() => {
    if (passwordSuccess) {
      if (passwordSuccessTimeoutRef.current) {
        clearTimeout(passwordSuccessTimeoutRef.current);
      }
      passwordSuccessTimeoutRef.current = setTimeout(() => {
        setPasswordSuccess('');
        setShowPasswordChange(false);
      }, 5000);
    }
    return () => {
      if (passwordSuccessTimeoutRef.current) {
        clearTimeout(passwordSuccessTimeoutRef.current);
      }
    };
  }, [passwordSuccess]);

  // Auto-clear passwordError after 5 seconds
  useEffect(() => {
    if (passwordError) {
      if (passwordErrorTimeoutRef.current) {
        clearTimeout(passwordErrorTimeoutRef.current);
      }
      passwordErrorTimeoutRef.current = setTimeout(() => {
        setPasswordError('');
      }, 5000);
    }
    return () => {
      if (passwordErrorTimeoutRef.current) {
        clearTimeout(passwordErrorTimeoutRef.current);
      }
    };
  }, [passwordError]);

  // Auto-clear adminSuccess after 5 seconds
  useEffect(() => {
    if (adminSuccess) {
      if (adminSuccessTimeoutRef.current) {
        clearTimeout(adminSuccessTimeoutRef.current);
      }
      adminSuccessTimeoutRef.current = setTimeout(() => {
        setAdminSuccess('');
        if (showAddAdmin) setShowAddAdmin(false);
        if (showEditAdmin) setShowEditAdmin(null);
      }, 5000);
    }
    return () => {
      if (adminSuccessTimeoutRef.current) {
        clearTimeout(adminSuccessTimeoutRef.current);
      }
    };
  }, [adminSuccess, showAddAdmin, showEditAdmin]);

  // Auto-clear adminError after 5 seconds
  useEffect(() => {
    if (adminError) {
      if (adminErrorTimeoutRef.current) {
        clearTimeout(adminErrorTimeoutRef.current);
      }
      adminErrorTimeoutRef.current = setTimeout(() => {
        setAdminError('');
      }, 5000);
    }
    return () => {
      if (adminErrorTimeoutRef.current) {
        clearTimeout(adminErrorTimeoutRef.current);
      }
    };
  }, [adminError]);

  const capitalizeWords = (text: string): string => {
    return text
      .split(' ')
      .map(word => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  const logout = () => {
    localStorage.removeItem('adminAuth');
    setIsLoggedIn(false);
    setCurrentAdmin(null);
    setUsername('');
    setPassword('');
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.success) {
      setIsLoggedIn(true);
      setCurrentAdmin(data.admin);
      localStorage.setItem('adminAuth', JSON.stringify(data.admin));
      loadData();
    } else {
      setError('Credenciais inválidas');
    }
  };

  const hasPermission = (tab: string): boolean => {
    if (!currentAdmin) return false;
    if (currentAdmin.is_master === 1) return true;
    if (currentAdmin.permissions === 'all') return true;
    const permissions = currentAdmin.permissions.split(',');
    return permissions.includes(tab);
  };

  const hasGranularPermission = (
    _section: keyof GranularPermissions,
    _field: string,
    _requiredLevel: 'read' | 'write' = 'read'
  ): boolean => {
    // Simplified: All admins have full permissions like master
    if (!currentAdmin) return false;
    return true; // All logged-in admins have full access
  };

  const loadData = async () => {
    const [settingsRes, registrationsRes, recessRes] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/admin/registrations'),
      fetch('/api/admin/recess/current'),
    ]);

    const settingsData = await settingsRes.json();
    const registrationsData = await registrationsRes.json();
    const recessResData = await recessRes.json();

    setSettings(settingsData);
    setRegistrations(registrationsData.registrations);
    setBlockedUsers(registrationsData.blocked_users || []);
    setWeekStartDate(registrationsData.week_start_date);
    
    // Update recess data state to reflect if a recess is currently active
    if (recessResData && recessResData.id && recessResData.is_active === 1) {
      setRecessData({
        start_date: recessResData.start_date,
        end_date: recessResData.end_date,
        image_url: recessResData.image_url || '',
        image_size: recessResData.image_size || 256,
        message: recessResData.message || 'Voltaremos em breve. Agradecemos a compreensão! 🙏',
        keepCurrentImage: !recessResData.image_url,
        theme_color_1: recessResData.theme_color_1 || '#3b82f6',
        theme_color_2: recessResData.theme_color_2 || '#1e40af',
        is_active: true,
      });
    }
  };

  const loadHistory = async () => {
    const params = new URLSearchParams();
    
    if (historyFilter.first_name) params.append('first_name', historyFilter.first_name);
    if (historyFilter.last_name) params.append('last_name', historyFilter.last_name);
    if (historyFilter.whatsapp) params.append('whatsapp', historyFilter.whatsapp);
    if (historyFilter.userRegistrationFrom) params.append('user_registration_from', historyFilter.userRegistrationFrom);
    if (historyFilter.userRegistrationTo) params.append('user_registration_to', historyFilter.userRegistrationTo);
    if (historyFilter.showEventHistory) params.append('show_event_history', 'true');
    if (historyFilter.showPastEvents) params.append('show_past_events', 'true');
    
    const response = await fetch(`/api/admin/history?${params.toString()}`);
    const data = await response.json();
    setHistory(data);
    setSelectedHistoryItems([]);
  };

  const loadAdminUsers = async () => {
    const response = await fetch('/api/admin/users');
    const data = await response.json();
    setAdminUsers(data);
  };

  const loadAllUsers = async () => {
    const params = new URLSearchParams();
    if (userFilter.first_name) params.append('first_name', userFilter.first_name);
    if (userFilter.last_name) params.append('last_name', userFilter.last_name);
    if (userFilter.whatsapp) params.append('whatsapp', userFilter.whatsapp);
    
    const response = await fetch(`/api/admin/all-users?${params.toString()}`);
    const data = await response.json();
    setAllUsers(data);
    setSelectedUsers([]);
  };

  const loadEvents = async () => {
    const response = await fetch('/api/admin/events');
    const data = await response.json();
    setEvents(data);
    
    // Set the active event as selected
    const activeEvent = data.find((e: any) => e.is_active === 1);
    if (activeEvent) {
      setSelectedEventDate(activeEvent.event_date);
    }
  };

  

  const loadCurrentRecess = async () => {
    const response = await fetch('/api/admin/recess/current');
    const data = await response.json();
    
    if (data && data.id) {
      setRecessData({
        start_date: data.start_date,
        end_date: data.end_date,
        image_url: data.image_url || '',
        image_size: data.image_size || 256,
        message: data.message || 'Voltaremos em breve. Agradecemos a compreensão! 🙏',
        keepCurrentImage: !data.image_url, // If no custom image, assume using current
        theme_color_1: data.theme_color_1 || '#3b82f6',
        theme_color_2: data.theme_color_2 || '#1e40af',
        is_active: data.is_active === 1,
      });
    } else {
      // No active recess, reset to defaults
      setRecessData({
        start_date: '',
        end_date: '',
        image_url: '',
        image_size: 256,
        message: 'Voltaremos em breve. Agradecemos a compreensão! 🙏',
        keepCurrentImage: false,
        theme_color_1: '#3b82f6',
        theme_color_2: '#1e40af',
        is_active: false,
      });
    }
  };

  const saveRecess = async () => {
    if (!recessData.start_date || !recessData.end_date) {
      alert('❌ Por favor, preencha as datas de início e fim do recesso');
      return;
    }
    
    if (recessData.start_date > recessData.end_date) {
      alert('❌ A data de início deve ser anterior à data de fim');
      return;
    }
    
    const response = await fetch('/api/admin/recess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: recessData.start_date,
        end_date: recessData.end_date,
        image_url: recessData.keepCurrentImage ? null : (recessData.image_url || null),
        image_size: recessData.image_size || 256,
        message: recessData.message || 'Voltaremos em breve. Agradecemos a compreensão! 🙏',
        theme_color_1: recessData.theme_color_1,
        theme_color_2: recessData.theme_color_2,
        is_active: recessData.is_active,
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      alert('✅ ' + data.message);
      await loadCurrentRecess();
      await loadEvents(); // Reload events to reflect deactivation during recess
      await loadData(); // Reload main data to update recess state
    } else {
      alert('❌ ' + (data.error || 'Erro ao salvar recesso'));
    }
  };

  const loadAnalytics = async (days?: number, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    
    if (dateFrom && dateTo) {
      params.append('date_from', dateFrom);
      params.append('date_to', dateTo);
    } else if (days) {
      params.append('days', days.toString());
    }
    
    const response = await fetch(`/api/admin/analytics?${params.toString()}`);
    const data = await response.json();
    setAnalytics(data);
  };

  // Shared logo upload handler that syncs across both settings and event edit forms
  const handleLogoUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('logo', file);
    
    try {
      const response = await fetch('/api/admin/upload-logo', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success && data.logo_url) {
        // Update editedSettings if it exists
        if (editedSettings) {
          setEditedSettings({ ...editedSettings, logo_url: data.logo_url });
        }
        
        // Update editEventData if it exists and editing
        if (editingEvent && editEventData) {
          setEditEventData({ ...editEventData, logo_url: data.logo_url, keepCurrentLogo: false });
        }
        
        // Reload settings and events to ensure sync
        await loadData();
        await loadEvents();
        
        return data.logo_url;
      } else {
        showAlert('❌ ' + (data.error || 'Erro ao fazer upload do logo'));
        return null;
      }
    } catch (error) {
      showAlert('❌ Erro ao fazer upload do logo');
      return null;
    }
  };

  

  const createOrUpdateEvent = async (eventDate: string, eventData?: any) => {
    // Validate date ranges
    if (eventData?.registration_opens_at && eventData?.registration_closes_at) {
      if (eventData.registration_opens_at > eventData.registration_closes_at) {
        showAlert('❌ A data de abertura deve ser anterior ou igual à data de fechamento');
        return;
      }
    }

    const response = await fetch('/api/admin/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_date: eventDate,
        gira_prefix: eventData?.gira_prefix !== undefined ? eventData.gira_prefix : '',
        gira_text: eventData?.gira_text !== undefined ? eventData.gira_text : '',
        header_text: eventData?.header_text !== undefined ? eventData.header_text : 'Lista de presença',
        event_time: eventData?.event_time !== undefined ? eventData.event_time : '19:30',
        registration_opens_at: eventData?.registration_opens_at !== undefined ? eventData.registration_opens_at : `${eventDate}T08:00`,
        registration_closes_at: eventData?.registration_closes_at !== undefined ? eventData.registration_closes_at : `${eventDate}T18:00`,
        max_capacity: eventData?.max_capacity !== undefined ? eventData.max_capacity : 30,
        logo_url: eventData?.logo_url !== undefined ? eventData.logo_url : '',
        logo_size: eventData?.logo_size !== undefined ? eventData.logo_size : 256,
        theme_mode: eventData?.theme_mode !== undefined ? eventData.theme_mode : 'auto',
        theme_color_1: eventData?.theme_color_1 !== undefined ? eventData.theme_color_1 : '#3b82f6',
        theme_color_2: eventData?.theme_color_2 !== undefined ? eventData.theme_color_2 : '#1e40af',
        whatsapp_confirmed_message: eventData?.whatsapp_confirmed_message !== undefined ? eventData.whatsapp_confirmed_message : '',
        whatsapp_waitlist_message: eventData?.whatsapp_waitlist_message !== undefined ? eventData.whatsapp_waitlist_message : '',
        whatsapp_waitlist_secondary_message: eventData?.whatsapp_waitlist_secondary_message !== undefined ? eventData.whatsapp_waitlist_secondary_message : '',
        whatsapp_contact_number: eventData?.whatsapp_contact_number !== undefined ? eventData.whatsapp_contact_number : '',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      showAlert('✅ Evento salvo com sucesso!');
      loadEvents();
      setNewEventDate('');
      setShowEventCalendar(false);
      setEditingEvent(null);
      setEditEventData(null);
      // Reload data if this was the active event
      if (selectedEventDate === eventDate) {
        loadData();
      }
    } else {
      showAlert('❌ ' + (data.error || 'Erro ao salvar evento'));
    }
  };

  const switchToEvent = async (eventDate: string, isCurrentlyActive: boolean = false) => {
    // If event is currently active, deactivate it (toggle off)
    if (isCurrentlyActive) {
      const response = await fetch('/api/admin/deactivate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_date: eventDate }),
      });

      if (response.ok) {
        showAlert('✅ Evento desativado com sucesso');
        await loadCurrentRecess(); // Check if there's a recess to activate
        setSelectedEventDate('');
        loadEvents();
        loadData();
      } else {
        showAlert('❌ Erro ao desativar evento');
      }
      return;
    }

    // Check if there's an active recess before activating event
    const recessCheck = await fetch('/api/admin/recess/current');
    const recessData = await recessCheck.json();
    
    if (recessData && recessData.id && recessData.is_active === 1) {
      const confirmActivate = window.confirm(
        'Existe um recesso ativo no momento. Ao ativar este evento, o recesso será desconsiderado. Deseja continuar?'
      );
      
      if (!confirmActivate) {
        return; // User cancelled, keep recess active
      }
    }

    // Activate the event
    const response = await fetch('/api/admin/set-active-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_date: eventDate }),
    });

    if (response.ok) {
      showAlert('✅ Evento ativado com sucesso');
      setSelectedEventDate(eventDate);
      loadEvents();
      loadData();
      await loadCurrentRecess(); // Reload recess state
    } else {
      showAlert('❌ Erro ao ativar evento');
    }
  };

  const deleteEvent = async (eventDate: string) => {
    if (!window.confirm(`Tem certeza que deseja apagar o evento de ${eventDate} e todos os seus dados?`)) {
      return;
    }

    const response = await fetch('/api/admin/delete-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_date: eventDate }),
    });

    if (response.ok) {
      showAlert('Evento apagado com sucesso');
      loadEvents();
      // If we deleted the active event, reload data
      if (eventDate === selectedEventDate) {
        loadData();
      }
    } else {
      showAlert('Erro ao apagar evento');
    }
  };

  const deleteUsers = async (userIds: number[], deleteAll: boolean = false) => {
    if (!hasGranularPermission('cadastrados', 'delete_users', 'write')) {
      showAlert('Você não tem permissão para excluir usuários');
      return;
    }
    
    const response = await fetch('/api/admin/delete-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_ids: deleteAll ? undefined : userIds,
        delete_all: deleteAll,
      }),
    });

    const data = await response.json();

    if (data.success) {
      showAlert(data.message);
      loadAllUsers();
    } else {
      showAlert(data.error || 'Erro ao apagar usuários');
    }
  };

  const deleteFilteredUsers = async () => {
    if (!hasGranularPermission('cadastrados', 'delete_users', 'write')) {
      showAlert('Você não tem permissão para excluir usuários');
      return;
    }
    
    const response = await fetch('/api/admin/delete-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: userFilter,
      }),
    });

    const data = await response.json();

    if (data.success) {
      showAlert(data.message);
      setUserFilter({ first_name: '', last_name: '', whatsapp: '' });
      setShowUserFilter(false);
      loadAllUsers();
    } else {
      showAlert(data.error || 'Erro ao apagar usuários');
    }
  };

  const updateUser = async () => {
    if (!editingUser) return;
    
    setEditUserError('');
    
    if (!editUserData.first_name || !editUserData.last_name || !editUserData.whatsapp) {
      setEditUserError('Preencha todos os campos');
      return;
    }
    
    if (!/^\d{11,15}$/.test(editUserData.whatsapp)) {
      setEditUserError('WhatsApp deve ter exatamente 11 dígitos (DDD + número)');
      return;
    }
    
    const response = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: editingUser.id,
        first_name: editUserData.first_name,
        last_name: editUserData.last_name,
        whatsapp: editUserData.whatsapp,
      }),
    });

    const data = await response.json();

    if (data.success) {
      showAlert(data.message);
      setEditingUser(null);
      setEditUserData({ first_name: '', last_name: '', whatsapp: '' });
      loadAllUsers();
      loadData(); // Atualiza também a lista da gira ativa
    } else {
      setEditUserError(data.error || 'Erro ao atualizar usuário');
    }
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');

    if (newAdmin.password !== newAdmin.confirm_password) {
      setAdminError('As senhas não coincidem');
      return;
    }

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentAdmin?.id) {
      headers['X-Admin-ID'] = currentAdmin.id.toString();
    }

    const response = await fetch('/api/admin/create-admin', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...newAdmin,
        granular_permissions: JSON.stringify(newAdmin.granular_permissions),
      }),
    });

    const data = await response.json();

    if (data.success) {
      setAdminSuccess('Administrador criado com sucesso!');
      setNewAdmin({ username: '', password: '', confirm_password: '', permissions: [], granular_permissions: DEFAULT_GRANULAR_PERMISSIONS, master_password: '' });
      loadAdminUsers();
    } else {
      setAdminError(data.error || 'Erro ao criar administrador');
    }
  };

  const updateAdmin = async (e: React.FormEvent, adminId: number) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentAdmin?.id) {
      headers['X-Admin-ID'] = currentAdmin.id.toString();
    }

    const response = await fetch('/api/admin/update-admin', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        admin_id: adminId,
        username: editAdmin.username || undefined,
        password: editAdmin.password || undefined,
        permissions: editAdmin.permissions.length > 0 ? editAdmin.permissions : undefined,
        granular_permissions: JSON.stringify(editAdmin.granular_permissions),
        master_password: editAdmin.master_password || undefined,
      }),
    });

    const data = await response.json();

    if (data.success) {
      setAdminSuccess('Administrador atualizado com sucesso!');
      setEditAdmin({ username: '', password: '', permissions: [], granular_permissions: DEFAULT_GRANULAR_PERMISSIONS, master_password: '' });
      loadAdminUsers();
    } else {
      setAdminError(data.error || 'Erro ao atualizar administrador');
    }
  };

  const deleteAdmin = async (adminId: number) => {
    let masterPassword = '';
    
    // Only prompt for master password if not logged in as master
    if (currentAdmin?.is_master !== 1) {
      masterPassword = prompt('Digite a senha master para confirmar a exclusão:') || '';
      if (!masterPassword) return;
    }

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (currentAdmin?.id) {
      headers['X-Admin-ID'] = currentAdmin.id.toString();
    }

    const response = await fetch('/api/admin/delete-admin', {
      method: 'POST',
      headers,
      body: JSON.stringify({ admin_id: adminId, master_password: masterPassword || undefined }),
    });

    const data = await response.json();

    if (data.success) {
      showAlert('Administrador excluído com sucesso!');
      loadAdminUsers();
    } else {
      showAlert(data.error || 'Erro ao excluir administrador');
    }
  };

  const handleRegistrationAction = async (registrationId: number, action: 'confirm' | 'delete' | 'move_to_waitlist' | 'move_to_waitlist_secondary' | 'move_to_blocked' | 'move_to_confirmed' | 'move_to_pending') => {
    // Check permissions
    if (action === 'confirm' || action === 'move_to_confirmed') {
      if (!hasGranularPermission('list', 'confirm_registration', 'write')) {
        showAlert('Você não tem permissão para confirmar inscrições');
        return;
      }
    } else if (action === 'delete') {
      if (!hasGranularPermission('list', 'delete_registration', 'write')) {
        showAlert('Você não tem permissão para excluir inscrições');
        return;
      }
    } else {
      if (!hasGranularPermission('list', 'move_registration', 'write')) {
        showAlert('Você não tem permissão para mover inscrições');
        return;
      }
    }
    
    const response = await fetch('/api/admin/registration-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_id: registrationId, action }),
    });

    if (response.ok) {
      setConfirmDialog(null);
      await loadData();
    }
  };

  const handleBlockedUserAction = async (userId: number, action: 'move_to_pending' | 'move_to_waitlist' | 'move_to_waitlist_secondary' | 'move_to_confirmed' | 'unblock') => {
    // Check permissions
    if (action === 'unblock') {
      if (!hasGranularPermission('blocked', 'unblock_user', 'write')) {
        showAlert('Você não tem permissão para desbloquear usuários');
        return;
      }
    } else {
      if (!hasGranularPermission('blocked', 'move_blocked_user', 'write')) {
        showAlert('Você não tem permissão para mover usuários bloqueados');
        return;
      }
    }
    
    const response = await fetch('/api/admin/blocked-user-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, action }),
    });

    if (response.ok) {
      setConfirmDialog(null);
      await loadBlockedUsers();
    }
  };

  const saveSettings = async () => {
    if (!editedSettings) return;

    setSettingsError('');
    setSettingsSuccess('');

    // Validate date ranges
    if (editedSettings.registration_opens_at && editedSettings.registration_closes_at) {
      if (editedSettings.registration_opens_at > editedSettings.registration_closes_at) {
        setSettingsError('A data de abertura deve ser anterior ou igual à data de fechamento');
        return;
      }
    }

    // Build the updates object with only changed fields
    const updates: Partial<Settings> = {};
    
    if (editedSettings.gira_prefix !== settings?.gira_prefix) {
      if (!hasGranularPermission('settings', 'gira_text', 'write')) {
        setSettingsError('Você não tem permissão para editar o texto da gira');
        return;
      }
      updates.gira_prefix = editedSettings.gira_prefix;
    }
    
    if (editedSettings.gira_text !== settings?.gira_text) {
      if (!hasGranularPermission('settings', 'gira_text', 'write')) {
        setSettingsError('Você não tem permissão para editar o texto da gira');
        return;
      }
      updates.gira_text = editedSettings.gira_text;
    }
    
    if (editedSettings.header_text !== settings?.header_text) {
      if (!hasGranularPermission('settings', 'header_text', 'write')) {
        setSettingsError('Você não tem permissão para editar o texto do cabeçalho');
        return;
      }
      updates.header_text = editedSettings.header_text;
    }
    
    if (editedSettings.event_date !== settings?.event_date) {
      if (!hasGranularPermission('settings', 'event_date', 'write')) {
        setSettingsError('Você não tem permissão para editar a data da gira');
        return;
      }
      updates.event_date = editedSettings.event_date;
    }
    
    if (editedSettings.event_time !== settings?.event_time) {
      if (!hasGranularPermission('settings', 'event_time', 'write')) {
        setSettingsError('Você não tem permissão para editar a hora da gira');
        return;
      }
      updates.event_time = editedSettings.event_time;
    }
    
    if (editedSettings.registration_opens_at !== settings?.registration_opens_at) {
      if (!hasGranularPermission('settings', 'registration_opens_at', 'write')) {
        setSettingsError('Você não tem permissão para editar a data de abertura');
        return;
      }
      updates.registration_opens_at = editedSettings.registration_opens_at;
    }
    
    if (editedSettings.registration_closes_at !== settings?.registration_closes_at) {
      if (!hasGranularPermission('settings', 'registration_closes_at', 'write')) {
        setSettingsError('Você não tem permissão para editar a data de fechamento');
        return;
      }
      updates.registration_closes_at = editedSettings.registration_closes_at;
    }
    
    if (editedSettings.max_capacity !== settings?.max_capacity) {
      if (!hasGranularPermission('settings', 'max_capacity', 'write')) {
        setSettingsError('Você não tem permissão para editar a capacidade máxima');
        return;
      }
      updates.max_capacity = editedSettings.max_capacity;
    }
    
    if (editedSettings.logo_url !== settings?.logo_url) {
      updates.logo_url = editedSettings.logo_url;
    }
    
    if (editedSettings.logo_size !== settings?.logo_size) {
      updates.logo_size = editedSettings.logo_size;
    }
    
    // Always include theme_mode, defaulting to 'auto' if not set
    updates.theme_mode = editedSettings.theme_mode || 'auto';
    
    // Include colors if in manual mode
    if (editedSettings.theme_mode === 'manual') {
      updates.theme_color_1 = editedSettings.theme_color_1 || '#3b82f6';
      updates.theme_color_2 = editedSettings.theme_color_2 || '#1e40af';
    }
    
    // Include WhatsApp messages
    if (editedSettings.whatsapp_confirmed_message !== settings?.whatsapp_confirmed_message) {
      updates.whatsapp_confirmed_message = editedSettings.whatsapp_confirmed_message;
    }
    
    if (editedSettings.whatsapp_waitlist_message !== settings?.whatsapp_waitlist_message) {
      updates.whatsapp_waitlist_message = editedSettings.whatsapp_waitlist_message;
    }
    
    if (editedSettings.whatsapp_waitlist_secondary_message !== settings?.whatsapp_waitlist_secondary_message) {
      updates.whatsapp_waitlist_secondary_message = editedSettings.whatsapp_waitlist_secondary_message;
    }
    
    // Include WhatsApp contact number for cancellations
    if ((editedSettings as any).whatsapp_contact_number !== (settings as any).whatsapp_contact_number) {
      (updates as any).whatsapp_contact_number = (editedSettings as any).whatsapp_contact_number;
    }

    if (Object.keys(updates).length === 0) {
      setSettingsError('Nenhuma alteração detectada!');
      return;
    }

    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      setSettingsSuccess('Configurações salvas com sucesso!');
      loadData();
      loadEvents();
    } else {
      setSettingsError(data.error || 'Erro ao salvar configurações');
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }

    const response = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });

    const data = await response.json();

    if (data.success) {
      setPasswordSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError(data.error || 'Erro ao alterar senha');
    }
  };

  const exportCSV = async () => {
    if (!hasGranularPermission('list', 'export_csv', 'write')) {
      showAlert('Você não tem permissão para exportar CSV');
      return;
    }
    
    try {
      const response = await fetch('/api/admin/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lista_gira_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
    }
  };

  const exportUsersCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (userFilter.first_name) params.append('first_name', userFilter.first_name);
      if (userFilter.last_name) params.append('last_name', userFilter.last_name);
      if (userFilter.whatsapp) params.append('whatsapp', userFilter.whatsapp);
      
      const response = await fetch(`/api/admin/export-users?${params.toString()}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `usuarios_cadastrados_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
    }
  };

  const sendListToWhatsApp = async () => {
    // Get event observations if there's an active event
    let observations = '';
    if (selectedEventDate) {
      const eventResponse = await fetch(`/api/admin/event-observations/${selectedEventDate}`);
      if (eventResponse.ok) {
        const data = await eventResponse.json();
        observations = data.observations || '';
      }
    }
    
    // Check if there are any registrations
    const hasRegistrations = confirmed.length > 0 || waitlist.length > 0 || waitlistSecondary.length > 0;
    
    // Build the message with all lists
    let message = `📋 *LISTA DE PRESENÇA*\n\n`;
    
    if (hasRegistrations) {
      // Show event details only if there are registrations
      message += `*Tipo de evento:* ${settings?.gira_prefix || ''}\n`;
      message += `*Evento:* ${settings?.gira_text || ''}\n`;
      message += `*Data da Gira:* ${new Date(weekStartDate + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}\n`;
      message += `*Horário da gira:* ${settings?.event_time || '19:30'}\n\n`;
    } else {
      // Show empty values if no registrations
      message += `*Tipo de evento:* \n`;
      message += `*Evento:* \n`;
      message += `*Data da Gira:* \n`;
      message += `*Horário da gira:* \n\n`;
    }

    // Confirmed list
    if (confirmed.length > 0) {
      message += `✅ *LISTA DE CONFIRMADOS* (${confirmed.length})\n`;
      confirmed.forEach((reg, index) => {
        const firstTimeMarker = reg.is_first_time === 1 ? ' ***1x UAL***' : '';
        message += `${index + 1}. ${reg.user.first_name} ${reg.user.last_name}${firstTimeMarker}\n`;
      });
      message += '\n';
    }

    // Priority waitlist
    if (waitlist.length > 0) {
      message += `⏳ *LISTA DE ESPERA PRIORITÁRIA* (${waitlist.length})\n`;
      waitlist.forEach((reg, index) => {
        const firstTimeMarker = reg.is_first_time === 1 ? ' ***1x UAL***' : '';
        message += `${index + 1}. ${reg.user.first_name} ${reg.user.last_name}${firstTimeMarker}\n`;
      });
      message += '\n';
    }

    // Secondary waitlist
    if (waitlistSecondary.length > 0) {
      message += `⏸️ *LISTA DE ESPERA SECUNDÁRIA* (${waitlistSecondary.length})\n`;
      waitlistSecondary.forEach((reg, index) => {
        const firstTimeMarker = reg.is_first_time === 1 ? ' ***1x UAL***' : '';
        message += `${index + 1}. ${reg.user.first_name} ${reg.user.last_name}${firstTimeMarker}\n`;
      });
      message += '\n';
    }

    // Add observations at the end if present
    if (observations.trim()) {
      message += `📝 *OBSERVAÇÕES:*\n${observations}`;
    }

    // Send to WhatsApp with pre-filled message
    // This will open WhatsApp with the message pre-filled
    // User will need to select the group from their recent chats
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp app directly
    window.open(whatsappUrl, '_blank');
  };

  

  const exportAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      
      if (analyticsFilter.periodType === 'custom' && analyticsFilter.dateFrom && analyticsFilter.dateTo) {
        params.append('date_from', analyticsFilter.dateFrom);
        params.append('date_to', analyticsFilter.dateTo);
      } else {
        params.append('days', analyticsFilter.days.toString());
      }
      
      const response = await fetch(`/api/admin/export-analytics?${params.toString()}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar analytics:', error);
    }
  };

  const exportHistoryCSV = async () => {
    try {
      const params = new URLSearchParams();
      
      // If there are selected users, export only those
      if (selectedHistoryItems.length > 0 && !historyFilter.showEventHistory) {
        params.append('selected_user_ids', selectedHistoryItems.join(','));
      } else {
        // Otherwise, use filters
        if (historyFilter.first_name) params.append('first_name', historyFilter.first_name);
        if (historyFilter.last_name) params.append('last_name', historyFilter.last_name);
        if (historyFilter.whatsapp) params.append('whatsapp', historyFilter.whatsapp);
        if (historyFilter.userRegistrationFrom) params.append('user_registration_from', historyFilter.userRegistrationFrom);
        if (historyFilter.userRegistrationTo) params.append('user_registration_to', historyFilter.userRegistrationTo);
        if (historyFilter.showEventHistory) params.append('show_event_history', 'true');
      }
      
      const response = await fetch(`/api/admin/export-history-comprehensive?${params.toString()}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Name file based on what was exported
      let filename;
      if (selectedHistoryItems.length > 0 && !historyFilter.showEventHistory) {
        filename = `historico_pessoas_selecionadas_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        filename = historyFilter.showEventHistory 
          ? `historico_eventos_${new Date().toISOString().split('T')[0]}.csv`
          : `historico_pessoas_${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar histórico:', error);
    }
  };

  

  const getDaysRemaining = (blockedUntil: string | null) => {
    if (!blockedUntil) return 0;
    const until = new Date(blockedUntil);
    const now = new Date();
    const diff = until.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const loadPadeEvents = async () => {
    const response = await fetch('/api/admin/pade-events');
    const data = await response.json();
    setPadeEvents(data);
  };

  const loadPadePeople = async () => {
    const response = await fetch('/api/admin/pade-people');
    const data = await response.json();
    setPadePeople(data);
  };

  const loadEventDetails = async (eventDate: string) => {
    const response = await fetch(`/api/admin/event-details/${eventDate}`);
    const data = await response.json();
    setEventDetails(data);
    setShowEventDetails(eventDate);
  };

  const loadBlockedUsers = async () => {
    const response = await fetch('/api/admin/blocked-users');
    const data = await response.json();
    setBlockedUsers(data.blocked_users || []);
  };

  const loadBlockedHistory = async (days?: number, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    
    if (dateFrom && dateTo) {
      params.append('date_from', dateFrom);
      params.append('date_to', dateTo);
    } else if (days) {
      params.append('days', days.toString());
    }
    
    const response = await fetch(`/api/admin/blocked-history?${params.toString()}`);
    const data = await response.json();
    setBlockedHistory(data);
    setSelectedBlockedHistoryItems([]);
  };

  const blockUserDirectly = async () => {
    if (!blockUserWhatsApp) {
      showAlert('Por favor, digite o número de WhatsApp');
      return;
    }
    
    const response = await fetch('/api/admin/block-user-directly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        whatsapp: blockUserWhatsApp.replace(/\D/g, ''),
        reason: blockUserReason || undefined,
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      showAlert('✅ ' + data.message);
      setBlockUserWhatsApp('');
      setBlockUserReason('');
      setShowBlockUserForm(false);
      await loadBlockedUsers(); // Reload blocked users list
    } else {
      showAlert('❌ ' + (data.error || 'Erro ao bloquear usuário'));
    }
  };

  const exportEventDetailsCSV = () => {
    if (!eventDetails || !showEventDetails) return;

    // Helper function to escape CSV fields - using comma as delimiter
    const escapeCsvField = (field: any): string => {
      if (field === null || field === undefined) return '';
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // UTF-8 BOM for Excel compatibility
    let csv = '\ufeff';
    
    // Event header - now in table format with columns
    csv += '===========================================\n';
    csv += 'DETALHES DO EVENTO\n';
    csv += '===========================================\n';
    csv += '\n';
    csv += 'Data,Nome do Evento,Capacidade Máxima,Horário\n';
    if (eventDetails.event) {
      csv += `${escapeCsvField(new Date(showEventDetails + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' }))},${escapeCsvField(eventDetails.event.gira_text)},${escapeCsvField(eventDetails.event.max_capacity)},${escapeCsvField(eventDetails.event.event_time)}\n`;
    }
    csv += '\n';
    csv += ',\n';
    csv += ',\n';
    csv += ',\n';

    // Confirmed list
    csv += '===========================================\n';
    csv += 'LISTA DE CONFIRMADOS\n';
    csv += '===========================================\n';
    csv += `Total de Confirmados,${escapeCsvField(eventDetails.confirmed?.length || 0)}\n`;
    csv += '\n';
    csv += 'Ordem,Nome,Sobrenome,WhatsApp,Data de Inscrição\n';
    if (eventDetails.confirmed && eventDetails.confirmed.length > 0) {
      eventDetails.confirmed.forEach((reg: any) => {
        csv += `${escapeCsvField(reg.registration_order)},${escapeCsvField(reg.first_name)},${escapeCsvField(reg.last_name)},${escapeCsvField(reg.whatsapp)},${escapeCsvField(formatDateTime(reg.created_at))}\n`;
      });
    }
    csv += '\n';
    csv += ',\n';
    csv += ',\n';
    csv += ',\n';

    // Primary waitlist
    csv += '===========================================\n';
    csv += 'LISTA DE ESPERA PRIORITÁRIA\n';
    csv += '===========================================\n';
    csv += `Total na Espera Prioritária,${escapeCsvField(eventDetails.waitlist?.length || 0)}\n`;
    csv += '\n';
    csv += 'Ordem,Nome,Sobrenome,WhatsApp,Data de Inscrição\n';
    if (eventDetails.waitlist && eventDetails.waitlist.length > 0) {
      eventDetails.waitlist.forEach((reg: any) => {
        csv += `${escapeCsvField(reg.registration_order)},${escapeCsvField(reg.first_name)},${escapeCsvField(reg.last_name)},${escapeCsvField(reg.whatsapp)},${escapeCsvField(formatDateTime(reg.created_at))}\n`;
      });
    }
    csv += '\n';
    csv += ',\n';
    csv += ',\n';
    csv += ',\n';

    // Secondary waitlist
    csv += '===========================================\n';
    csv += 'LISTA DE ESPERA SECUNDÁRIA\n';
    csv += '===========================================\n';
    csv += `Total na Espera Secundária,${escapeCsvField(eventDetails.waitlist_secondary?.length || 0)}\n`;
    csv += '\n';
    csv += 'Ordem,Nome,Sobrenome,WhatsApp,Data de Inscrição\n';
    if (eventDetails.waitlist_secondary && eventDetails.waitlist_secondary.length > 0) {
      eventDetails.waitlist_secondary.forEach((reg: any) => {
        csv += `${escapeCsvField(reg.registration_order)},${escapeCsvField(reg.first_name)},${escapeCsvField(reg.last_name)},${escapeCsvField(reg.whatsapp)},${escapeCsvField(formatDateTime(reg.created_at))}\n`;
      });
    }
    csv += '\n';
    csv += ',\n';
    csv += ',\n';
    csv += ',\n';

    // Blocked users
    csv += '===========================================\n';
    csv += 'USUÁRIOS SUSPENSOS DURANTE O EVENTO\n';
    csv += '===========================================\n';
    csv += `Total de Suspensos,${escapeCsvField(eventDetails.blocked?.length || 0)}\n`;
    csv += '\n';
    csv += 'Nome,Sobrenome,WhatsApp,Data de Bloqueio\n';
    if (eventDetails.blocked && eventDetails.blocked.length > 0) {
      eventDetails.blocked.forEach((user: any) => {
        csv += `${escapeCsvField(user.first_name)},${escapeCsvField(user.last_name)},${escapeCsvField(user.whatsapp)},${escapeCsvField(formatDateTime(user.created_at))}\n`;
      });
    }

    // Create and download the file
    const blob = new Blob([csv], { type: 'text/csv; charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `detalhes_evento_${showEventDetails}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const addPadePerson = async () => {
    if (!newPadePersonName.trim()) {
      showAlert('Por favor, digite um nome');
      return;
    }

    const response = await fetch('/api/admin/pade-person', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: newPadePersonName.trim(),
        whatsapp: newPadePersonWhatsApp.trim() 
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      setNewPadePersonName('');
      setNewPadePersonWhatsApp('');
      await loadPadePeople();
      showAlert('✅ ' + data.message);
    } else {
      showAlert('❌ ' + (data.error || 'Erro ao adicionar pessoa'));
    }
  };

  const deletePadePerson = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja remover esta pessoa da lista do PADÊ?')) {
      return;
    }

    const response = await fetch('/api/admin/delete-pade-person', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (response.ok) {
      await loadPadePeople();
      showAlert('✅ Pessoa removida com sucesso');
    } else {
      showAlert('❌ Erro ao remover pessoa');
    }
  };

  const movePadePersonUp = async (index: number) => {
    if (index === 0) return; // Already at the top
    
    const newPeople = [...padePeople];
    const temp = newPeople[index];
    newPeople[index] = newPeople[index - 1];
    newPeople[index - 1] = temp;
    
    setPadePeople(newPeople);
    
    // Save to backend
    try {
      const response = await fetch('/api/admin/update-pade-people-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ people: newPeople }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        showAlert('❌ Erro ao salvar ordem');
        loadPadePeople();
      }
    } catch (error) {
      showAlert('❌ Erro ao salvar ordem');
      loadPadePeople();
    }
  };

  const movePadePersonDown = async (index: number) => {
    if (index === padePeople.length - 1) return; // Already at the bottom
    
    const newPeople = [...padePeople];
    const temp = newPeople[index];
    newPeople[index] = newPeople[index + 1];
    newPeople[index + 1] = temp;
    
    setPadePeople(newPeople);
    
    // Save to backend
    try {
      const response = await fetch('/api/admin/update-pade-people-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ people: newPeople }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        showAlert('❌ Erro ao salvar ordem');
        loadPadePeople();
      }
    } catch (error) {
      showAlert('❌ Erro ao salvar ordem');
      loadPadePeople();
    }
  };

  const savePadeEvent = async () => {
    if (!padeFormData.event_name || !padeFormData.event_type || !padeFormData.event_date) {
      showAlert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (padeFormData.participants.length === 0) {
      showAlert('Adicione pelo menos um participante');
      return;
    }

    const response = await fetch('/api/admin/pade-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingPadeEvent,
        ...padeFormData,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showAlert('✅ ' + data.message);
      setPadeFormData({
        event_name: '',
        event_type: '',
        event_date: '',
        participants: [],
        whatsapp_number: '',
      });
      setEditingPadeEvent(null);
      setShowPadeForm(false);
      loadPadeEvents();
    } else {
      showAlert('❌ ' + (data.error || 'Erro ao salvar evento'));
    }
  };

  const deletePadeEvent = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja apagar este evento do PADÊ?')) {
      return;
    }

    const response = await fetch('/api/admin/delete-pade-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (response.ok) {
      showAlert('✅ Evento apagado com sucesso');
      loadPadeEvents();
    } else {
      showAlert('❌ Erro ao apagar evento');
    }
  };

  const sendPadeListToWhatsApp = (data: any) => {
    // Extract event and participants from the API response
    const event = data.event;
    const participants = data.participants || [];

    if (!event.whatsapp_number) {
      showAlert('❌ Número de WhatsApp não configurado para esta lista');
      return;
    }

    if (participants.length === 0) {
      showAlert('Nenhum participante encontrado para enviar a lista');
      return;
    }

    // Build the message
    let message = `🥘🌶️💀 *LISTA DO PADÊ*\n\n`;
    message += `*Nome do Evento:* ${event.event_name}\n`;
    message += `*Tipo:* ${event.event_type}\n`;
    message += `*Data:* ${new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}\n\n`;
    message += `*Responsável do padê:*\n`;
    
    participants.forEach((p: any, index: number) => {
      message += `${index + 1}. ${p.participant_name}\n`;
    });
    
    message += `\nCaso não seja possível, avise no grupo da corrente para que outro irmão possa fazer o padê.`;

    // Send to the event's configured WhatsApp number
    const cleanPhone = event.whatsapp_number.replace(/\D/g, '');
    const phoneWithDDI = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const whatsappUrl = `whatsapp://send?phone=${phoneWithDDI}&text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    showAlert(`✅ Lista enviada para WhatsApp`);
  };

  useEffect(() => {
    if (activeTab === 'history' && isLoggedIn) {
      loadHistory();
    }
    if (activeTab === 'usuarios' && isLoggedIn) {
      loadAdminUsers();
    }
    if (activeTab === 'cadastrados' && isLoggedIn) {
      loadAllUsers();
    }
    if ((activeTab === 'settings' || activeTab === 'eventos' || activeTab === 'list') && isLoggedIn) {
      loadEvents();
    }
    if (activeTab === 'analytics' && isLoggedIn) {
      if (analyticsFilter.periodType === 'custom' && analyticsFilter.dateFrom && analyticsFilter.dateTo) {
        loadAnalytics(undefined, analyticsFilter.dateFrom, analyticsFilter.dateTo);
      } else {
        loadAnalytics(analyticsFilter.days);
      }
    }
    if (activeTab === 'pade' && isLoggedIn) {
      loadPadeEvents();
      loadPadePeople();
    }
    if (activeTab === 'blocked' && isLoggedIn) {
      loadBlockedUsers();
    }
    if (activeTab === 'mensagens' && isLoggedIn) {
      loadDefaultMessages();
    }
  }, [activeTab, isLoggedIn]);

  const loadDefaultMessages = async () => {
    const response = await fetch('/api/admin/default-messages');
    const data = await response.json();
    setDefaultMessages({
      confirmed: data.confirmed || '',
      waitlist: data.waitlist || '',
      waitlist_secondary: data.waitlist_secondary || '',
    });
  };

  const saveDefaultMessages = async () => {
    setMessagesError('');
    setMessagesSuccess('');

    const response = await fetch('/api/admin/default-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(defaultMessages),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      setMessagesSuccess('✅ Mensagens padrão salvas com sucesso!');
    } else {
      setMessagesError('❌ ' + (data.error || 'Erro ao salvar mensagens'));
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
            <h1 className="text-3xl font-bold text-white mb-8 text-center">
              Painel Administrativo
            </h1>

            <form onSubmit={login} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Usuário
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                Entrar
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const formatDateTime = (dateString: string) => {
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
  };

  const sortRegistrations = (regs: RegistrationWithUser[], sortState: SortState) => {
    return [...regs].sort((a, b) => {
      if (sortState.field === 'name') {
        const nameA = `${a.user.first_name} ${a.user.last_name}`.toLowerCase();
        const nameB = `${b.user.first_name} ${b.user.last_name}`.toLowerCase();
        return sortState.order === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      } else {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortState.order === 'asc' 
          ? dateA - dateB
          : dateB - dateA;
      }
    });
  };

  const sortBlockedUsers = (users: User[], sortState: SortState) => {
    return [...users].sort((a, b) => {
      if (sortState.field === 'name') {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return sortState.order === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      } else {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortState.order === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });
  };

  

  

  const toggleSort = (currentSort: SortState, setSort: (sort: SortState) => void, field: SortField) => {
    if (currentSort.field === field) {
      setSort({ field, order: currentSort.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ field, order: 'asc' });
    }
  };

  const SortButton = ({ 
    sortState, 
    setSort, 
    field, 
    label 
  }: { 
    sortState: SortState; 
    setSort: (sort: SortState) => void; 
    field: SortField; 
    label: string;
  }) => {
    const isActive = sortState.field === field;
    return (
      <button
        onClick={() => toggleSort(sortState, setSort, field)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
          isActive
            ? 'bg-blue-500 text-white'
            : 'bg-white/10 text-white/70 hover:bg-white/20'
        }`}
      >
        {label}
        {isActive && (
          sortState.order === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />
        )}
        {!isActive && <ArrowUpDown className="w-3 h-3" />}
      </button>
    );
  };

  const confirmed = sortRegistrations(
    registrations.filter((r) => r.status === 'confirmed'),
    confirmedSort
  );
  const waitlist = sortRegistrations(
    registrations.filter((r) => r.status === 'waitlist'),
    waitlistSort
  );
  const waitlistSecondary = sortRegistrations(
    registrations.filter((r) => r.status === 'waitlist_secondary'),
    waitlistSecondarySort
  );
  const sortedBlockedUsers = sortBlockedUsers(blockedUsers, blockedSort);

  // Get WhatsApp messages from settings or use defaults
  const updatedWhatsAppMessage = settings?.whatsapp_confirmed_message || 'Saravá! Seu nome está confirmado para a gira de hoje! Os portões se abrem as 18:45h e a gira inicia as 19:30h.⏰ O atendimento é realizado por senha, por ordem de chegada. 🔑 Há prioridade no atendimento para idosos, gestantes e pessoas com comorbidades.👴🏿👵🏿🤰🤰🏿🏥 Não há necessidade de vir de branco. NÃO USE Decotes Saias e vestidos curtos Regata/blusa sem manga Bermudas/shorts. O atendimento é realizado somente por mim, portanto demora mais que o normal!🥱 Não há necessidade de chegar para abertura e também não exijo que fique para o encerramento. Endereço:📍 Rua Adamantina 153 - Condomínio Marambaia. Caso precise desistir por qualquer motivo, avise! Há irmãos na espera! Peço que vá até o link, selecione "Precisa cancelar sua inscrição?", coloque o seu numero de WhatsApp e confirme a sua desistência. Axé!';
  const waitlistWhatsAppMessage = settings?.whatsapp_waitlist_message || 'Neste momento já completamos todas as senhas para a gira de hoje. Caso tenha desistência, você será informado.';
  const waitlistSecondaryWhatsAppMessage = settings?.whatsapp_waitlist_secondary_message || 'No momento, não foi possível adicionar você à lista de presença da gira de hoje.\nPor favor, verifique se participou da última gira ou se estava na lista e, por algum motivo, não pôde comparecer sem avisar.\nSe surgirem vagas, você receberá outra mensagem informando sua confirmação.\nSaravá! 🙏✨';

  // Build WhatsApp URL to open directly in app
  const buildWhatsAppUrl = (phone: string, message: string): string => {
    // Add Brazil country code +55 if not present
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithDDI = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `whatsapp://send?phone=${phoneWithDDI}&text=${encodeURIComponent(message)}`;
  };

  const availableTabs = [
    { id: 'list', label: 'Lista', icon: Users, permission: 'list' },
    { id: 'settings', label: 'Configurações (Gira Ativa)', icon: SettingsIcon, permission: 'settings' },
    { id: 'eventos', label: 'Eventos', icon: Calendar, permission: 'settings' },
    { id: 'mensagens', label: 'Mensagens Pré Definidas', icon: MessageCircle, permission: 'settings' },
    { id: 'pade', label: 'PADÊ', icon: Calendar, permission: 'settings' },
    { id: 'blocked', label: 'Usuários Suspensos', icon: Ban, permission: 'blocked' },
    { id: 'cadastrados', label: 'Usuários Cadastrados', icon: Users, permission: 'cadastrados' },
    { id: 'usuarios', label: 'Administradores', icon: Shield, permission: 'usuarios' },
    { id: 'history', label: 'Histórico', icon: Clock, permission: 'history' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, permission: 'settings' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white break-words">Painel Administrativo</h1>
            <p className="text-white/60 text-xs sm:text-sm mt-1 break-words">
              Logado como: {currentAdmin?.username} {currentAdmin?.is_master === 1 && '(Master)'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
            <button
              onClick={logout}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-red-500/20 text-white rounded-lg hover:bg-red-500/30 transition-all border border-red-500/50 text-xs sm:text-sm"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Sair</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all text-xs sm:text-sm"
            >
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Voltar</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-6">
          {availableTabs.map((tab) => {
            if (!hasPermission(tab.permission)) return null;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-medium transition-all text-sm sm:text-base ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Password Change Modal */}
        {showPasswordChange && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-white/20 my-8">
              <h3 className="text-xl font-bold text-white mb-4">Alterar Senha</h3>
              <form onSubmit={changePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Senha Atual
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={4}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={4}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white"
                  />
                </div>

                {passwordError && (
                  <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                    <p className="text-red-200 text-sm">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
                    <p className="text-green-200 text-sm">{passwordSuccess}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 flex-1 py-2 px-4 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Confirmar Alteração
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordError('');
                      setPasswordSuccess('');
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="flex items-center justify-center gap-2 py-2 px-4 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Event Details Modal */}
        {showEventDetails && eventDetails && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-4xl w-full border border-white/20 my-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">Detalhes do Evento</h3>
                  <p className="text-white/70 text-sm mt-1">
                    {new Date(showEventDetails + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - {eventDetails.event?.gira_text || 'Evento'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={exportEventDetailsCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Exportar CSV
                  </button>
                  <button
                    onClick={() => {
                      setShowEventDetails(null);
                      setEventDetails(null);
                    }}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Event Info */}
                {eventDetails.event && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h4 className="text-white font-semibold mb-2">Informações do Evento</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-white/70">Capacidade: <span className="text-white">{eventDetails.event.max_capacity}</span></p>
                      <p className="text-white/70">Horário: <span className="text-white">{eventDetails.event.event_time}</span></p>
                    </div>
                  </div>
                )}

                {/* Confirmed List */}
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-400" />
                    Lista de Confirmados ({eventDetails.confirmed?.length || 0})
                  </h4>
                  {eventDetails.confirmed && eventDetails.confirmed.length > 0 ? (
                    <div className="space-y-2">
                      {eventDetails.confirmed.map((reg: any, index: number) => (
                        <div key={index} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">
                                {reg.first_name} {reg.last_name}
                              </p>
                              <p className="text-white/60 text-sm">{reg.whatsapp}</p>
                              <p className="text-white/40 text-xs mt-1">
                                Ordem: #{reg.registration_order} | {formatDateTime(reg.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/60 text-sm">Nenhum confirmado</p>
                  )}
                </div>

                {/* Primary Waitlist */}
                <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-400" />
                    Lista de Espera Prioritária ({eventDetails.waitlist?.length || 0})
                  </h4>
                  {eventDetails.waitlist && eventDetails.waitlist.length > 0 ? (
                    <div className="space-y-2">
                      {eventDetails.waitlist.map((reg: any, index: number) => (
                        <div key={index} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">
                                {reg.first_name} {reg.last_name}
                              </p>
                              <p className="text-white/60 text-sm">{reg.whatsapp}</p>
                              <p className="text-white/40 text-xs mt-1">
                                Ordem: #{reg.registration_order} | {formatDateTime(reg.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/60 text-sm">Nenhum na espera prioritária</p>
                  )}
                </div>

                {/* Secondary Waitlist */}
                <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    Lista de Espera Secundária ({eventDetails.waitlist_secondary?.length || 0})
                  </h4>
                  {eventDetails.waitlist_secondary && eventDetails.waitlist_secondary.length > 0 ? (
                    <div className="space-y-2">
                      {eventDetails.waitlist_secondary.map((reg: any, index: number) => (
                        <div key={index} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">
                                {reg.first_name} {reg.last_name}
                              </p>
                              <p className="text-white/60 text-sm">{reg.whatsapp}</p>
                              <p className="text-white/40 text-xs mt-1">
                                Ordem: #{reg.registration_order} | {formatDateTime(reg.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/60 text-sm">Nenhum na espera secundária</p>
                  )}
                </div>

                {/* Blocked Users */}
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Ban className="w-5 h-5 text-red-400" />
                    Usuários Suspensos Durante o Evento ({eventDetails.blocked?.filter((u: any) => u.was_unblocked_by_admin === 0).length || 0})
                  </h4>
                  {eventDetails.blocked && eventDetails.blocked.length > 0 ? (
                    <div className="space-y-2">
                      {eventDetails.blocked.map((user: any, index: number) => {
                        const wasUnblocked = user.was_unblocked_by_admin > 0;
                        const wasBlockedByAdmin = user.block_action === 'admin_blocked';
                        
                        return (
                        <div key={index} className={`rounded-lg p-3 border ${
                          wasUnblocked 
                            ? 'bg-green-500/10 border-green-500/30' 
                            : wasBlockedByAdmin
                            ? 'bg-orange-500/10 border-orange-500/30'
                            : 'bg-white/5 border-white/10'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-white/60 text-sm">{user.whatsapp}</p>
                              <p className="text-white/40 text-xs mt-1">
                                {wasBlockedByAdmin ? '🔒 Bloqueado pelo administrador' : '❌ Cancelou inscrição'} em: {formatDateTime(user.created_at)}
                              </p>
                              {wasUnblocked && (
                                <p className="text-green-300 text-sm font-semibold mt-2 flex items-center gap-1">
                                  <Unlock className="w-3 h-3" />
                                  ✅ Desbloqueado pelo administrador em: {formatDateTime(user.unblock_timestamp)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-white/60 text-sm">Nenhum usuário foi suspenso durante este evento</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Dialog */}
        {confirmDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-white/20 my-8">
              {confirmDialog.actionType === 'delete' ? (
                <>
                  <h3 className="text-xl font-bold text-white mb-4">
                    Confirmar Exclusão
                  </h3>
                  <p className="text-white/70 mb-6">
                    Tem certeza que deseja excluir <strong className="text-white">{confirmDialog.userName}</strong> da lista?
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setConfirmDialog(null);
                        if (confirmDialog.type === 'registration') {
                          handleRegistrationAction(confirmDialog.registrationId!, 'delete');
                        } else if (confirmDialog.type === 'user') {
                          deleteUsers([confirmDialog.userId!]);
                        } else if (confirmDialog.type === 'users-bulk') {
                          deleteUsers(confirmDialog.userIds!);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Sim, Excluir
                    </button>
                    <button
                      onClick={() => setConfirmDialog(null)}
                      className="w-full py-3 px-6 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-white mb-4">
                    Mover {confirmDialog.userName}
                  </h3>
                  <p className="text-white/70 mb-6">Para onde deseja mover esta pessoa?</p>
                  <div className="space-y-3">
                    {confirmDialog.type === 'registration' ? (
                  <>
                    <button
                      onClick={() => handleRegistrationAction(confirmDialog.registrationId!, 'move_to_confirmed')}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      Lista de Confirmados
                    </button>
                    <button
                      onClick={() => handleRegistrationAction(confirmDialog.registrationId!, 'move_to_waitlist')}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all"
                    >
                      <ArrowDown className="w-4 h-4" />
                      Lista de Espera Prioritária
                    </button>
                    <button
                      onClick={() => handleRegistrationAction(confirmDialog.registrationId!, 'move_to_waitlist_secondary')}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all"
                    >
                      <ArrowDown className="w-4 h-4" />
                      Lista de Espera Secundária
                    </button>
                    <button
                      onClick={() => handleRegistrationAction(confirmDialog.registrationId!, 'move_to_blocked')}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
                    >
                      <Ban className="w-4 h-4" />
                      Bloquear (15 dias)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleBlockedUserAction(confirmDialog.userId!, 'move_to_confirmed')}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      Lista de Confirmados
                    </button>
                    <button
                      onClick={() => handleBlockedUserAction(confirmDialog.userId!, 'move_to_waitlist')}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all"
                    >
                      <ArrowDown className="w-4 h-4" />
                      Lista de Espera Prioritária
                    </button>
                    <button
                      onClick={() => handleBlockedUserAction(confirmDialog.userId!, 'move_to_waitlist_secondary')}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all"
                    >
                      <ArrowDown className="w-4 h-4" />
                      Lista de Espera Secundária
                    </button>
                    <button
                      onClick={() => handleBlockedUserAction(confirmDialog.userId!, 'unblock')}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all"
                    >
                      <Unlock className="w-4 h-4" />
                      Apenas Desbloquear
                    </button>
                  </>
                )}
                    <button
                      onClick={() => setConfirmDialog(null)}
                      className="w-full py-3 px-6 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === 'list' && hasPermission('list') && (
          <div className="space-y-6">
            {/* Event Selector - Hidden during active recess */}
            {!recessData.is_active && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-4">Próximos Eventos</h2>

                {(() => {
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
                
                // Filter to show active or future events, limit to 5
                const upcomingEvents = events.filter((e: any) => 
                  e.is_active === 1 || e.event_date >= todayBrasilia
                ).slice(0, 5);
                
                return upcomingEvents.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingEvents.map((event: any) => (
                    <div
                      key={event.event_date}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        event.is_active === 1
                          ? 'bg-blue-500/20 border-blue-500/50'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </p>
                        <p className="text-white/60 text-sm">
                          {event.gira_text || 'Evento'} - {event.event_time}
                        </p>
                        {event.is_active === 1 && (
                          <span className="inline-block mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                            Evento Ativo
                          </span>
                        )}
                      </div>
                      {/* Event management buttons only in Eventos tab */}
                    </div>
                  ))}
                </div>
                ) : (
                  <p className="text-white/60 text-center py-4">Nenhum evento futuro cadastrado</p>
                );
              })()}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6">
                <p className="text-green-200 text-sm mb-1">Confirmados</p>
                <p className="text-3xl font-bold text-white">{confirmed.length}</p>
              </div>
              <div className="bg-orange-500/20 border border-orange-500/50 rounded-xl p-6">
                <p className="text-orange-200 text-sm mb-1">Espera Prioritária</p>
                <p className="text-3xl font-bold text-white">{waitlist.length}</p>
              </div>
              <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-6">
                <p className="text-amber-200 text-sm mb-1">Espera Secundária</p>
                <p className="text-3xl font-bold text-white">{waitlistSecondary.length}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <p className="text-white/70">
                  Semana de: {new Date(weekStartDate + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </p>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <label className="text-white font-medium">
                  Enviar a Lista via WhatsApp:
                </label>
                <button
                  onClick={sendListToWhatsApp}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Confirmed list */}
            {confirmed.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Lista de Confirmados</h2>
                  <div className="flex gap-2">
                    <SortButton sortState={confirmedSort} setSort={setConfirmedSort} field="name" label="Nome" />
                    <SortButton sortState={confirmedSort} setSort={setConfirmedSort} field="date" label="Ordem" />
                  </div>
                </div>
                <div className="space-y-2">
                  {confirmed.map((reg) => {
                    const whatsappUrl = buildWhatsAppUrl(reg.user.whatsapp, updatedWhatsAppMessage);
                    const isManuallyConfirmed = reg.manually_confirmed === 1;
                    const isFirstTime = reg.is_first_time === 1;
                    
                    return (
                      <div
                        key={reg.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isFirstTime
                            ? 'bg-blue-400/20 border-blue-400/50'
                            : isManuallyConfirmed
                            ? 'bg-yellow-500/20 border-yellow-500/50'
                            : 'bg-green-500/10 border-green-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold text-lg">#{reg.registration_order}</span>
                          <div>
                            <p className="text-white font-medium">
                              {formatDateTime(reg.created_at)} - {reg.user.first_name} {reg.user.last_name}
                            </p>
                            <p className="text-white/60 text-sm">{reg.user.whatsapp}</p>
                            {isFirstTime && (
                              <p className="text-blue-300 text-sm font-semibold mt-1">**1x UAL**</p>
                            )}
                            {(reg as any).promoted_from === 'waitlist' && (
                              <p className="text-orange-300 text-sm font-semibold mt-1">Origem: lista de espera prioritária</p>
                            )}
                            {(reg as any).promoted_from === 'waitlist_secondary' && (
                              <p className="text-amber-300 text-sm font-semibold mt-1">Origem: lista de espera secundária</p>
                            )}
                          </div>
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 md:p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
                            title="Enviar mensagem no WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                          </a>
                        </div>
                        <div className="flex gap-1.5 md:gap-2">
                          <button
                            onClick={() => setConfirmDialog({
                              show: true,
                              registrationId: reg.id,
                              userName: `${reg.user.first_name} ${reg.user.last_name}`,
                              type: 'registration',
                              actionType: 'delete'
                            })}
                            className="p-2 md:p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                          <button
                            onClick={() => setConfirmDialog({
                              show: true,
                              registrationId: reg.id,
                              userName: `${reg.user.first_name} ${reg.user.last_name}`,
                              type: 'registration',
                              actionType: 'move'
                            })}
                            className="p-2 md:p-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
                            title="Mover"
                          >
                            <ArrowDown className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Waitlist Priority */}
            {waitlist.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Lista de Espera Prioritária</h2>
                  <div className="flex gap-2">
                    <SortButton sortState={waitlistSort} setSort={setWaitlistSort} field="name" label="Nome" />
                    <SortButton sortState={waitlistSort} setSort={setWaitlistSort} field="date" label="Ordem" />
                  </div>
                </div>
                <div className="space-y-2">
                  {waitlist.map((reg) => {
                    const whatsappUrl = buildWhatsAppUrl(reg.user.whatsapp, waitlistWhatsAppMessage);
                    const isFirstTime = reg.is_first_time === 1;
                    
                    return (
                      <div
                        key={reg.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isFirstTime
                            ? 'bg-blue-400/20 border-blue-400/50'
                            : 'bg-orange-500/10 border-orange-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold text-lg">#{reg.registration_order}</span>
                          <div>
                            <p className="text-white font-medium">
                              {formatDateTime(reg.created_at)} - {reg.user.first_name} {reg.user.last_name}
                            </p>
                            <p className="text-white/60 text-sm">{reg.user.whatsapp}</p>
                            {isFirstTime && (
                              <p className="text-blue-300 text-sm font-semibold mt-1">**1x UAL**</p>
                            )}
                          </div>
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 md:p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
                            title="Enviar mensagem no WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                          </a>
                        </div>
                        <div className="flex gap-1.5 md:gap-2">
                          <button
                            onClick={() => handleRegistrationAction(reg.id, 'confirm')}
                            className="p-2 md:p-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md hover:shadow-lg"
                            title="Confirmar"
                          >
                            <Check className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                          <button
                            onClick={() => setConfirmDialog({
                              show: true,
                              registrationId: reg.id,
                              userName: `${reg.user.first_name} ${reg.user.last_name}`,
                              type: 'registration',
                              actionType: 'delete'
                            })}
                            className="p-2 md:p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                          <button
                            onClick={() => setConfirmDialog({
                              show: true,
                              registrationId: reg.id,
                              userName: `${reg.user.first_name} ${reg.user.last_name}`,
                              type: 'registration',
                              actionType: 'move'
                            })}
                            className="p-2 md:p-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
                            title="Mover"
                          >
                            <ArrowDown className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Waitlist Secondary */}
            {waitlistSecondary.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Lista de Espera Secundária</h2>
                  <div className="flex gap-2">
                    <SortButton sortState={waitlistSecondarySort} setSort={setWaitlistSecondarySort} field="name" label="Nome" />
                    <SortButton sortState={waitlistSecondarySort} setSort={setWaitlistSecondarySort} field="date" label="Ordem" />
                  </div>
                </div>
                <div className="space-y-2">
                  {waitlistSecondary.map((reg) => {
                    const whatsappUrl = buildWhatsAppUrl(reg.user.whatsapp, waitlistSecondaryWhatsAppMessage);
                    const isFirstTime = reg.is_first_time === 1;
                    
                    return (
                      <div
                        key={reg.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isFirstTime
                            ? 'bg-blue-400/20 border-blue-400/50'
                            : 'bg-amber-500/10 border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold text-lg">#{reg.registration_order}</span>
                          <div>
                            <p className="text-white font-medium">
                              {formatDateTime(reg.created_at)} - {reg.user.first_name} {reg.user.last_name}
                            </p>
                            <p className="text-white/60 text-sm">{reg.user.whatsapp}</p>
                          </div>
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 md:p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
                            title="Enviar mensagem no WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                          </a>
                        </div>
                        <div className="flex gap-1.5 md:gap-2">
                          <button
                            onClick={() => handleRegistrationAction(reg.id, 'confirm')}
                            className="p-2 md:p-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md hover:shadow-lg"
                            title="Confirmar"
                          >
                            <Check className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                          <button
                            onClick={() => setConfirmDialog({
                              show: true,
                              registrationId: reg.id,
                              userName: `${reg.user.first_name} ${reg.user.last_name}`,
                              type: 'registration',
                              actionType: 'delete'
                            })}
                            className="p-2 md:p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                          <button
                            onClick={() => setConfirmDialog({
                              show: true,
                              registrationId: reg.id,
                              userName: `${reg.user.first_name} ${reg.user.last_name}`,
                              type: 'registration',
                              actionType: 'move'
                            })}
                            className="p-2 md:p-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
                            title="Mover"
                          >
                            <ArrowDown className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'blocked' && hasPermission('blocked') && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-white">Usuários Suspensos</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowBlockUserForm(!showBlockUserForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                >
                  <Ban className="w-4 h-4" />
                  {showBlockUserForm ? 'Fechar' : 'Bloquear Usuário'}
                </button>
                <button
                  onClick={() => {
                    setShowBlockedHistory(!showBlockedHistory);
                    if (!showBlockedHistory) {
                      loadBlockedHistory(blockedHistoryFilter.days);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                >
                  <Clock className="w-4 h-4" />
                  {showBlockedHistory ? 'Fechar Histórico' : 'Histórico'}
                </button>
                {blockedUsers.length > 0 && !showBlockedHistory && !showBlockUserForm && (
                  <div className="flex gap-2">
                    <SortButton sortState={blockedSort} setSort={setBlockedSort} field="name" label="Nome" />
                    <SortButton sortState={blockedSort} setSort={setBlockedSort} field="date" label="Data" />
                  </div>
                )}
              </div>
            </div>
            
            {showBlockUserForm && (
              <div className="bg-red-500/10 rounded-xl p-6 border border-red-500/30 mb-6">
                <h3 className="text-white font-medium mb-4">Bloquear Usuário Diretamente</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Número de WhatsApp
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={blockUserWhatsApp}
                      onChange={(e) => setBlockUserWhatsApp(e.target.value)}
                      placeholder="5519999999999"
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                    />
                    <p className="text-white/50 text-xs mt-1">
                      O usuário será bloqueado por 15 dias e não poderá se cadastrar novamente durante este período
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Motivo do Bloqueio (opcional)
                    </label>
                    <textarea
                      value={blockUserReason}
                      onChange={(e) => setBlockUserReason(e.target.value)}
                      placeholder="Digite o motivo do bloqueio"
                      rows={3}
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 resize-vertical"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={blockUserDirectly}
                      className="flex items-center justify-center gap-2 flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                    >
                      <Ban className="w-4 h-4" />
                      Bloquear por 15 dias
                    </button>
                    <button
                      onClick={() => {
                        setShowBlockUserForm(false);
                        setBlockUserWhatsApp('');
                        setBlockUserReason('');
                      }}
                      className="px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {showBlockedHistory ? (
              <div className="space-y-4">
                {/* Filter Controls */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-white font-medium mb-3">Período</h3>
                  <div className="flex gap-2 flex-wrap mb-4">
                    <select
                      value={blockedHistoryFilter.periodType === 'custom' ? 'custom' : blockedHistoryFilter.days}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'custom') {
                          setBlockedHistoryFilter({ ...blockedHistoryFilter, periodType: 'custom' });
                        } else {
                          const days = parseInt(value);
                          setBlockedHistoryFilter({ ...blockedHistoryFilter, periodType: 'days', days });
                          loadBlockedHistory(days);
                        }
                      }}
                      className="px-4 py-2 bg-white border border-white/30 rounded-xl text-black"
                    >
                      <option value="1">1 dia</option>
                      <option value="7">1 semana</option>
                      <option value="30">1 mês</option>
                      <option value="365">1 ano</option>
                      <option value="custom">Período desejado</option>
                    </select>
                  </div>

                  {blockedHistoryFilter.periodType === 'custom' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-2">
                            Data Inicial
                          </label>
                          <input
                            type="date"
                            value={blockedHistoryFilter.dateFrom}
                            onChange={(e) => setBlockedHistoryFilter({ ...blockedHistoryFilter, dateFrom: e.target.value })}
                            className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-2">
                            Data Final
                          </label>
                          <input
                            type="date"
                            value={blockedHistoryFilter.dateTo}
                            onChange={(e) => setBlockedHistoryFilter({ ...blockedHistoryFilter, dateTo: e.target.value })}
                            className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (blockedHistoryFilter.dateFrom && blockedHistoryFilter.dateTo) {
                              if (blockedHistoryFilter.dateFrom > blockedHistoryFilter.dateTo) {
                                showAlert('❌ A data inicial deve ser anterior ou igual à data final');
                                return;
                              }
                              loadBlockedHistory(undefined, blockedHistoryFilter.dateFrom, blockedHistoryFilter.dateTo);
                            }
                          }}
                          disabled={!blockedHistoryFilter.dateFrom || !blockedHistoryFilter.dateTo}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Check className="w-4 h-4" />
                          Aplicar Período
                        </button>
                        <button
                          onClick={() => {
                            setBlockedHistoryFilter({ ...blockedHistoryFilter, periodType: 'days', dateFrom: '', dateTo: '' });
                            loadBlockedHistory(blockedHistoryFilter.days);
                          }}
                          className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* History List */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-white font-medium">
                      Total: {blockedHistory.length} registro(s)
                    </p>
                    {selectedBlockedHistoryItems.length > 0 && (
                      <button
                        onClick={async () => {
                          if (window.confirm(`Tem certeza que deseja apagar ${selectedBlockedHistoryItems.length} registro(s) selecionado(s)?`)) {
                            const response = await fetch('/api/admin/delete-history', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ids: selectedBlockedHistoryItems }),
                            });
                            if (response.ok) {
                              if (blockedHistoryFilter.periodType === 'custom' && blockedHistoryFilter.dateFrom && blockedHistoryFilter.dateTo) {
                                loadBlockedHistory(undefined, blockedHistoryFilter.dateFrom, blockedHistoryFilter.dateTo);
                              } else {
                                loadBlockedHistory(blockedHistoryFilter.days);
                              }
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir Selecionados ({selectedBlockedHistoryItems.length})
                      </button>
                    )}
                  </div>

                  {blockedHistory.length === 0 ? (
                    <p className="text-white/60 text-center py-8">Nenhum registro encontrado neste período</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      <div className="mb-2">
                        <label className="flex items-center gap-2 text-white cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedBlockedHistoryItems.length === blockedHistory.length && blockedHistory.length > 0}
                            ref={(el) => {
                              if (el) {
                                el.indeterminate = selectedBlockedHistoryItems.length > 0 && selectedBlockedHistoryItems.length < blockedHistory.length;
                              }
                            }}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBlockedHistoryItems(blockedHistory.map((h: any) => h.history_id));
                              } else {
                                setSelectedBlockedHistoryItems([]);
                              }
                            }}
                            className="w-4 h-4"
                          />
                          {selectedBlockedHistoryItems.length === 0 
                            ? 'Selecionar Todos'
                            : selectedBlockedHistoryItems.length === blockedHistory.length
                            ? 'Desmarcar Todos'
                            : `Selecionados: ${selectedBlockedHistoryItems.length}/${blockedHistory.length}`}
                        </label>
                      </div>
                      {blockedHistory.map((record: any) => {
                        const isUnblockAction = record.action === 'admin_unblocked';
                        const isBlockAction = record.action === 'admin_blocked';
                        const isCancellation = record.action === 'user_cancelled';
                        const isCurrentlyBlocked = record.is_blocked === 1;
                        const blockExpired = record.blocked_until && new Date(record.blocked_until) < new Date();
                        
                        return (
                        <div
                          key={record.history_id}
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            isUnblockAction
                              ? 'bg-green-500/10 border-green-500/30'
                              : isBlockAction
                              ? 'bg-red-500/10 border-red-500/30'
                              : 'bg-orange-500/10 border-orange-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={selectedBlockedHistoryItems.includes(record.history_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBlockedHistoryItems([...selectedBlockedHistoryItems, record.history_id]);
                                } else {
                                  setSelectedBlockedHistoryItems(selectedBlockedHistoryItems.filter(id => id !== record.history_id));
                                }
                              }}
                              className="w-4 h-4 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium">
                                {record.first_name} {record.last_name}
                              </p>
                              <p className="text-white/60 text-sm">{record.whatsapp}</p>
                              <p className="text-white/40 text-xs mt-1">
                                Evento: {record.event_name || 'N/A'} ({new Date(record.week_start_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })})
                              </p>
                              
                              {/* Action type */}
                              {isUnblockAction && (
                                <p className="text-green-300 text-sm font-semibold mt-2 flex items-center gap-1">
                                  <Unlock className="w-3 h-3" />
                                  ✅ Desbloqueado pelo administrador em: {formatDateTime(record.created_at)}
                                </p>
                              )}
                              {isBlockAction && (
                                <div className="mt-2">
                                  <p className="text-red-300 text-sm font-semibold flex items-center gap-1">
                                    <Ban className="w-3 h-3" />
                                    🔒 Bloqueado pelo administrador em: {formatDateTime(record.created_at)}
                                  </p>
                                  {record.notes && (
                                    <p className="text-white/40 text-xs mt-1">
                                      Motivo: {record.notes}
                                    </p>
                                  )}
                                  {record.unblock_timestamp && (
                                    <p className="text-green-300 text-xs mt-1">
                                      → Desbloqueado em: {formatDateTime(record.unblock_timestamp)}
                                    </p>
                                  )}
                                </div>
                              )}
                              {isCancellation && (
                                <div className="mt-2">
                                  <p className="text-orange-300 text-sm font-semibold flex items-center gap-1">
                                    <X className="w-3 h-3" />
                                    ❌ Cancelou inscrição em: {formatDateTime(record.created_at)}
                                  </p>
                                  {record.unblock_timestamp && (
                                    <p className="text-green-300 text-xs mt-1">
                                      → Desbloqueado em: {formatDateTime(record.unblock_timestamp)}
                                    </p>
                                  )}
                                </div>
                              )}
                              
                              {/* Current status */}
                              {isCurrentlyBlocked && !blockExpired && record.blocked_until && !isUnblockAction && (
                                <p className="text-yellow-300 text-xs mt-1">
                                  Status atual: Ainda suspenso até {formatDateTime(record.blocked_until)}
                                </p>
                              )}
                              {isCurrentlyBlocked && blockExpired && !isUnblockAction && (
                                <p className="text-blue-300 text-xs mt-1">
                                  Status atual: Bloqueio expirou automaticamente
                                </p>
                              )}
                              {!isCurrentlyBlocked && !isUnblockAction && (
                                <p className="text-green-300 text-xs mt-1">
                                  Status atual: Não está bloqueado
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {isCurrentlyBlocked && !isUnblockAction && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Tem certeza que deseja desbloquear ${record.first_name} ${record.last_name}?`)) {
                                    const response = await fetch('/api/admin/unblock', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ user_id: record.id }),
                                    });
                                    if (response.ok) {
                                      showAlert('✅ Usuário desbloqueado com sucesso');
                                      if (blockedHistoryFilter.periodType === 'custom' && blockedHistoryFilter.dateFrom && blockedHistoryFilter.dateTo) {
                                        loadBlockedHistory(undefined, blockedHistoryFilter.dateFrom, blockedHistoryFilter.dateTo);
                                      } else {
                                        loadBlockedHistory(blockedHistoryFilter.days);
                                      }
                                    }
                                  }
                                }}
                                className="p-2 md:p-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md hover:shadow-lg"
                                title="Desbloquear usuário"
                              >
                                <Unlock className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (window.confirm(`Tem certeza que deseja apagar este registro de ${record.first_name} ${record.last_name}?`)) {
                                  const response = await fetch('/api/admin/delete-history', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ ids: [record.history_id] }),
                                  });
                                  if (response.ok) {
                                    if (blockedHistoryFilter.periodType === 'custom' && blockedHistoryFilter.dateFrom && blockedHistoryFilter.dateTo) {
                                      loadBlockedHistory(undefined, blockedHistoryFilter.dateFrom, blockedHistoryFilter.dateTo);
                                    } else {
                                      loadBlockedHistory(blockedHistoryFilter.days);
                                    }
                                  }
                                }
                              }}
                              className="p-2 md:p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg"
                              title="Excluir registro"
                            >
                              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}
                </div>

                {/* Delete All Button */}
                {blockedHistory.length > 0 && (
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        if (window.confirm('Tem certeza que deseja apagar TODO o histórico de suspensões? Esta ação não pode ser desfeita!')) {
                          if (window.confirm('Esta é sua última chance! Confirma que deseja apagar TODO o histórico de suspensões?')) {
                            const ids = blockedHistory.map((h: any) => h.history_id);
                            const response = await fetch('/api/admin/delete-history', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ids }),
                            });
                            if (response.ok) {
                              if (blockedHistoryFilter.periodType === 'custom' && blockedHistoryFilter.dateFrom && blockedHistoryFilter.dateTo) {
                                loadBlockedHistory(undefined, blockedHistoryFilter.dateFrom, blockedHistoryFilter.dateTo);
                              } else {
                                loadBlockedHistory(blockedHistoryFilter.days);
                              }
                            }
                          }
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Apagar TODO o Histórico
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
            
            {blockedUsers.length === 0 ? (
              <p className="text-white/60 text-center py-8">Nenhum usuário suspenso no momento</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {sortedBlockedUsers.map((user: User) => {
                  const daysRemaining = getDaysRemaining(user.blocked_until);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between bg-red-500/10 p-4 rounded-lg border border-red-500/30"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {formatDateTime(user.created_at)} - {user.first_name} {user.last_name}
                        </p>
                        <p className="text-white/60 text-sm">{user.whatsapp}</p>
                        <p className="text-red-300 text-xs mt-1">
                          {daysRemaining > 0 
                            ? `${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'} restantes`
                            : 'Bloqueio expirado'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setExtendBlockUserId(user.id);
                            setExtendBlockUserName(`${user.first_name} ${user.last_name}`);
                            setExtendBlockCurrentDate(user.blocked_until || '');
                            setExtendBlockNewDate('');
                            setExtendBlockAdditionalDays('');
                            setShowExtendBlockModal(true);
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all shadow-md hover:shadow-lg"
                          title="Estender período de bloqueio"
                        >
                          <Clock className="w-4 h-4" />
                          <span className="text-xs md:text-sm">Estender</span>
                        </button>
                        <button
                          onClick={() => setConfirmDialog({
                            show: true,
                            userId: user.id,
                            userName: `${user.first_name} ${user.last_name}`,
                            type: 'blocked'
                          })}
                          className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
                          title="Manipular"
                        >
                          <ArrowDown className="w-4 h-4 md:w-5 md:h-5" />
                          <span className="text-sm md:text-base">Mover</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </>
          )}
          </div>
        )}

        {activeTab === 'settings' && hasPermission('settings') && editedSettings && (
          <div className="space-y-6">
            {/* Show message if no active event */}
            {!events.find((e: any) => e.is_active === 1) && (
              <div className="bg-yellow-500/10 backdrop-blur-md rounded-xl p-6 border border-yellow-500/30">
                <p className="text-yellow-200 text-center">
                  ⚠️ Nenhum evento ativo no momento. Ative um evento na aba "Eventos" para configurá-lo aqui.
                </p>
              </div>
            )}
            
            {/* Event Selector - Hidden during active recess */}
            {!recessData.is_active && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-4">Próximos Eventos</h2>

                {(() => {
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
                
                // Filter to show only active or future events, then take up to 5
                const upcomingEvents = events
                  .filter((e: any) => e.is_active === 1 || e.event_date >= todayBrasilia)
                  .slice(0, 5);
                
                return upcomingEvents.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-white/70 text-sm mb-2">
                      {upcomingEvents.length >= 5 && events.length > 5 && (
                        <span className="text-xs text-blue-300">
                          Mostrando os próximos 5 eventos. Ver todos na aba "Eventos"
                        </span>
                      )}
                    </p>
                    {upcomingEvents.map((event: any) => (
                    <div
                      key={event.event_date}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        event.is_active === 1
                          ? 'bg-blue-500/20 border-blue-500/50'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </p>
                        <p className="text-white/60 text-sm">
                          {event.gira_text} - {event.event_time}
                        </p>
                        {event.is_active === 1 && (
                          <span className="inline-block mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                            Evento Ativo
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {/* Event management buttons only in Eventos tab */}
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  <p className="text-white/60 text-center py-4">Nenhum evento futuro cadastrado</p>
                );
              })()}
              </div>
            )}

            <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-white/20 max-w-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">Configurações da Gira Ativa</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Texto do cabeçalho
                  </label>
                  <input
                    type="text"
                    value={editedSettings.header_text}
                    onChange={(e) => setEditedSettings({ ...editedSettings, header_text: e.target.value })}
                    disabled={!hasGranularPermission('settings', 'header_text', 'write')}
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white placeholder-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Tipo de evento (Ex: Gira, E.M):
                  </label>
                  <input
                    type="text"
                    value={editedSettings.gira_prefix || ''}
                    onChange={(e) => setEditedSettings({ ...editedSettings, gira_prefix: e.target.value })}
                    disabled={!hasGranularPermission('settings', 'gira_text', 'write')}
                    placeholder="Ex: Gira, E.M"
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white placeholder-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-white/50 text-xs mt-1">
                    Este texto aparecerá antes do nome da gira na página inicial
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Evento:
                  </label>
                  <input
                    type="text"
                    value={editedSettings.gira_text}
                    onChange={(e) => setEditedSettings({ ...editedSettings, gira_text: capitalizeWords(e.target.value) })}
                    disabled={!hasGranularPermission('settings', 'gira_text', 'write')}
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white placeholder-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Data da Gira
                  </label>
                  <input
                    type="date"
                    value={editedSettings.event_date}
                    onChange={(e) => setEditedSettings({ ...editedSettings, event_date: e.target.value })}
                    disabled={!hasGranularPermission('settings', 'event_date', 'write')}
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white [color-scheme:dark] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Hora da Gira
                  </label>
                  <input
                    type="time"
                    value={editedSettings.event_time}
                    onChange={(e) => setEditedSettings({ ...editedSettings, event_time: e.target.value })}
                    disabled={!hasGranularPermission('settings', 'event_time', 'write')}
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white [color-scheme:dark] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Data e Hora de Abertura da Lista
                  </label>
                  <input
                    type="datetime-local"
                    value={editedSettings.registration_opens_at}
                    onChange={(e) => setEditedSettings({ ...editedSettings, registration_opens_at: e.target.value })}
                    disabled={!hasGranularPermission('settings', 'registration_opens_at', 'write')}
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white [color-scheme:dark] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Data e Hora de Fechamento da Lista
                  </label>
                  <input
                    type="datetime-local"
                    value={editedSettings.registration_closes_at}
                    onChange={(e) => setEditedSettings({ ...editedSettings, registration_closes_at: e.target.value })}
                    disabled={!hasGranularPermission('settings', 'registration_closes_at', 'write')}
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white [color-scheme:dark] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Capacidade Máxima
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editedSettings.max_capacity}
                    onChange={(e) => setEditedSettings({ ...editedSettings, max_capacity: parseInt(e.target.value) })}
                    disabled={!hasGranularPermission('settings', 'max_capacity', 'write')}
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Logo da Página Inicial
                  </label>
                  {editedSettings.logo_url && (
                    <div className="mb-4 flex flex-col items-center">
                      <img 
                        src={editedSettings.logo_url} 
                        alt="Logo atual" 
                        style={{ 
                          width: `${editedSettings.logo_size || 256}px`, 
                          height: `${editedSettings.logo_size || 256}px` 
                        }}
                        className="object-contain bg-white/10 rounded-lg p-2 border-2 border-white/30"
                      />
                      <p className="text-white/70 text-sm mt-2">
                        Prévia: {editedSettings.logo_size || 256}px x {editedSettings.logo_size || 256}px
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const logoUrl = await handleLogoUpload(file);
                      if (logoUrl) {
                        setSettingsSuccess('Logo carregado com sucesso! Clique em "Salvar Configurações" para aplicar.');
                      }
                    }}
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 file:cursor-pointer"
                  />
                  <p className="text-white/50 text-xs mt-1">
                    Formatos aceitos: PNG, JPG, GIF. Tamanho recomendado: 500x500px
                  </p>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Tamanho do Logo: {editedSettings.logo_size || 256}px
                    </label>
                    <input
                      type="range"
                      min="128"
                      max="512"
                      step="16"
                      value={editedSettings.logo_size || 256}
                      onChange={(e) => setEditedSettings({ ...editedSettings, logo_size: parseInt(e.target.value) })}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-white/50 text-xs mt-1">
                      <span>128px (Pequeno)</span>
                      <span>512px (Grande)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Cores do Tema
                  </label>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-2">
                        Modo de Cores
                      </label>
                      <select
                        value={editedSettings.theme_mode || 'auto'}
                        onChange={(e) => setEditedSettings({ ...editedSettings, theme_mode: e.target.value })}
                        className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                      >
                        <option value="auto">Automático (baseado nas tags da gira)</option>
                        <option value="manual">Manual (escolher cores)</option>
                      </select>
                      <p className="text-white/50 text-xs mt-1">
                        Modo automático detecta cores baseado no texto da gira (ex: Caboclos = Verde, Preto Velho = Preto e Branco)
                      </p>
                    </div>
                    
                    {editedSettings.theme_mode === 'manual' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-white/70 mb-2">
                            Cor Principal
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={editedSettings.theme_color_1 || '#3b82f6'}
                              onChange={(e) => setEditedSettings({ ...editedSettings, theme_color_1: e.target.value })}
                              className="w-20 h-12 rounded-lg cursor-pointer border-2 border-white/30"
                            />
                            <input
                              type="text"
                              value={editedSettings.theme_color_1 || '#3b82f6'}
                              onChange={(e) => setEditedSettings({ ...editedSettings, theme_color_1: e.target.value })}
                              placeholder="#3b82f6"
                              className="flex-1 px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white placeholder-white/50"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm text-white/70 mb-2">
                            Cor Secundária (opcional)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={editedSettings.theme_color_2 || '#1e40af'}
                              onChange={(e) => setEditedSettings({ ...editedSettings, theme_color_2: e.target.value })}
                              className="w-20 h-12 rounded-lg cursor-pointer border-2 border-white/30"
                            />
                            <input
                              type="text"
                              value={editedSettings.theme_color_2 || '#1e40af'}
                              onChange={(e) => setEditedSettings({ ...editedSettings, theme_color_2: e.target.value })}
                              placeholder="#1e40af"
                              className="flex-1 px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white placeholder-white/50"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {editedSettings.theme_mode === 'manual' && editedSettings.theme_color_1 && (
                      <div className="p-4 rounded-lg" style={{
                        background: editedSettings.theme_color_2 
                          ? `linear-gradient(135deg, ${editedSettings.theme_color_1} 0%, ${editedSettings.theme_color_2} 100%)`
                          : editedSettings.theme_color_1
                      }}>
                        <p className="text-white text-center font-semibold">Prévia do Gradiente</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold mb-1">Sincronizar Mensagens WhatsApp</h4>
                      <p className="text-white/70 text-xs">
                        Copiar as mensagens pré definidas do menu "Mensagens Pré Definidas" para este evento
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!editingEvent) return;
                        
                        // Get default messages from the "Mensagens Pré Definidas" menu
                        const response = await fetch('/api/admin/default-messages');
                        const data = await response.json();
                        
                        if (!data.confirmed && !data.waitlist && !data.waitlist_secondary) {
                          showAlert('❌ Nenhuma mensagem pré definida encontrada. Configure-as no menu "Mensagens Pré Definidas"');
                          return;
                        }
                        
                        // Update current form with default messages
                        setEditEventData({
                          ...editEventData,
                          whatsapp_confirmed_message: data.confirmed || '',
                          whatsapp_waitlist_message: data.waitlist || '',
                          whatsapp_waitlist_secondary_message: data.waitlist_secondary || '',
                        });
                        
                        showAlert('✅ Mensagens sincronizadas! Clique em "Salvar Alterações" para aplicar.');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Sincronizar Agora
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Mensagem WhatsApp - Lista de Presença
                  </label>
                  <textarea
                    value={editedSettings.whatsapp_confirmed_message || ''}
                    onChange={(e) => setEditedSettings({ ...editedSettings, whatsapp_confirmed_message: e.target.value })}
                    placeholder="Digite ou cole a mensagem que será enviada para pessoas confirmadas na lista de presença"
                    rows={6}
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white placeholder-white/50 resize-vertical"
                  />
                  <p className="text-white/50 text-xs mt-1">
                    Esta mensagem será enviada ao clicar no botão de WhatsApp para pessoas confirmadas
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Mensagem WhatsApp - Lista de Espera
                  </label>
                  <textarea
                    value={editedSettings.whatsapp_waitlist_message || ''}
                    onChange={(e) => setEditedSettings({ ...editedSettings, whatsapp_waitlist_message: e.target.value })}
                    placeholder="Digite ou cole a mensagem que será enviada para pessoas na lista de espera prioritária"
                    rows={6}
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white placeholder-white/50 resize-vertical"
                  />
                  <p className="text-white/50 text-xs mt-1">
                    Esta mensagem será enviada ao clicar no botão de WhatsApp para pessoas na lista de espera
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Mensagem WhatsApp - Lista de Espera Secundária
                  </label>
                  <textarea
                    value={editedSettings.whatsapp_waitlist_secondary_message || ''}
                    onChange={(e) => setEditedSettings({ ...editedSettings, whatsapp_waitlist_secondary_message: e.target.value })}
                    placeholder="Digite ou cole a mensagem que será enviada para pessoas na lista de espera secundária"
                    rows={6}
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white placeholder-white/50 resize-vertical"
                  />
                  <p className="text-white/50 text-xs mt-1">
                    Esta mensagem será enviada ao clicar no botão de WhatsApp para pessoas na lista de espera secundária
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Número de WhatsApp para Cancelamentos
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={(editedSettings as any).whatsapp_contact_number || '5519997972276'}
                    onChange={(e) => setEditedSettings({ ...editedSettings, whatsapp_contact_number: e.target.value } as any)}
                    placeholder="5519997972276"
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white placeholder-white/50"
                  />
                  <p className="text-white/50 text-xs mt-1">
                    Este número receberá uma mensagem automática quando alguém cancelar sua presença no evento
                  </p>
                </div>

                {settingsError && (
                  <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                    <p className="text-red-200 text-sm">{settingsError}</p>
                  </div>
                )}

                {settingsSuccess && (
                  <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
                    <p className="text-green-200 text-sm">{settingsSuccess}</p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={saveSettings}
                    className="flex items-center justify-center gap-2 flex-1 py-2 px-4 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Configurações
                  </button>
                  {selectedEventDate && (
                    <button
                      onClick={async () => {
                        const response = await fetch(`/api/admin/event-observations/${selectedEventDate}`);
                        if (response.ok) {
                          const data = await response.json();
                          setEventObservations(data.observations || '');
                          setShowObservationsModal(selectedEventDate);
                        }
                      }}
                      className="flex items-center justify-center gap-2 py-2 px-4 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Observações
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (settings) {
                        // Check if any changes were made
                        const hasChanges = 
                          editedSettings?.gira_text !== settings.gira_text ||
                          editedSettings?.header_text !== settings.header_text ||
                          editedSettings?.event_date !== settings.event_date ||
                          editedSettings?.event_time !== settings.event_time ||
                          editedSettings?.registration_opens_at !== settings.registration_opens_at ||
                          editedSettings?.registration_closes_at !== settings.registration_closes_at ||
                          editedSettings?.max_capacity !== settings.max_capacity;
                        
                        setEditedSettings({ ...settings });
                        setSettingsSuccess('');
                        setSettingsError(hasChanges ? 'Alteração cancelada' : 'Nenhuma alteração detectada!');
                      }
                    }}
                    className="flex items-center justify-center gap-2 py-2 px-4 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              </div>
            </div>

            {hasGranularPermission('settings', 'clear_all_data', 'write') && selectedEventDate && (
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-red-500/50 max-w-2xl">
                <h2 className="text-2xl font-bold text-white mb-4">Excluir dados do evento</h2>
                <p className="text-white/70 mb-6">
                  Atenção: Esta ação irá apagar permanentemente todos os dados do evento de {new Date(selectedEventDate + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })} (registrações e histórico). Esta ação não pode ser desfeita.
                </p>
                <button
                  onClick={async () => {
                  if (window.confirm(`Tem certeza que deseja apagar todos os dados do evento de ${new Date(selectedEventDate + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}? Esta ação não pode ser desfeita!`)) {
                    if (window.confirm('Esta é sua última chance! Confirma que deseja apagar todos os dados deste evento?')) {
                      const response = await fetch('/api/admin/delete-event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ event_date: selectedEventDate }),
                      });
                      if (response.ok) {
                        showAlert('Dados do evento foram apagados com sucesso');
                        setSelectedEventDate('');
                        loadEvents();
                        loadData();
                      } else {
                        showAlert('Erro ao apagar dados');
                      }
                    }
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold"
              >
                <Trash2 className="w-5 h-5" />
                Apagar dados do evento selecionado
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'usuarios' && hasPermission('usuarios') && (
          <div className="space-y-6">
            {/* Change Password Section */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Alterar Minha Senha</h2>
                <button
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                >
                  <Key className="w-4 h-4" />
                  {showPasswordChange ? 'Cancelar' : 'Trocar Senha'}
                </button>
              </div>

              {showPasswordChange && (
                <form onSubmit={changePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Senha Atual
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={4}
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={4}
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white"
                    />
                  </div>

                  {passwordError && (
                    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                      <p className="text-red-200 text-sm">{passwordError}</p>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
                      <p className="text-green-200 text-sm">{passwordSuccess}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all"
                  >
                    Confirmar Alteração
                  </button>
                </form>
              )}
            </div>

            {/* Admin Users Management */}
            {currentAdmin?.is_master === 1 && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Administradores do Sistema</h2>
                  <button
                    onClick={() => setShowAddAdmin(!showAddAdmin)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                  >
                    <Shield className="w-4 h-4" />
                    {showAddAdmin ? 'Cancelar' : 'Adicionar Administrador'}
                  </button>
                </div>

                {showAddAdmin && (
                  <div className="mb-6 p-6 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="text-white font-medium mb-4">Criar Novo Administrador</h3>
                    <form onSubmit={createAdmin} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          Nome de Usuário
                        </label>
                        <input
                          type="text"
                          value={newAdmin.username}
                          onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                          required
                          minLength={3}
                          className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-2">
                            Senha
                          </label>
                          <input
                            type="password"
                            value={newAdmin.password}
                            onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                            required
                            minLength={4}
                            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-2">
                            Confirmar Senha
                          </label>
                          <input
                            type="password"
                            value={newAdmin.confirm_password}
                            onChange={(e) => setNewAdmin({ ...newAdmin, confirm_password: e.target.value })}
                            required
                            minLength={4}
                            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                          />
                        </div>
                      </div>

                      <PermissionEditor
                        permissions={newAdmin.granular_permissions}
                        onChange={(perms) => setNewAdmin({ ...newAdmin, granular_permissions: perms })}
                      />

                      {currentAdmin?.is_master !== 1 && (
                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-2">
                            Senha Master (01530153)
                          </label>
                          <input
                            type="password"
                            value={newAdmin.master_password}
                            onChange={(e) => setNewAdmin({ ...newAdmin, master_password: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                          />
                        </div>
                      )}

                      {adminError && (
                        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                          <p className="text-red-200 text-sm">{adminError}</p>
                        </div>
                      )}

                      {adminSuccess && (
                        <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
                          <p className="text-green-200 text-sm">{adminSuccess}</p>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:from-green-600 hover:to-green-700 transition-all"
                      >
                        Criar Administrador
                      </button>
                    </form>
                  </div>
                )}

                {adminUsers.length === 0 ? (
                  <p className="text-white/60 text-center py-8">Nenhum administrador cadastrado</p>
                ) : (
                  <div className="space-y-2">
                    {adminUsers.map((admin: AdminUser) => (
                      <div
                        key={admin.id}
                        className="flex items-center justify-between bg-white/5 p-4 rounded-lg border border-white/10"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{admin.username}</p>
                            {admin.is_master === 1 && (
                              <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-300 text-xs">
                                Master
                              </span>
                            )}
                          </div>
                          <p className="text-white/60 text-sm">
                            Permissões: {admin.permissions === 'all' ? 'Todas' : admin.permissions.split(',').join(', ')}
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            Cadastrado em: {formatDateTime(admin.created_at)}
                          </p>
                        </div>
                        {admin.is_master !== 1 && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                // Start with default permissions to ensure all sections exist
                                let granularPerms = JSON.parse(JSON.stringify(DEFAULT_GRANULAR_PERMISSIONS));
                                
                                if (admin.granular_permissions) {
                                  try {
                                    const parsedPerms = JSON.parse(admin.granular_permissions);
                                    // Merge parsed permissions with defaults to ensure all sections exist
                                    Object.keys(parsedPerms).forEach(section => {
                                      if (granularPerms[section as keyof GranularPermissions]) {
                                        granularPerms[section as keyof GranularPermissions] = {
                                          ...granularPerms[section as keyof GranularPermissions],
                                          ...parsedPerms[section]
                                        };
                                      }
                                    });
                                  } catch (e) {
                                    console.error('Error parsing granular permissions:', e);
                                  }
                                }
                                
                                setShowEditAdmin(admin.id);
                                setEditAdmin({
                                  username: admin.username,
                                  password: '',
                                  permissions: admin.permissions === 'all' ? ['all'] : admin.permissions.split(','),
                                  granular_permissions: granularPerms,
                                  master_password: '',
                                });
                              }}
                              className="p-2 md:p-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button
                              onClick={() => deleteAdmin(admin.id)}
                              className="p-2 md:p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Edit Admin Modal */}
                {showEditAdmin && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-white/20 my-8">
                      <h3 className="text-xl font-bold text-white mb-4">Editar Administrador</h3>
                      <form onSubmit={(e) => updateAdmin(e, showEditAdmin)} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-2">
                            Nome de Usuário
                          </label>
                          <input
                            type="text"
                            value={editAdmin.username}
                            onChange={(e) => setEditAdmin({ ...editAdmin, username: e.target.value })}
                            minLength={3}
                            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-2">
                            Nova Senha (deixe em branco para não alterar)
                          </label>
                          <input
                            type="password"
                            value={editAdmin.password}
                            onChange={(e) => setEditAdmin({ ...editAdmin, password: e.target.value })}
                            minLength={4}
                            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                          />
                        </div>

                        <PermissionEditor
                          permissions={editAdmin.granular_permissions}
                          onChange={(perms) => setEditAdmin({ ...editAdmin, granular_permissions: perms })}
                        />

                        {currentAdmin?.is_master !== 1 && (
                          <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                              Senha Master (01530153)
                            </label>
                            <input
                              type="password"
                              value={editAdmin.master_password}
                              onChange={(e) => setEditAdmin({ ...editAdmin, master_password: e.target.value })}
                              required
                              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                            />
                          </div>
                        )}

                        {adminError && (
                          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                            <p className="text-red-200 text-sm">{adminError}</p>
                          </div>
                        )}

                        {adminSuccess && (
                          <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
                            <p className="text-green-200 text-sm">{adminSuccess}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex items-center justify-center gap-2 flex-1 py-2 px-4 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-all"
                          >
                            <Save className="w-4 h-4" />
                            Salvar Alterações
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowEditAdmin(null);
                              setAdminError('');
                              setAdminSuccess('');
                            }}
                            className="flex items-center justify-center gap-2 py-2 px-4 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-all"
                          >
                            <X className="w-4 h-4" />
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cadastrados' && hasPermission('cadastrados') && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-white">Usuários Cadastrados</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={exportUsersCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
                <button
                  onClick={() => setShowUserSortDropdown(!showUserSortDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  {showUserSortDropdown ? 'Fechar' : 'Ordenar'}
                </button>
                <button
                  onClick={() => setShowUserFilter(!showUserFilter)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
                >
                  <Filter className="w-4 h-4" />
                  Filtrar
                </button>
                {selectedUsers.length > 0 && (
                  <button
                    onClick={() => setConfirmDialog({
                      show: true,
                      userIds: selectedUsers,
                      userName: `${selectedUsers.length} usuário(s)`,
                      type: 'users-bulk',
                      actionType: 'delete'
                    })}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Selecionados ({selectedUsers.length})
                  </button>
                )}
              </div>
            </div>

            {showUserSortDropdown && (
              <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-white font-medium mb-3">Ordenar Por</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <button
                    onClick={() => setUserSortBy('first_name')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      userSortBy === 'first_name' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Nome
                  </button>
                  <button
                    onClick={() => setUserSortBy('last_name')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      userSortBy === 'last_name' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Sobrenome
                  </button>
                  <button
                    onClick={() => setUserSortBy('whatsapp')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      userSortBy === 'whatsapp' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Número de WhatsApp
                  </button>
                  <button
                    onClick={() => setUserSortBy('confirmations')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      userSortBy === 'confirmations' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Confirmações
                  </button>
                  <button
                    onClick={() => setUserSortBy('cancellations')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      userSortBy === 'cancellations' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Cancelamentos
                  </button>
                </div>
              </div>
            )}

            {showUserFilter && (
              <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Nome"
                    value={userFilter.first_name}
                    onChange={(e) => setUserFilter({ ...userFilter, first_name: e.target.value })}
                    className="px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                  />
                  <input
                    type="text"
                    placeholder="Sobrenome"
                    value={userFilter.last_name}
                    onChange={(e) => setUserFilter({ ...userFilter, last_name: e.target.value })}
                    className="px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                  />
                  <input
                    type="text"
                    placeholder="WhatsApp"
                    value={userFilter.whatsapp}
                    onChange={(e) => setUserFilter({ ...userFilter, whatsapp: e.target.value })}
                    className="px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={loadAllUsers}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                  >
                    <Filter className="w-4 h-4" />
                    Aplicar Filtros
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Tem certeza que deseja apagar todos os usuários filtrados?')) {
                        deleteFilteredUsers();
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Filtrados
                  </button>
                  <button
                    onClick={() => {
                      setUserFilter({ first_name: '', last_name: '', whatsapp: '' });
                      setShowUserFilter(false);
                      loadAllUsers();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Limpar Filtros
                  </button>
                </div>
              </div>
            )}

            <div className="mb-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === allUsers.length && allUsers.length > 0}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = selectedUsers.length > 0 && selectedUsers.length < allUsers.length;
                      }
                    }}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(allUsers.map(u => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="w-4 h-4"
                  />
                  {selectedUsers.length === 0 
                    ? 'Selecionar Todos'
                    : selectedUsers.length === allUsers.length
                    ? 'Desmarcar Todos'
                    : `Selecionados: ${selectedUsers.length}/${allUsers.length}`}
                </label>
                <p className="text-white/70">Total: {allUsers.length} usuário(s)</p>
              </div>
            </div>

            {allUsers.length === 0 ? (
              <p className="text-white/60 text-center py-8">Nenhum usuário encontrado</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {[...allUsers].sort((a, b) => {
                  switch (userSortBy) {
                    case 'first_name':
                      return a.first_name.localeCompare(b.first_name);
                    case 'last_name':
                      return a.last_name.localeCompare(b.last_name);
                    case 'whatsapp':
                      return a.whatsapp.localeCompare(b.whatsapp);
                    case 'confirmations':
                      return ((b as any).total_confirmations || 0) - ((a as any).total_confirmations || 0);
                    case 'cancellations':
                      return ((b as any).total_cancellations || 0) - ((a as any).total_cancellations || 0);
                    default:
                      return 0;
                  }
                }).map((user: User) => {
                  const isExpanded = expandedUsers.includes(user.id);
                  const hasParticipations = ((user as any).total_confirmations || 0) + ((user as any).total_cancellations || 0) > 0;
                  
                  return (
                  <div
                    key={user.id}
                    className="bg-white/5 rounded-lg hover:bg-white/10 transition-all overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-white/60 text-sm">
                            WhatsApp: {user.whatsapp}
                          </p>
                          <p className="text-white/40 text-xs">
                            Cadastrado em: {formatDateTime(user.created_at)}
                          </p>
                          <p className="text-white/40 text-xs">
                            Confirmações: {(user as any).total_confirmations || 0} | Cancelamentos: {(user as any).total_cancellations || 0}
                          </p>
                          {user.is_blocked === 1 && (
                            <p className="text-red-300 text-xs">
                              Bloqueado até: {user.blocked_until ? formatDateTime(user.blocked_until) : 'N/A'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {hasParticipations && (
                          <button
                            onClick={async () => {
                              if (isExpanded) {
                                setExpandedUsers(expandedUsers.filter(id => id !== user.id));
                              } else {
                                // Load participation details
                                const response = await fetch(`/api/admin/user-participations/${user.id}`);
                                const data = await response.json();
                                setUserParticipations({
                                  ...userParticipations,
                                  [user.id]: data,
                                });
                                setExpandedUsers([...expandedUsers, user.id]);
                              }
                            }}
                            className="p-2 md:p-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
                            title={isExpanded ? "Ocultar detalhes" : "Ver giras confirmadas e canceladas"}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 md:w-5 md:h-5" /> : <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setEditUserData({
                              first_name: user.first_name,
                              last_name: user.last_name,
                              whatsapp: user.whatsapp,
                            });
                            setEditUserError('');
                          }}
                          className="p-2 md:p-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button
                          onClick={() => setConfirmDialog({
                            show: true,
                            userId: user.id,
                            userName: `${user.first_name} ${user.last_name}`,
                            type: 'user',
                            actionType: 'delete'
                          })}
                          className="p-2 md:p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {isExpanded && userParticipations[user.id] && (
                      <div className="p-4 bg-black/20 border-t border-white/10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Confirmed Events */}
                          <div>
                            <h4 className="text-green-400 font-semibold text-sm mb-2 flex items-center gap-2">
                              <Check className="w-4 h-4" />
                              Giras Confirmadas ({userParticipations[user.id].confirmed.length})
                            </h4>
                            {userParticipations[user.id].confirmed.length > 0 ? (
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {userParticipations[user.id].confirmed.map((event: any) => (
                                  <div key={event.week_start_date} className="bg-green-500/10 p-2 rounded border border-green-500/30">
                                    <p className="text-white text-xs font-medium">
                                      {event.gira_text || 'Evento'}
                                    </p>
                                    <p className="text-white/60 text-xs">
                                      {new Date(event.week_start_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-white/50 text-xs">Nenhuma confirmação</p>
                            )}
                          </div>
                          
                          {/* Cancelled Events */}
                          <div>
                            <h4 className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-2">
                              <X className="w-4 h-4" />
                              Giras Canceladas ({userParticipations[user.id].cancelled.length})
                            </h4>
                            {userParticipations[user.id].cancelled.length > 0 ? (
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {userParticipations[user.id].cancelled.map((event: any) => (
                                  <div key={event.week_start_date} className="bg-red-500/10 p-2 rounded border border-red-500/30">
                                    <p className="text-white text-xs font-medium">
                                      {event.gira_text || 'Evento'}
                                    </p>
                                    <p className="text-white/60 text-xs">
                                      {new Date(event.week_start_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-white/50 text-xs">Nenhum cancelamento</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'eventos' && hasPermission('settings') && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-white">Todos os Eventos</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const newShowPastEvents = !showPastEvents;
                    setShowPastEvents(newShowPastEvents);
                    // Quando mostrar eventos passados, ordena decrescente (mais recentes primeiro)
                    // Quando ocultar, ordena crescente (mais próximos primeiro)
                    setHistorySort({ 
                      field: 'event_date', 
                      order: newShowPastEvents ? 'desc' : 'asc' 
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-all"
                >
                  <Clock className="w-4 h-4" />
                  {showPastEvents ? 'Ocultar Passados' : 'Eventos Passados'}
                </button>
                <button
                  onClick={() => {
                    if (!showRecessForm) {
                      setShowRecessForm(true);
                      loadCurrentRecess();
                    } else {
                      setShowRecessForm(false);
                    }
                    setShowEventCalendar(false);
                    setEditingEvent(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all ${
                    showRecessForm 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : recessData.is_active 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  {showRecessForm ? 'Fechar' : recessData.is_active ? 'Recesso Ativo' : 'Recesso desativado'}
                </button>
                <button
                  onClick={() => {
                    if (!showEventCalendar) {
                      setShowEventCalendar(true);
                      setShowRecessForm(false);
                    } else {
                      setShowEventCalendar(false);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
                >
                  {showEventCalendar ? 'Fechar' : 'Novo Evento'}
                </button>
              </div>
            </div>

            {showEventCalendar && !editingEvent && (
              <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Data do Novo Evento
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="flex-1 px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                  />
                  <button
                    onClick={() => {
                      if (newEventDate) {
                        // Open the full edit form for the new event
                        setEditingEvent(newEventDate);
                        setEditEventData({
                          gira_prefix: '',
                          gira_text: '',
                          header_text: 'Lista de presença',
                          event_time: '19:30',
                          registration_opens_at: `${newEventDate}T08:00`,
                          registration_closes_at: `${newEventDate}T18:00`,
                          max_capacity: 30,
                          keepCurrentLogo: true,
                          logo_url: settings?.logo_url || '',
                          logo_size: settings?.logo_size || 256,
                          theme_mode: 'auto',
                          theme_color_1: '#3b82f6',
                          theme_color_2: '#1e40af',
                          whatsapp_confirmed_message: '',
                          whatsapp_waitlist_message: '',
                          whatsapp_waitlist_secondary_message: '',
                          whatsapp_contact_number: '',
                        });
                      }
                    }}
                    disabled={!newEventDate}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continuar
                  </button>
                  <button
                    onClick={() => {
                      setShowEventCalendar(false);
                      setNewEventDate('');
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {showRecessForm && (
              <div className="bg-orange-500/10 backdrop-blur-md rounded-xl p-6 border border-orange-500/30 mb-6">
                <div className="max-w-2xl">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white">Configurar Recesso</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recessData.is_active}
                          onChange={(e) => setRecessData({ ...recessData, is_active: e.target.checked })}
                          className="w-5 h-5"
                        />
                        <div>
                          <span className="text-white font-semibold text-lg">Ativar Recesso</span>
                          <p className="text-white/70 text-sm">
                            {recessData.is_active 
                              ? 'O recesso será exibido imediatamente para os usuários'
                              : 'Marque para ativar o recesso'}
                          </p>
                        </div>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          De:
                        </label>
                        <input
                          type="date"
                          value={recessData.start_date}
                          onChange={(e) => setRecessData({ ...recessData, start_date: e.target.value })}
                          className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          Até:
                        </label>
                        <input
                          type="date"
                          value={recessData.end_date}
                          onChange={(e) => setRecessData({ ...recessData, end_date: e.target.value })}
                          className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Imagem do Recesso
                      </label>
                      
                      <div className="mb-4">
                        <label className="flex items-center gap-2 text-white/90 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={recessData.keepCurrentImage}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Keep current image - set it from settings
                                setRecessData({ 
                                  ...recessData, 
                                  keepCurrentImage: true,
                                  image_url: settings?.logo_url || ''
                                });
                              } else {
                                // Custom image - clear the URL so user can upload
                                setRecessData({ 
                                  ...recessData, 
                                  keepCurrentImage: false,
                                  image_url: ''
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Manter imagem corrente (do evento ativo)</span>
                        </label>
                        <p className="text-white/50 text-xs mt-1 ml-6">
                          {recessData.keepCurrentImage 
                            ? 'A imagem do evento ativo será usada para o recesso'
                            : 'Desmarque para fazer upload de uma nova imagem'}
                        </p>
                      </div>
                      
                      {recessData.image_url && (
                        <div className="mb-4 flex flex-col items-center">
                          <img 
                            src={recessData.image_url} 
                            alt="Imagem do recesso" 
                            style={{ 
                              width: `${recessData.image_size || 256}px`, 
                              height: `${recessData.image_size || 256}px` 
                            }}
                            className="object-contain bg-white/10 rounded-full p-2 border-2 border-white/30"
                          />
                          <p className="text-white/70 text-sm mt-2">
                            Prévia: {recessData.image_size || 256}px x {recessData.image_size || 256}px
                          </p>
                        </div>
                      )}
                      
                      {recessData.keepCurrentImage === false && (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              const formData = new FormData();
                              formData.append('logo', file);
                              
                              try {
                                const response = await fetch('/api/admin/upload-logo', {
                                  method: 'POST',
                                  body: formData,
                                });
                                
                                const data = await response.json();
                                
                                if (data.success && data.logo_url) {
                                  setRecessData({ ...recessData, image_url: data.logo_url, keepCurrentImage: false });
                                  alert('✅ Imagem carregada com sucesso!');
                                } else {
                                  alert('❌ ' + (data.error || 'Erro ao fazer upload da imagem'));
                                }
                              } catch (error) {
                                alert('❌ Erro ao fazer upload da imagem');
                              }
                            }}
                            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 file:cursor-pointer"
                          />
                          <p className="text-white/50 text-xs mt-1">
                            Esta imagem será exibida durante o período de recesso
                          </p>
                        </>
                      )}
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          Tamanho da Imagem: {recessData.image_size || 256}px
                        </label>
                        <input
                          type="range"
                          min="128"
                          max="512"
                          step="16"
                          value={recessData.image_size || 256}
                          onChange={(e) => setRecessData({ ...recessData, image_size: parseInt(e.target.value) })}
                          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-white/50 text-xs mt-1">
                          <span>128px (Pequeno)</span>
                          <span>512px (Grande)</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Mensagem Personalizada
                      </label>
                      <textarea
                        value={recessData.message}
                        onChange={(e) => setRecessData({ ...recessData, message: e.target.value })}
                        placeholder="Digite a mensagem que será exibida durante o recesso"
                        rows={3}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 resize-vertical"
                      />
                      <p className="text-white/50 text-xs mt-1">
                        Esta mensagem será exibida abaixo das datas do recesso na tela do usuário
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Cores do Tema
                      </label>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-white/70 mb-2">
                              Cor Principal
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={recessData.theme_color_1}
                                onChange={(e) => setRecessData({ ...recessData, theme_color_1: e.target.value })}
                                className="w-20 h-12 rounded-lg cursor-pointer border-2 border-white/30"
                              />
                              <input
                                type="text"
                                value={recessData.theme_color_1}
                                onChange={(e) => setRecessData({ ...recessData, theme_color_1: e.target.value })}
                                placeholder="#3b82f6"
                                className="flex-1 px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm text-white/70 mb-2">
                              Cor Secundária
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={recessData.theme_color_2}
                                onChange={(e) => setRecessData({ ...recessData, theme_color_2: e.target.value })}
                                className="w-20 h-12 rounded-lg cursor-pointer border-2 border-white/30"
                              />
                              <input
                                type="text"
                                value={recessData.theme_color_2}
                                onChange={(e) => setRecessData({ ...recessData, theme_color_2: e.target.value })}
                                placeholder="#1e40af"
                                className="flex-1 px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 rounded-lg" style={{
                          background: `linear-gradient(135deg, ${recessData.theme_color_1} 0%, ${recessData.theme_color_2} 100%)`
                        }}>
                          <p className="text-white text-center font-semibold">Prévia do Gradiente</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={saveRecess}
                        className="flex items-center justify-center gap-2 flex-1 py-2 px-4 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-all"
                      >
                        <Save className="w-4 h-4" />
                        Salvar Recesso
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('❌ Tem certeza que deseja cancelar? As alterações não serão salvas.')) {
                            setShowRecessForm(false);
                            setRecessData({
                              start_date: '',
                              end_date: '',
                              image_url: '',
                              image_size: 256,
                              message: 'Voltaremos em breve. Agradecemos a compreensão! 🙏',
                              keepCurrentImage: false,
                              theme_color_1: '#3b82f6',
                              theme_color_2: '#1e40af',
                              is_active: false,
                            });
                            alert('❌ Alterações canceladas');
                          }
                        }}
                        className="flex items-center justify-center gap-2 py-2 px-4 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-all"
                      >
                        <X className="w-4 h-4" />
                        Cancelar
                      </button>
                      <button
                        onClick={() => setShowRecessForm(false)}
                        className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-all"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            

            {/* Edit Event Form */}
            {editingEvent && editEventData && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-6">
                <div className="max-w-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">
                    {events.find((e: any) => e.event_date === editingEvent) 
                      ? `Editar Evento - ${new Date(editingEvent + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
                      : `Novo Evento - ${new Date(editingEvent + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
                    }
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Texto do cabeçalho
                      </label>
                      <input
                        type="text"
                        value={editEventData.header_text}
                        onChange={(e) => setEditEventData({ ...editEventData, header_text: e.target.value })}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Tipo de evento (Ex: Gira, E.M):
                      </label>
                      <input
                        type="text"
                        value={editEventData.gira_prefix || ''}
                        onChange={(e) => setEditEventData({ ...editEventData, gira_prefix: e.target.value })}
                        placeholder="Ex: Gira, E.M"
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                      />
                      <p className="text-white/50 text-xs mt-1">
                        Este texto aparecerá antes do nome da gira na página inicial
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Evento:
                      </label>
                      <input
                        type="text"
                        value={editEventData.gira_text}
                        onChange={(e) => setEditEventData({ ...editEventData, gira_text: capitalizeWords(e.target.value) })}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Hora da Gira
                      </label>
                      <input
                        type="time"
                        value={editEventData.event_time}
                        onChange={(e) => setEditEventData({ ...editEventData, event_time: e.target.value })}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Data e Hora de Abertura da Lista
                      </label>
                      <input
                        type="datetime-local"
                        value={editEventData.registration_opens_at}
                        onChange={(e) => setEditEventData({ ...editEventData, registration_opens_at: e.target.value })}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Data e Hora de Fechamento da Lista
                      </label>
                      <input
                        type="datetime-local"
                        value={editEventData.registration_closes_at}
                        onChange={(e) => setEditEventData({ ...editEventData, registration_closes_at: e.target.value })}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Capacidade Máxima
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editEventData.max_capacity}
                        onChange={(e) => setEditEventData({ ...editEventData, max_capacity: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Logo da Página Inicial
                      </label>
                      
                      <div className="mb-4">
                        <label className="flex items-center gap-2 text-white/90 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editEventData.keepCurrentLogo || false}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Keep current logo from settings
                                setEditEventData({ 
                                  ...editEventData, 
                                  keepCurrentLogo: true,
                                  logo_url: settings?.logo_url || '',
                                  logo_size: settings?.logo_size || 256
                                });
                              } else {
                                // Allow changing logo
                                setEditEventData({ 
                                  ...editEventData, 
                                  keepCurrentLogo: false
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Manter logo atual do evento corrente</span>
                        </label>
                        <p className="text-white/50 text-xs mt-1 ml-6">
                          {editEventData.keepCurrentLogo 
                            ? 'O logo do evento ativo será mantido para este evento'
                            : 'Desmarque para fazer upload de um novo logo'}
                        </p>
                      </div>
                      
                      {editEventData.logo_url && (
                        <div className="mb-4 flex flex-col items-center">
                          <img 
                            src={editEventData.logo_url} 
                            alt="Logo atual" 
                            style={{ 
                              width: `${editEventData.logo_size || 256}px`, 
                              height: `${editEventData.logo_size || 256}px` 
                            }}
                            className="object-contain bg-white/10 rounded-lg p-2 border-2 border-white/30"
                          />
                          <p className="text-white/70 text-sm mt-2">
                            Prévia: {editEventData.logo_size || 256}px x {editEventData.logo_size || 256}px
                          </p>
                        </div>
                      )}
                      
                      {!editEventData.keepCurrentLogo && (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              const logoUrl = await handleLogoUpload(file);
                              if (logoUrl) {
                                alert('✅ Logo carregado! As alterações também foram aplicadas nas Configurações. Clique em "Salvar Alterações" para aplicar ao evento.');
                              }
                            }}
                            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 file:cursor-pointer"
                          />
                          <p className="text-white/50 text-xs mt-1">
                            Formatos aceitos: PNG, JPG, GIF. Tamanho recomendado: 500x500px
                          </p>
                        </>
                      )}
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          Tamanho do Logo: {editEventData.logo_size || 256}px
                        </label>
                        <input
                          type="range"
                          min="128"
                          max="512"
                          step="16"
                          value={editEventData.logo_size || 256}
                          onChange={(e) => setEditEventData({ ...editEventData, logo_size: parseInt(e.target.value) })}
                          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-white/50 text-xs mt-1">
                          <span>128px (Pequeno)</span>
                          <span>512px (Grande)</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Cores do Tema
                      </label>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-white/70 mb-2">
                            Modo de Cores
                          </label>
                          <select
                            value={editEventData.theme_mode || 'auto'}
                            onChange={(e) => setEditEventData({ ...editEventData, theme_mode: e.target.value })}
                            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                          >
                            <option value="auto">Automático (baseado nas tags da gira)</option>
                            <option value="manual">Manual (escolher cores)</option>
                          </select>
                          <p className="text-white/50 text-xs mt-1">
                            Modo automático detecta cores baseado no texto da gira (ex: Caboclos = Verde, Preto Velho = Preto e Branco)
                          </p>
                        </div>
                        
                        {editEventData.theme_mode === 'manual' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-white/70 mb-2">
                                Cor Principal
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={editEventData.theme_color_1 || '#3b82f6'}
                                  onChange={(e) => setEditEventData({ ...editEventData, theme_color_1: e.target.value })}
                                  className="w-20 h-12 rounded-lg cursor-pointer border-2 border-white/30"
                                />
                                <input
                                  type="text"
                                  value={editEventData.theme_color_1 || '#3b82f6'}
                                  onChange={(e) => setEditEventData({ ...editEventData, theme_color_1: e.target.value })}
                                  placeholder="#3b82f6"
                                  className="flex-1 px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm text-white/70 mb-2">
                                Cor Secundária (opcional)
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={editEventData.theme_color_2 || '#1e40af'}
                                  onChange={(e) => setEditEventData({ ...editEventData, theme_color_2: e.target.value })}
                                  className="w-20 h-12 rounded-lg cursor-pointer border-2 border-white/30"
                                />
                                <input
                                  type="text"
                                  value={editEventData.theme_color_2 || '#1e40af'}
                                  onChange={(e) => setEditEventData({ ...editEventData, theme_color_2: e.target.value })}
                                  placeholder="#1e40af"
                                  className="flex-1 px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {editEventData.theme_mode === 'manual' && editEventData.theme_color_1 && (
                          <div className="p-4 rounded-lg" style={{
                            background: editEventData.theme_color_2 
                              ? `linear-gradient(135deg, ${editEventData.theme_color_1} 0%, ${editEventData.theme_color_2} 100%)`
                              : editEventData.theme_color_1
                          }}>
                            <p className="text-white text-center font-semibold">Prévia do Gradiente</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-white font-semibold mb-1">Sincronizar Mensagens WhatsApp</h4>
                          <p className="text-white/70 text-xs">
                            Copiar as mensagens pré definidas do menu "Mensagens Pré Definidas" para este evento
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (!editingEvent) return;
                            
                            // Get default messages from the "Mensagens Pré Definidas" menu
                            const response = await fetch('/api/admin/default-messages');
                            const data = await response.json();
                            
                            if (!data.confirmed && !data.waitlist && !data.waitlist_secondary) {
                              showAlert('❌ Nenhuma mensagem pré definida encontrada. Configure-as no menu "Mensagens Pré Definidas"');
                              return;
                            }
                            
                            // Update current form with default messages
                            setEditEventData({
                              ...editEventData,
                              whatsapp_confirmed_message: data.confirmed || '',
                              whatsapp_waitlist_message: data.waitlist || '',
                              whatsapp_waitlist_secondary_message: data.waitlist_secondary || '',
                            });
                            
                            showAlert('✅ Mensagens sincronizadas! Clique em "Salvar Alterações" para aplicar.');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Sincronizar Agora
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Mensagem WhatsApp - Lista de Presença
                      </label>
                      <textarea
                        value={editEventData.whatsapp_confirmed_message || ''}
                        onChange={(e) => setEditEventData({ ...editEventData, whatsapp_confirmed_message: e.target.value })}
                        placeholder="Digite ou cole a mensagem que será enviada para pessoas confirmadas na lista de presença"
                        rows={6}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 resize-vertical"
                      />
                      <p className="text-white/50 text-xs mt-1">
                        Esta mensagem será enviada ao clicar no botão de WhatsApp para pessoas confirmadas
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Mensagem WhatsApp - Lista de Espera
                      </label>
                      <textarea
                        value={editEventData.whatsapp_waitlist_message || ''}
                        onChange={(e) => setEditEventData({ ...editEventData, whatsapp_waitlist_message: e.target.value })}
                        placeholder="Digite ou cole a mensagem que será enviada para pessoas na lista de espera prioritária"
                        rows={6}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 resize-vertical"
                      />
                      <p className="text-white/50 text-xs mt-1">
                        Esta mensagem será enviada ao clicar no botão de WhatsApp para pessoas na lista de espera
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Mensagem WhatsApp - Lista de Espera Secundária
                      </label>
                      <textarea
                        value={editEventData.whatsapp_waitlist_secondary_message || ''}
                        onChange={(e) => setEditEventData({ ...editEventData, whatsapp_waitlist_secondary_message: e.target.value })}
                        placeholder="Digite ou cole a mensagem que será enviada para pessoas na lista de espera secundária"
                        rows={6}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 resize-vertical"
                      />
                      <p className="text-white/50 text-xs mt-1">
                        Esta mensagem será enviada ao clicar no botão de WhatsApp para pessoas na lista de espera secundária
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Número de WhatsApp para Cancelamentos
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={(editEventData as any).whatsapp_contact_number || '5519997972276'}
                        onChange={(e) => setEditEventData({ ...editEventData, whatsapp_contact_number: e.target.value } as any)}
                        placeholder="5519997972276"
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                      />
                      <p className="text-white/50 text-xs mt-1">
                        Este número receberá uma mensagem automática quando alguém cancelar sua presença no evento
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await createOrUpdateEvent(editingEvent, editEventData);
                          // If this was a new event, activate it
                          if (!events.find((e: any) => e.event_date === editingEvent)) {
                            await switchToEvent(editingEvent);
                          }
                          setNewEventDate('');
                          setShowEventCalendar(false);
                        }}
                        className="flex items-center justify-center gap-2 flex-1 py-2 px-4 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-all"
                      >
                        <Save className="w-4 h-4" />
                        {events.find((e: any) => e.event_date === editingEvent) ? 'Salvar Alterações' : 'Criar Evento'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingEvent(null);
                          setEditEventData(null);
                          setNewEventDate('');
                          setShowEventCalendar(false);
                        }}
                        className="flex items-center justify-center gap-2 py-2 px-4 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-all"
                      >
                        <X className="w-4 h-4" />
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          setEditingEvent(null);
                          setEditEventData(null);
                          setShowEventCalendar(false);
                        }}
                        className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-all"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {events.length === 0 ? (
              <p className="text-white/60 text-center py-8">Nenhum evento cadastrado</p>
            ) : (
              <div className="space-y-2">
                <p className="text-white/70 text-sm mb-2">
                  {(() => {
                    // Get current date in Brasilia timezone
                    const now = new Date();
                    const brasiliaOffset = -3 * 60;
                    const brasiliaTime = new Date(now.getTime() + (brasiliaOffset * 60 * 1000));
                    const todayBrasilia = brasiliaTime.toISOString().split('T')[0];
                    
                    // Count active, future, and past events
                    const activeCount = events.filter((e: any) => e.is_active === 1).length;
                    const futureCount = events.filter((e: any) => e.is_active !== 1 && e.event_date >= todayBrasilia).length;
                    const pastCount = events.filter((e: any) => e.is_active !== 1 && e.event_date < todayBrasilia).length;
                    
                    // Build the message
                    let message = 'Total de Eventos: ';
                    const parts = [];
                    
                    if (activeCount > 0) {
                      parts.push(`${activeCount} Ativo${activeCount > 1 ? 's' : ''}`);
                    }
                    
                    if (futureCount > 0) {
                      parts.push(`${futureCount} Evento${futureCount > 1 ? 's' : ''} futuro${futureCount > 1 ? 's' : ''}`);
                    }
                    
                    if (parts.length > 0) {
                      message += parts.join(', ');
                    }
                    
                    // Add past events info if not showing them
                    if (!showPastEvents && pastCount > 0) {
                      message += parts.length > 0 ? ' ' : '';
                      message += `(Eventos passados ocultos)`;
                    }
                    
                    // If no active or future events, just show the past events message
                    if (parts.length === 0 && !showPastEvents && pastCount > 0) {
                      message = 'Total de Eventos: (Eventos passados ocultos)';
                    }
                    
                    return message;
                  })()}
                </p>
                {events
                  .filter((event: any) => {
                    // Filter out past events if showPastEvents is false
                    if (showPastEvents) return true;
                    
                    // Get current date in Brasilia timezone
                    const now = new Date();
                    const brasiliaOffset = -3 * 60; // -3 hours in minutes
                    const brasiliaTime = new Date(now.getTime() + (brasiliaOffset * 60 * 1000));
                    const todayBrasilia = brasiliaTime.toISOString().split('T')[0];
                    
                    // Show active events and future events only
                    return event.is_active === 1 || event.event_date >= todayBrasilia;
                  })
                  .sort((a: any, b: any) => {
                    // Get current date in Brasilia timezone for comparison
                    const now = new Date();
                    const brasiliaOffset = -3 * 60;
                    const brasiliaTime = new Date(now.getTime() + (brasiliaOffset * 60 * 1000));
                    const todayBrasilia = brasiliaTime.toISOString().split('T')[0];
                    
                    const aIsPast = a.event_date < todayBrasilia && a.is_active !== 1;
                    const bIsPast = b.event_date < todayBrasilia && b.is_active !== 1;
                    
                    // If both are past events, sort newest to oldest (descending)
                    if (aIsPast && bIsPast) {
                      return b.event_date.localeCompare(a.event_date);
                    }
                    
                    // If both are future/active events, sort oldest to newest (ascending)
                    if (!aIsPast && !bIsPast) {
                      // Active events come first
                      if (a.is_active === 1 && b.is_active !== 1) return -1;
                      if (a.is_active !== 1 && b.is_active === 1) return 1;
                      // Then by date ascending
                      return a.event_date.localeCompare(b.event_date);
                    }
                    
                    // Past events come after future/active events
                    return aIsPast ? 1 : -1;
                  })
                  .map((event: any) => {
                    // Check if event is in the past
                    const now = new Date();
                    const brasiliaOffset = -3 * 60;
                    const brasiliaTime = new Date(now.getTime() + (brasiliaOffset * 60 * 1000));
                    const todayBrasilia = brasiliaTime.toISOString().split('T')[0];
                    const isPastEvent = event.event_date < todayBrasilia;
                    
                    return (
                      <div
                        key={event.event_date}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          event.is_active === 1
                            ? 'bg-blue-500/20 border-blue-500/50'
                            : isPastEvent
                            ? 'bg-gray-500/10 border-gray-500/30'
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            {isPastEvent && <span className="ml-2 text-gray-400 text-xs">(Passado)</span>}
                          </p>
                          <p className="text-white/60 text-sm">
                            {event.gira_text} - {event.event_time}
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            Capacidade: {event.max_capacity} | Abertura: {new Date(event.registration_opens_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                          </p>
                          {event.is_active === 1 && (
                            <span className="inline-block mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                              Evento Ativo
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col md:flex-row gap-2 flex-shrink-0">
                          {isPastEvent && (
                            <button
                              onClick={() => loadEventDetails(event.event_date)}
                              className="flex flex-col items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md hover:shadow-lg"
                            >
                              <Users className="w-5 h-5" />
                              <span className="text-xs font-medium">Lista</span>
                            </button>
                          )}
                          {!isPastEvent && (
                            <button
                              onClick={() => switchToEvent(event.event_date, event.is_active === 1)}
                              className={`px-2 py-1.5 md:px-3 md:py-2 text-white text-xs md:text-sm rounded-lg transition-all whitespace-nowrap ${
                                event.is_active === 1 
                                  ? 'bg-red-500 hover:bg-red-600' 
                                  : 'bg-blue-500 hover:bg-blue-600'
                              }`}
                            >
                              {event.is_active === 1 ? 'Desativar' : 'Ativar'}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              // For all events, show edit form with all settings
                              // Load logo from event if it exists, otherwise from global settings
                              const eventLogo = event.logo_url || settings?.logo_url || '';
                              const eventLogoSize = event.logo_size || settings?.logo_size || 256;
                              
                              setEditingEvent(event.event_date);
                              setEditEventData({
                                gira_prefix: event.gira_prefix || '',
                                gira_text: event.gira_text,
                                header_text: event.header_text,
                                event_time: event.event_time,
                                registration_opens_at: event.registration_opens_at,
                                registration_closes_at: event.registration_closes_at,
                                max_capacity: event.max_capacity,
                                keepCurrentLogo: !event.logo_url, // Only keep current if event doesn't have its own logo
                                logo_url: eventLogo,
                                logo_size: eventLogoSize,
                                theme_mode: event.theme_mode || 'auto',
                                theme_color_1: event.theme_color_1 || '#3b82f6',
                                theme_color_2: event.theme_color_2 || '#1e40af',
                                whatsapp_confirmed_message: event.whatsapp_confirmed_message || settings?.whatsapp_confirmed_message || '',
                                whatsapp_waitlist_message: event.whatsapp_waitlist_message || settings?.whatsapp_waitlist_message || '',
                                whatsapp_waitlist_secondary_message: event.whatsapp_waitlist_secondary_message || settings?.whatsapp_waitlist_secondary_message || '',
                                whatsapp_contact_number: event.whatsapp_contact_number || '',
                              });
                            }}
                            className="px-2 py-1.5 md:px-3 md:py-2 bg-purple-500 text-white text-xs md:text-sm rounded-lg hover:bg-purple-600 transition-all whitespace-nowrap"
                          >
                            Editar
                          </button>
                          {!isPastEvent && (
                            <button
                              onClick={async () => {
                                const response = await fetch(`/api/admin/event-observations/${event.event_date}`);
                                if (response.ok) {
                                  const data = await response.json();
                                  setEventObservations(data.observations || '');
                                  setShowObservationsModal(event.event_date);
                                }
                              }}
                              className="px-2 py-1.5 md:px-3 md:py-2 bg-yellow-500 text-white text-xs md:text-sm rounded-lg hover:bg-yellow-600 transition-all whitespace-nowrap"
                            >
                              Observações
                            </button>
                          )}
                          <button
                            onClick={() => deleteEvent(event.event_date)}
                            className="px-2 py-1.5 md:px-3 md:py-2 bg-red-500 text-white text-xs md:text-sm rounded-lg hover:bg-red-600 transition-all whitespace-nowrap"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && hasPermission('settings') && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-white">Analytics</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={exportAnalytics}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
                <div className="flex gap-2 flex-wrap">
                <select
                  value={analyticsFilter.periodType === 'custom' ? 'custom' : analyticsFilter.days}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'custom') {
                      setAnalyticsFilter({ ...analyticsFilter, periodType: 'custom' });
                    } else {
                      const days = parseInt(value);
                      setAnalyticsFilter({ ...analyticsFilter, periodType: 'days', days });
                      loadAnalytics(days);
                    }
                  }}
                  className="px-4 py-2 bg-white border border-white/30 rounded-xl text-black"
                >
                  <option value="1">1 dia</option>
                  <option value="7">1 semana</option>
                  <option value="30">1 mês</option>
                  <option value="365">1 ano</option>
                  <option value="custom">Período desejado</option>
                </select>
                {selectedAnalyticsItems.length > 0 && (
                  <button
                    onClick={async () => {
                      if (window.confirm(`Tem certeza que deseja apagar ${selectedAnalyticsItems.length} evento(s) selecionado(s)?`)) {
                        const response = await fetch('/api/admin/analytics/delete', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ids: selectedAnalyticsItems }),
                        });
                        if (response.ok) {
                          setSelectedAnalyticsItems([]);
                          if (analyticsFilter.periodType === 'custom' && analyticsFilter.dateFrom && analyticsFilter.dateTo) {
                            loadAnalytics(undefined, analyticsFilter.dateFrom, analyticsFilter.dateTo);
                          } else {
                            loadAnalytics(analyticsFilter.days);
                          }
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Selecionados ({selectedAnalyticsItems.length})
                  </button>
                )}
              </div>
              </div>
            </div>

            {analyticsFilter.periodType === 'custom' && (
              <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-white font-medium mb-4">Selecionar Período</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Data Inicial
                    </label>
                    <input
                      type="date"
                      value={analyticsFilter.dateFrom}
                      onChange={(e) => setAnalyticsFilter({ ...analyticsFilter, dateFrom: e.target.value })}
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Data Final
                    </label>
                    <input
                      type="date"
                      value={analyticsFilter.dateTo}
                      onChange={(e) => setAnalyticsFilter({ ...analyticsFilter, dateTo: e.target.value })}
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      if (analyticsFilter.dateFrom && analyticsFilter.dateTo) {
                        if (analyticsFilter.dateFrom > analyticsFilter.dateTo) {
                          showAlert('❌ A data inicial deve ser anterior ou igual à data final');
                          return;
                        }
                        loadAnalytics(undefined, analyticsFilter.dateFrom, analyticsFilter.dateTo);
                      }
                    }}
                    disabled={!analyticsFilter.dateFrom || !analyticsFilter.dateTo}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    Aplicar Período
                  </button>
                  <button
                    onClick={() => {
                      setAnalyticsFilter({ ...analyticsFilter, periodType: 'days', dateFrom: '', dateTo: '' });
                      loadAnalytics(analyticsFilter.days);
                    }}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {analytics && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6">
                    <p className="text-green-200 text-sm mb-1">Acessos à página</p>
                    <p className="text-3xl font-bold text-white">{analytics.page_views}</p>
                  </div>
                  <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-6">
                    <p className="text-blue-200 text-sm mb-1">Cliques em "Inscrever-se"</p>
                    <p className="text-3xl font-bold text-white">{analytics.register_clicks}</p>
                  </div>
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6">
                    <p className="text-red-200 text-sm mb-1">Iniciaram e abandonaram a inscrição</p>
                    <p className="text-3xl font-bold text-white">{analytics.form_abandons}</p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                  <h3 className="text-white font-medium mb-3">Resumo</h3>
                  <div className="space-y-2 text-white/80 text-sm">
                    <div className="flex justify-between">
                      <span>Taxa de conversão (iniciaram → completaram):</span>
                      <span className="font-semibold text-white">
                        {analytics.form_starts > 0 
                          ? `${Math.round(((analytics.form_starts - analytics.form_abandons) / analytics.form_starts) * 100)}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa de abandono:</span>
                      <span className="font-semibold text-white">
                        {analytics.form_starts > 0 
                          ? `${Math.round((analytics.form_abandons / analytics.form_starts) * 100)}%`
                          : '0%'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Buttons for deleting analytics data */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium">Apagar Dados de Analytics</h3>
                    <button
                      onClick={() => setShowAnalyticsFilter(!showAnalyticsFilter)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-sm"
                    >
                      <Filter className="w-4 h-4" />
                      {showAnalyticsFilter ? 'Fechar Filtro' : 'Filtrar Exclusão'}
                    </button>
                  </div>

                  {showAnalyticsFilter && (
                    <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
                      <h4 className="text-white text-sm font-medium mb-3">Selecione os tipos de eventos para apagar:</h4>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <label className="flex items-center gap-2 text-white/90 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={analyticsDeleteFilter.event_types.includes('page_view')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAnalyticsDeleteFilter({
                                  ...analyticsDeleteFilter,
                                  event_types: [...analyticsDeleteFilter.event_types, 'page_view']
                                });
                              } else {
                                setAnalyticsDeleteFilter({
                                  ...analyticsDeleteFilter,
                                  event_types: analyticsDeleteFilter.event_types.filter(t => t !== 'page_view')
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          Acessos à página
                        </label>
                        <label className="flex items-center gap-2 text-white/90 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={analyticsDeleteFilter.event_types.includes('register_click')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAnalyticsDeleteFilter({
                                  ...analyticsDeleteFilter,
                                  event_types: [...analyticsDeleteFilter.event_types, 'register_click']
                                });
                              } else {
                                setAnalyticsDeleteFilter({
                                  ...analyticsDeleteFilter,
                                  event_types: analyticsDeleteFilter.event_types.filter(t => t !== 'register_click')
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          Cliques em "Inscrever-se"
                        </label>
                        <label className="flex items-center gap-2 text-white/90 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={analyticsDeleteFilter.event_types.includes('form_start')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAnalyticsDeleteFilter({
                                  ...analyticsDeleteFilter,
                                  event_types: [...analyticsDeleteFilter.event_types, 'form_start']
                                });
                              } else {
                                setAnalyticsDeleteFilter({
                                  ...analyticsDeleteFilter,
                                  event_types: analyticsDeleteFilter.event_types.filter(t => t !== 'form_start')
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          Iniciaram preenchimento
                        </label>
                        <label className="flex items-center gap-2 text-white/90 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={analyticsDeleteFilter.event_types.includes('form_abandon')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAnalyticsDeleteFilter({
                                  ...analyticsDeleteFilter,
                                  event_types: [...analyticsDeleteFilter.event_types, 'form_abandon']
                                });
                              } else {
                                setAnalyticsDeleteFilter({
                                  ...analyticsDeleteFilter,
                                  event_types: analyticsDeleteFilter.event_types.filter(t => t !== 'form_abandon')
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          Abandonaram inscrição
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-2">
                            Data Inicial
                          </label>
                          <input
                            type="date"
                            value={analyticsDeleteFilter.dateFrom}
                            onChange={(e) => setAnalyticsDeleteFilter({ ...analyticsDeleteFilter, dateFrom: e.target.value })}
                            className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-2">
                            Data Final
                          </label>
                          <input
                            type="date"
                            value={analyticsDeleteFilter.dateTo}
                            onChange={(e) => setAnalyticsDeleteFilter({ ...analyticsDeleteFilter, dateTo: e.target.value })}
                            className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const hasFilters = analyticsDeleteFilter.event_types.length > 0 || 
                                             (analyticsDeleteFilter.dateFrom && analyticsDeleteFilter.dateTo);
                            
                            if (!hasFilters) {
                              showAlert('Selecione pelo menos um tipo de evento ou um período para apagar');
                              return;
                            }

                            // Validate date range
                            if (analyticsDeleteFilter.dateFrom && analyticsDeleteFilter.dateTo) {
                              if (analyticsDeleteFilter.dateFrom > analyticsDeleteFilter.dateTo) {
                                showAlert('❌ A data inicial deve ser anterior ou igual à data final');
                                return;
                              }
                            }

                            let confirmMsg = 'Tem certeza que deseja apagar ';
                            if (analyticsDeleteFilter.event_types.length > 0) {
                              confirmMsg += `eventos do tipo: ${analyticsDeleteFilter.event_types.join(', ')}`;
                            }
                            if (analyticsDeleteFilter.dateFrom && analyticsDeleteFilter.dateTo) {
                              if (analyticsDeleteFilter.event_types.length > 0) confirmMsg += ' ';
                              confirmMsg += `entre ${new Date(analyticsDeleteFilter.dateFrom).toLocaleDateString('pt-BR')} e ${new Date(analyticsDeleteFilter.dateTo).toLocaleDateString('pt-BR')}`;
                            }
                            confirmMsg += '?';

                            if (window.confirm(confirmMsg)) {
                              const response = await fetch('/api/admin/analytics/delete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  event_types: analyticsDeleteFilter.event_types.length > 0 ? analyticsDeleteFilter.event_types : undefined,
                                  date_from: analyticsDeleteFilter.dateFrom || undefined,
                                  date_to: analyticsDeleteFilter.dateTo || undefined,
                                }),
                              });
                              if (response.ok) {
                                setAnalyticsDeleteFilter({ event_types: [], dateFrom: '', dateTo: '' });
                                if (analyticsFilter.periodType === 'custom' && analyticsFilter.dateFrom && analyticsFilter.dateTo) {
                                  loadAnalytics(undefined, analyticsFilter.dateFrom, analyticsFilter.dateTo);
                                } else {
                                  loadAnalytics(analyticsFilter.days);
                                }
                              }
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          Apagar Selecionados
                        </button>
                        <button
                          onClick={() => {
                            setAnalyticsDeleteFilter({ event_types: [], dateFrom: '', dateTo: '' });
                            setShowAnalyticsFilter(false);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                        >
                          <X className="w-4 h-4" />
                          Limpar Filtro
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {analyticsFilter.periodType === 'custom' && analyticsFilter.dateFrom && analyticsFilter.dateTo && (
                      <button
                        onClick={async () => {
                          if (window.confirm(`Tem certeza que deseja apagar todos os dados de analytics entre ${new Date(analyticsFilter.dateFrom).toLocaleDateString('pt-BR')} e ${new Date(analyticsFilter.dateTo).toLocaleDateString('pt-BR')}?`)) {
                            const response = await fetch('/api/admin/analytics/delete', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                date_from: analyticsFilter.dateFrom, 
                                date_to: analyticsFilter.dateTo 
                              }),
                            });
                            if (response.ok) {
                              loadAnalytics(undefined, analyticsFilter.dateFrom, analyticsFilter.dateTo);
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        Apagar dados do período selecionado
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (window.confirm('Tem certeza que deseja apagar TODOS os dados de analytics? Esta ação não pode ser desfeita!')) {
                          if (window.confirm('Esta é sua última chance! Confirma que deseja apagar TODOS os dados de analytics?')) {
                            const response = await fetch('/api/admin/analytics/delete', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ delete_all: true }),
                            });
                            if (response.ok) {
                              if (analyticsFilter.periodType === 'custom' && analyticsFilter.dateFrom && analyticsFilter.dateTo) {
                                loadAnalytics(undefined, analyticsFilter.dateFrom, analyticsFilter.dateTo);
                              } else {
                                loadAnalytics(analyticsFilter.days);
                              }
                            }
                          }
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Apagar TODOS os dados de analytics
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'history' && hasPermission('history') && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
                <h2 className="text-2xl font-bold text-white">Histórico de Participações</h2>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={exportHistoryCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    {selectedHistoryItems.length > 0 && !historyFilter.showEventHistory
                      ? `Exportar Selecionados (${selectedHistoryItems.length})`
                      : 'Exportar CSV'
                    }
                  </button>
                  <button
                    onClick={() => setShowHistorySort(!showHistorySort)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    {showHistorySort ? 'Fechar' : 'Ordenar'}
                  </button>
                  <button
                    onClick={() => setShowHistoryFilter(!showHistoryFilter)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
                  >
                    <Filter className="w-4 h-4" />
                    {showHistoryFilter ? 'Fechar Filtros' : 'Filtrar'}
                  </button>
                  {selectedHistoryItems.length > 0 && !historyFilter.showEventHistory && (
                    <button
                      onClick={async () => {
                        if (window.confirm(`Tem certeza que deseja apagar ${selectedHistoryItems.length} pessoa(s) do histórico?`)) {
                          const response = await fetch('/api/admin/delete-history', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              user_ids: selectedHistoryItems 
                            }),
                          });
                          if (response.ok) {
                            loadHistory();
                          }
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir Selecionados ({selectedHistoryItems.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Toggle between People and Events */}
              <div className="bg-white/10 border border-white/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      checked={!historyFilter.showEventHistory}
                      onChange={async () => {
                        const newFilter = { ...historyFilter, showEventHistory: false };
                        setHistoryFilter(newFilter);
                        // Reload with new filter
                        const params = new URLSearchParams();
                        if (newFilter.first_name) params.append('first_name', newFilter.first_name);
                        if (newFilter.last_name) params.append('last_name', newFilter.last_name);
                        if (newFilter.whatsapp) params.append('whatsapp', newFilter.whatsapp);
                        if (newFilter.userRegistrationFrom) params.append('user_registration_from', newFilter.userRegistrationFrom);
                        if (newFilter.userRegistrationTo) params.append('user_registration_to', newFilter.userRegistrationTo);
                        
                        const response = await fetch(`/api/admin/history?${params.toString()}`);
                        const data = await response.json();
                        setHistory(data);
                        setSelectedHistoryItems([]);
                      }}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-400" />
                      <span className="text-white font-medium text-lg group-hover:text-blue-300 transition-colors">
                        Histórico de Pessoas
                      </span>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      checked={historyFilter.showEventHistory}
                      onChange={async () => {
                        const newFilter = { ...historyFilter, showEventHistory: true };
                        setHistoryFilter(newFilter);
                        // Reload with event history flag
                        const params = new URLSearchParams();
                        params.append('show_event_history', 'true');
                        
                        const response = await fetch(`/api/admin/history?${params.toString()}`);
                        const data = await response.json();
                        setHistory(data);
                        setSelectedHistoryItems([]);
                      }}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-green-400" />
                      <span className="text-white font-medium text-lg group-hover:text-green-300 transition-colors">
                        Histórico de Eventos
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {historyFilter.showEventHistory && (
                <div className="bg-white/10 border border-white/20 rounded-lg p-4 mb-4">
                  <button
                    onClick={async () => {
                      const newFilter = { ...historyFilter, showPastEvents: !historyFilter.showPastEvents };
                      setHistoryFilter(newFilter);
                      // Reload with new filter
                      const params = new URLSearchParams();
                      params.append('show_event_history', 'true');
                      if (newFilter.showPastEvents) params.append('show_past_events', 'true');
                      
                      const response = await fetch(`/api/admin/history?${params.toString()}`);
                      const data = await response.json();
                      setHistory(data);
                      setSelectedHistoryItems([]);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 rounded-lg transition-colors text-white font-medium"
                  >
                    <Clock className="w-5 h-5" />
                    {historyFilter.showPastEvents ? 'Ocultar Eventos Passados' : 'Mostrar Todos os Eventos (Incluindo Passados)'}
                  </button>
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-200 text-sm">
                  ℹ️ {historyFilter.showEventHistory 
                    ? (historyFilter.showPastEvents 
                        ? 'Exibindo todos os eventos (passados, ativos e futuros) cadastrados no sistema, incluindo os que foram apagados.'
                        : 'Exibindo apenas eventos ativos e futuros. Clique no botão acima para ver eventos passados.')
                    : 'Exibindo todas as pessoas cadastradas e suas participações em eventos. Use os filtros para refinar a busca.'}
                </p>
              </div>
            </div>

            {showHistorySort && (
              <div className="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
                <h3 className="text-white font-medium mb-3">Ordenar Por</h3>
                
                {!historyFilter.showEventHistory ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                      onClick={() => setHistorySort({ field: 'name', order: historySort.field === 'name' && historySort.order === 'asc' ? 'desc' : 'asc' })}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        historySort.field === 'name' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      Nome
                      {historySort.field === 'name' && (
                        historySort.order === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setHistorySort({ field: 'whatsapp', order: historySort.field === 'whatsapp' && historySort.order === 'asc' ? 'desc' : 'asc' })}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        historySort.field === 'whatsapp' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      WhatsApp
                      {historySort.field === 'whatsapp' && (
                        historySort.order === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setHistorySort({ field: 'created_at', order: historySort.field === 'created_at' && historySort.order === 'asc' ? 'desc' : 'asc' })}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        historySort.field === 'created_at' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      Data Cadastro
                      {historySort.field === 'created_at' && (
                        historySort.order === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setHistorySort({ field: 'participations', order: historySort.field === 'participations' && historySort.order === 'asc' ? 'desc' : 'asc' })}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        historySort.field === 'participations' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      Participações
                      {historySort.field === 'participations' && (
                        historySort.order === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <button
                      onClick={() => setHistorySort({ field: 'event_date', order: historySort.field === 'event_date' && historySort.order === 'asc' ? 'desc' : 'asc' })}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        historySort.field === 'event_date' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      Data do Evento
                      {historySort.field === 'event_date' && (
                        historySort.order === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setHistorySort({ field: 'registrations', order: historySort.field === 'registrations' && historySort.order === 'asc' ? 'desc' : 'asc' })}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        historySort.field === 'registrations' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      Inscrições
                      {historySort.field === 'registrations' && (
                        historySort.order === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setHistorySort({ field: 'created_at', order: historySort.field === 'created_at' && historySort.order === 'asc' ? 'desc' : 'asc' })}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        historySort.field === 'created_at' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      Data de Criação
                      {historySort.field === 'created_at' && (
                        historySort.order === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {showHistoryFilter && !historyFilter.showEventHistory && (
              <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-white font-medium mb-3">Filtros de Busca de Pessoas</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Nome"
                    value={historyFilter.first_name}
                    onChange={(e) => setHistoryFilter({ ...historyFilter, first_name: e.target.value })}
                    className="px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                  />
                  <input
                    type="text"
                    placeholder="Sobrenome"
                    value={historyFilter.last_name}
                    onChange={(e) => setHistoryFilter({ ...historyFilter, last_name: e.target.value })}
                    className="px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                  />
                  <input
                    type="text"
                    placeholder="WhatsApp"
                    value={historyFilter.whatsapp}
                    onChange={(e) => setHistoryFilter({ ...historyFilter, whatsapp: e.target.value })}
                    className="px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                  />
                </div>
                
                <div className="mb-4">
                  <h4 className="text-white/80 text-sm font-medium mb-2">Data de Cadastro no Sistema</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/70 mb-1">De</label>
                      <input
                        type="date"
                        value={historyFilter.userRegistrationFrom}
                        onChange={(e) => setHistoryFilter({ ...historyFilter, userRegistrationFrom: e.target.value })}
                        className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/70 mb-1">Até</label>
                      <input
                        type="date"
                        value={historyFilter.userRegistrationTo}
                        onChange={(e) => setHistoryFilter({ ...historyFilter, userRegistrationTo: e.target.value })}
                        className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Validate user registration date range
                      if (historyFilter.userRegistrationFrom && historyFilter.userRegistrationTo) {
                        if (historyFilter.userRegistrationFrom > historyFilter.userRegistrationTo) {
                          showAlert('❌ A data inicial de cadastro deve ser anterior ou igual à data final');
                          return;
                        }
                      }
                      loadHistory();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    Aplicar Filtros
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm('Tem certeza que deseja apagar todos os dados filtrados do histórico?')) {
                        const response = await fetch('/api/admin/delete-history', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            filter: {
                              first_name: historyFilter.first_name || undefined,
                              last_name: historyFilter.last_name || undefined,
                              whatsapp: historyFilter.whatsapp || undefined,
                            }
                          }),
                        });
                        if (response.ok) {
                          setHistoryFilter({ first_name: '', last_name: '', whatsapp: '', days: 30, periodType: 'days', dateFrom: '', dateTo: '', userRegistrationFrom: '', userRegistrationTo: '', showEventHistory: false, showPastEvents: false });
                          setShowHistoryFilter(false);
                          loadHistory();
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Filtrados
                  </button>
                  <button
                    onClick={() => {
                      setHistoryFilter({ first_name: '', last_name: '', whatsapp: '', days: 30, periodType: 'days', dateFrom: '', dateTo: '', userRegistrationFrom: '', userRegistrationTo: '', showEventHistory: false, showPastEvents: false });
                      setShowHistoryFilter(false);
                      loadHistory();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Limpar Filtros
                  </button>
                </div>
              </div>
            )}

            {!historyFilter.showEventHistory && (
              <div className="mb-4 flex justify-between items-center">
                <p className="text-white/70">Total: {history.length} pessoa(s)</p>
                {history.length > 0 && (
                  <button
                    onClick={async () => {
                      if (window.confirm('Tem certeza que deseja apagar TODOS os dados do histórico? Esta ação não pode ser desfeita!')) {
                        if (window.confirm('Esta é sua última chance! Confirma que deseja apagar TODOS os dados do histórico?')) {
                          const response = await fetch('/api/admin/delete-history', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ delete_all: true }),
                          });
                          if (response.ok) {
                            loadHistory();
                          }
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Apagar TODO o Histórico
                  </button>
                )}
              </div>
            )}

            {historyFilter.showEventHistory && (
              <div className="mb-4 flex justify-between items-center">
                <p className="text-white/70">
                  Total: {history.length} evento(s) cadastrado(s)
                </p>
                {history.length > 0 && (
                  <button
                    onClick={async () => {
                      if (window.confirm('Tem certeza que deseja apagar TODOS os eventos do histórico? Esta ação não pode ser desfeita!')) {
                        if (window.confirm('Esta é sua última chance! Confirma que deseja apagar TODOS os eventos?')) {
                          const response = await fetch('/api/admin/delete-history', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ delete_all: true }),
                          });
                          if (response.ok) {
                            loadHistory();
                          }
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Apagar TODO o Histórico
                  </button>
                )}
              </div>
            )}

            {history.length === 0 ? (
              <p className="text-white/60 text-center py-8">
                {historyFilter.showEventHistory ? 'Nenhum evento encontrado' : 'Nenhum usuário encontrado'}
              </p>
            ) : historyFilter.showEventHistory ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {[...history].sort((a: any, b: any) => {
                  let compareResult = 0;
                  
                  if (historySort.field === 'event_date') {
                    const dateA = new Date(a.event_date).getTime();
                    const dateB = new Date(b.event_date).getTime();
                    compareResult = dateA - dateB;
                  } else if (historySort.field === 'registrations') {
                    compareResult = (a.total_registrations || 0) - (b.total_registrations || 0);
                  } else if (historySort.field === 'created_at') {
                    const dateA = new Date(a.created_at).getTime();
                    const dateB = new Date(b.created_at).getTime();
                    compareResult = dateA - dateB;
                  }
                  
                  return historySort.order === 'asc' ? compareResult : -compareResult;
                }).map((event: any) => (
                  <div
                    key={event.event_date}
                    className="bg-white/5 rounded-xl border border-white/10 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white font-semibold text-lg">
                          {new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </p>
                        <p className="text-white/70 text-sm">
                          {event.gira_text || 'Evento'}
                        </p>
                        <p className="text-white/40 text-xs mt-1">
                          Criado em: {formatDateTime(event.created_at)}
                        </p>
                        {event.is_active === 1 && (
                          <span className="inline-block mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                            Evento Ativo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => loadEventDetails(event.event_date)}
                          className="flex flex-col items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md hover:shadow-lg"
                        >
                          <Users className="w-5 h-5" />
                          <span className="text-xs font-medium">Lista</span>
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Tem certeza que deseja excluir o evento de ${new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}?`)) {
                              const response = await fetch('/api/admin/delete-event', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ event_date: event.event_date }),
                              });
                              if (response.ok) {
                                loadHistory();
                              }
                            }
                          }}
                          className="p-2 md:p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg"
                          title="Excluir Evento"
                        >
                          <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {[...history].sort((a: any, b: any) => {
                  let compareResult = 0;
                  
                  if (historySort.field === 'name') {
                    const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
                    const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
                    compareResult = nameA.localeCompare(nameB);
                  } else if (historySort.field === 'whatsapp') {
                    compareResult = a.whatsapp.localeCompare(b.whatsapp);
                  } else if (historySort.field === 'created_at') {
                    const dateA = new Date(a.created_at).getTime();
                    const dateB = new Date(b.created_at).getTime();
                    compareResult = dateA - dateB;
                  } else if (historySort.field === 'participations') {
                    compareResult = (a.total_participations || 0) - (b.total_participations || 0);
                  }
                  
                  return historySort.order === 'asc' ? compareResult : -compareResult;
                }).map((user: any) => {
                  const isExpanded = expandedHistoryUsers.includes(user.id);
                  const hasEvents = user.events && user.events.length > 0;
                  
                  return (
                  <div
                    key={user.id}
                    className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-4 bg-white/5">
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedHistoryItems.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedHistoryItems([...selectedHistoryItems, user.id]);
                            } else {
                              setSelectedHistoryItems(selectedHistoryItems.filter(id => id !== user.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="text-white font-semibold text-lg">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-white/60 text-sm">
                            WhatsApp: {user.whatsapp}
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            Cadastrado em: {formatDateTime(user.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-bold text-2xl">{user.total_participations}</p>
                          <p className="text-white/60 text-xs">participações</p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={async () => {
                            // Load all events and user's current participations
                            const eventsResponse = await fetch('/api/admin/events');
                            const allEvents = await eventsResponse.json();
                            
                            // Get user's event participations
                            const userEventsResponse = await fetch(`/api/admin/user-events/${user.id}`);
                            const userEventsData = await userEventsResponse.json();
                            
                            setEditHistoryUserData({
                              user_id: user.id,
                              name: `${user.first_name} ${user.last_name}`,
                              events: allEvents
                                .sort((a: any, b: any) => b.event_date.localeCompare(a.event_date))
                                .map((e: any) => {
                                  const participation = userEventsData.find((ue: any) => ue.week_start_date === e.event_date);
                                  return {
                                    event_date: e.event_date,
                                    gira_text: e.gira_text || 'Evento',
                                    status: participation ? participation.status : 'none',
                                  };
                                }),
                            });
                            setEditingHistoryUser(user.id);
                          }}
                          className="p-2 md:p-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all shadow-md hover:shadow-lg"
                          title="Editar participações em eventos"
                        >
                          <Edit className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        {hasEvents && (
                          <button
                            onClick={() => {
                              if (isExpanded) {
                                setExpandedHistoryUsers(expandedHistoryUsers.filter(id => id !== user.id));
                              } else {
                                setExpandedHistoryUsers([...expandedHistoryUsers, user.id]);
                              }
                            }}
                            className="p-2 md:p-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
                            title={isExpanded ? "Ocultar eventos" : "Ver eventos participados"}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 md:w-5 md:h-5" /> : <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />}
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (window.confirm(`Tem certeza que deseja apagar o histórico completo de ${user.first_name} ${user.last_name}?`)) {
                              const response = await fetch('/api/admin/delete-history', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ user_ids: [user.id] }),
                              });
                              if (response.ok) {
                                loadHistory();
                              }
                            }
                          }}
                          className="p-2 md:p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg"
                          title="Excluir histórico desta pessoa"
                        >
                          <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {hasEvents && isExpanded && (
                      <div className="p-4 bg-black/20 border-t border-white/10">
                        <h4 className="text-white/80 font-medium text-sm mb-2">Eventos Participados:</h4>
                        <div className="space-y-1">
                          {user.events.map((event: any) => (
                            <div key={event.id} className="flex justify-between items-center text-sm p-2 bg-white/5 rounded">
                              <span className="text-white/70">
                                {event.event_name || 'Evento'} - {new Date(event.week_start_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mensagens' && hasPermission('settings') && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Mensagens Pré Definidas</h2>
            
            <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-white/20 max-w-2xl">
              <p className="text-white/70 mb-6">
                Estas mensagens serão usadas como padrão ao sincronizar mensagens em eventos
              </p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Mensagem WhatsApp - Lista de Presença
                  </label>
                  <textarea
                    value={defaultMessages.confirmed}
                    onChange={(e) => setDefaultMessages({ ...defaultMessages, confirmed: e.target.value })}
                    placeholder="Digite ou cole a mensagem que será enviada para pessoas confirmadas na lista de presença"
                    rows={6}
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white placeholder-white/50 resize-vertical"
                  />
                  <p className="text-white/50 text-xs mt-1">
                    Esta mensagem será enviada ao clicar no botão de WhatsApp para pessoas confirmadas
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Mensagem WhatsApp - Lista de Espera
                  </label>
                  <textarea
                    value={defaultMessages.waitlist}
                    onChange={(e) => setDefaultMessages({ ...defaultMessages, waitlist: e.target.value })}
                    placeholder="Digite ou cole a mensagem que será enviada para pessoas na lista de espera prioritária"
                    rows={6}
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white placeholder-white/50 resize-vertical"
                  />
                  <p className="text-white/50 text-xs mt-1">
                    Esta mensagem será enviada ao clicar no botão de WhatsApp para pessoas na lista de espera
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Mensagem WhatsApp - Lista de Espera Secundária
                  </label>
                  <textarea
                    value={defaultMessages.waitlist_secondary}
                    onChange={(e) => setDefaultMessages({ ...defaultMessages, waitlist_secondary: e.target.value })}
                    placeholder="Digite ou cole a mensagem que será enviada para pessoas na lista de espera secundária"
                    rows={6}
                    className="w-full px-4 py-3 bg-black/60 border border-white/30 rounded-xl text-white placeholder-white/50 resize-vertical"
                  />
                  <p className="text-white/50 text-xs mt-1">
                    Esta mensagem será enviada ao clicar no botão de WhatsApp para pessoas na lista de espera secundária
                  </p>
                </div>

                {messagesError && (
                  <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                    <p className="text-red-200 text-sm">{messagesError}</p>
                  </div>
                )}

                {messagesSuccess && (
                  <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
                    <p className="text-green-200 text-sm">{messagesSuccess}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={saveDefaultMessages}
                    className="flex items-center justify-center gap-2 flex-1 py-2 px-4 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Configurações
                  </button>
                  <button
                    onClick={async () => {
                      await loadDefaultMessages();
                      setMessagesError('❌ Nenhuma alteração foi feita');
                      setMessagesSuccess('');
                    }}
                    className="flex items-center justify-center gap-2 py-2 px-4 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pade' && hasPermission('settings') && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-white">Padê</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setShowPadeHistory(!showPadeHistory);
                    if (!showPadeHistory) {
                      loadPadeEvents();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                >
                  <Clock className="w-4 h-4" />
                  {showPadeHistory ? 'Fechar' : 'Padês Passados'}
                </button>
                <button
                  onClick={async () => {
                    // Load all PADÊ events
                    const response = await fetch('/api/admin/pade-events');
                    const allPadeEvents = await response.json();
                    
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
                    
                    // Filter to show only today's or future events
                    const upcomingPadeEvents = allPadeEvents.filter((e: any) => e.event_date >= todayBrasilia);
                    
                    if (upcomingPadeEvents.length === 0) {
                      showAlert('❌ Nenhum evento ativo ou futuro do PADÊ cadastrado');
                      return;
                    }
                    
                    // Build the general report message
                    let message = `📋 *RELATÓRIO GERAL DO PADÊ*\n\n`;
                    message += `Total de eventos ativos/futuros: ${upcomingPadeEvents.length}\n\n`;
                    
                    // Sort events by date (oldest first)
                    const sortedEvents = [...upcomingPadeEvents].sort((a: any, b: any) => 
                      a.event_date.localeCompare(b.event_date)
                    );
                    
                    // Add each event to the message
                    for (const event of sortedEvents) {
                      // Fetch participants for this event
                      const eventResponse = await fetch(`/api/admin/pade-event/${event.id}`);
                      const eventData = await eventResponse.json();
                      
                      message += `📅 *${new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}*\n`;
                      message += `*Evento:* ${event.event_name}\n`;
                      message += `*Tipo:* ${event.event_type}\n`;
                      
                      if (eventData.participants && eventData.participants.length > 0) {
                        message += `*Responsável:*\n`;
                        eventData.participants.forEach((p: any, index: number) => {
                          message += `${index + 1}. ${p.participant_name}\n`;
                        });
                      } else {
                        message += `*Responsável:* Nenhum cadastrado\n`;
                      }
                      
                      message += `\n`;
                    }
                    
                    // Open WhatsApp with the message
                    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                    showAlert('✅ Relatório gerado! Selecione o destinatário no WhatsApp.');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Relatório Geral
                </button>
                <button
                  onClick={() => {
                    if (showPadeForm) {
                      setPadeFormData({
                        event_name: '',
                        event_type: '',
                        event_date: '',
                        participants: [],
                        whatsapp_number: '',
                      });
                      setEditingPadeEvent(null);
                      setShowPadeForm(false);
                    } else {
                      setShowPadeForm(true);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  {showPadeForm ? 'Fechar' : 'Criar Lista'}
                </button>
              </div>
            </div>

            {/* PADÊ Form */}
            {showPadeForm && (
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  {editingPadeEvent ? 'Editar Lista' : 'Criar Nova Lista'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Nome do Evento
                    </label>
                    <input
                      type="text"
                      value={padeFormData.event_name}
                      onChange={(e) => setPadeFormData({ ...padeFormData, event_name: e.target.value })}
                      placeholder="Ex: Padê de Abertura"
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Tipo de Evento
                    </label>
                    <select
                      value={padeFormData.event_type}
                      onChange={(e) => setPadeFormData({ ...padeFormData, event_type: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Selecione...</option>
                      <option value="Gira">Gira</option>
                      <option value="E.M">E.M</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Data do Evento
                    </label>
                    <input
                      type="date"
                      value={padeFormData.event_date}
                      onChange={(e) => setPadeFormData({ ...padeFormData, event_date: e.target.value })}
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Participantes
                    </label>
                    <div className="space-y-2 mb-3">
                      <div className="flex gap-2">
                        <select
                          value={selectedPadePerson}
                          onChange={(e) => {
                            const personName = e.target.value;
                            setSelectedPadePerson(personName);
                            
                            // Find the person and auto-fill their WhatsApp number
                            const person = padePeople.find((p: any) => p.name === personName);
                            if (person && person.whatsapp) {
                              setPadeFormData({ ...padeFormData, whatsapp_number: person.whatsapp });
                            }
                          }}
                          className="flex-1 px-4 py-2 bg-slate-800 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="">Selecione uma pessoa...</option>
                          {padePeople.map((person: any) => (
                            <option key={person.id} value={person.name}>
                              {person.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (selectedPadePerson) {
                              if (!padeFormData.participants.includes(selectedPadePerson)) {
                                setPadeFormData({
                                  ...padeFormData,
                                  participants: [...padeFormData.participants, selectedPadePerson]
                                });
                              }
                              setSelectedPadePerson('');
                            }
                          }}
                          disabled={!selectedPadePerson}
                          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Adicionar
                        </button>
                        <button
                          onClick={() => setShowPadePeopleManager(!showPadePeopleManager)}
                          className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all flex items-center justify-center gap-2"
                          title="Gerenciar lista de pessoas"
                        >
                          <Users className="w-4 h-4" />
                          <span className="text-sm">Gerenciar Lista</span>
                        </button>
                      </div>
                    </div>

                    {/* People Manager Modal */}
                    {showPadePeopleManager && (
                      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-slate-800 rounded-2xl p-4 md:p-6 max-w-md w-full border border-white/20 my-8">
                          <h3 className="text-lg md:text-xl font-bold text-white mb-4">Gerenciar Lista de Pessoas do PADÊ</h3>
                          
                          {/* Add new person */}
                          <div className="mb-4">
                            <label className="block text-xs md:text-sm font-medium text-white/90 mb-2">
                              Adicionar Nova Pessoa
                            </label>
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={newPadePersonName}
                                onChange={(e) => setNewPadePersonName(e.target.value)}
                                placeholder="Nome da pessoa"
                                className="w-full px-3 py-2 md:px-4 md:py-2 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 text-sm md:text-base"
                              />
                              <input
                                type="tel"
                                inputMode="numeric"
                                value={newPadePersonWhatsApp}
                                onChange={(e) => setNewPadePersonWhatsApp(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addPadePerson();
                                  }
                                }}
                                placeholder="WhatsApp (opcional): 5519999999999"
                                className="w-full px-3 py-2 md:px-4 md:py-2 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 text-sm md:text-base"
                              />
                              <button
                                onClick={addPadePerson}
                                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all text-sm md:text-base"
                              >
                                Adicionar Pessoa
                              </button>
                            </div>
                          </div>

                          {/* List of people */}
                          <div>
                            <label className="block text-xs md:text-sm font-medium text-white/90 mb-2">
                              Pessoas Cadastradas ({padePeople.length})
                            </label>
                            {padePeople.length > 0 && (
                              <p className="text-white/50 text-xs mb-2">
                                ℹ️ Use as setas para reordenar
                              </p>
                            )}
                            <div className="bg-black/20 rounded-lg p-2 md:p-3 border border-white/10 max-h-64 md:max-h-96 overflow-y-auto">
                              {padePeople.length === 0 ? (
                                <p className="text-white/60 text-center py-4 text-xs md:text-sm">Nenhuma pessoa cadastrada</p>
                              ) : (
                                <div className="space-y-1">
                                  {padePeople.map((person: any, index: number) => (
                                    <div key={person.id} className="flex items-center justify-between p-2 bg-white/5 rounded">
                                      <div className="flex-1 mr-2">
                                        <p className="text-white text-xs md:text-sm break-all">{person.name}</p>
                                        {person.whatsapp && (
                                          <p className="text-white/60 text-xs mt-0.5">{person.whatsapp}</p>
                                        )}
                                      </div>
                                      <div className="flex gap-1 flex-shrink-0">
                                        <button
                                          onClick={() => movePadePersonUp(index)}
                                          disabled={index === 0}
                                          className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                          title="Mover para cima"
                                        >
                                          <ChevronUp className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => movePadePersonDown(index)}
                                          disabled={index === padePeople.length - 1}
                                          className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                          title="Mover para baixo"
                                        >
                                          <ChevronDown className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => deletePadePerson(person.id)}
                                          className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-all"
                                          title="Remover"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => setShowPadePeopleManager(false)}
                            className="w-full mt-4 py-2 px-4 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all text-sm md:text-base"
                          >
                            Fechar
                          </button>
                        </div>
                      </div>
                    )}

                    {padeFormData.participants.length > 0 && (
                      <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                        <p className="text-white/70 text-sm mb-2">
                          Participantes ({padeFormData.participants.length}):
                        </p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {padeFormData.participants.map((name, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                              <span className="text-white text-sm">{index + 1}. {name}</span>
                              <button
                                onClick={() => {
                                  setPadeFormData({
                                    ...padeFormData,
                                    participants: padeFormData.participants.filter((_, i) => i !== index)
                                  });
                                }}
                                className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-all"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Número de WhatsApp para enviar a lista
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={padeFormData.whatsapp_number}
                      onChange={(e) => setPadeFormData({ ...padeFormData, whatsapp_number: e.target.value })}
                      placeholder="5519999999999"
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                    />
                    <p className="text-white/50 text-xs mt-1">
                      Este número será usado para enviar a lista do PADÊ quando clicar no botão WhatsApp
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={savePadeEvent}
                      className="flex items-center justify-center gap-2 flex-1 py-3 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                    >
                      <Save className="w-4 h-4" />
                      {editingPadeEvent ? 'Salvar Alterações' : 'Criar Lista'}
                    </button>
                    <button
                      onClick={() => {
                        setPadeFormData({
                          event_name: '',
                          event_type: '',
                          event_date: '',
                          participants: [],
                          whatsapp_number: '',
                        });
                        setEditingPadeEvent(null);
                        setShowPadeForm(false);
                      }}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            

            {/* PADÊ Events List */}
            {showPadeHistory ? (
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                  <p className="text-blue-200 text-sm">
                    ℹ️ Exibindo apenas os eventos do PADÊ que já aconteceram.
                  </p>
                </div>
                
                {(() => {
                  // Get current date in Brasilia timezone
                  const now = new Date();
                  const brasiliaOffset = -3 * 60;
                  const brasiliaTime = new Date(now.getTime() + (brasiliaOffset * 60 * 1000));
                  const todayBrasilia = brasiliaTime.toISOString().split('T')[0];
                  
                  // Filter to show only past events
                  const pastPadeEvents = padeEvents.filter((e: any) => e.event_date < todayBrasilia);
                  
                  return pastPadeEvents.length === 0 ? (
                    <p className="text-white/60 text-center py-8">Nenhum evento passado encontrado</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-white/70 text-sm">
                        Total: {pastPadeEvents.length} evento(s) passado(s)
                      </p>
                      {pastPadeEvents
                        .sort((a: any, b: any) => {
                          // Sort by date descending (most recent first)
                          const dateA = new Date(a.event_date).getTime();
                          const dateB = new Date(b.event_date).getTime();
                          return dateB - dateA;
                        })
                        .map((event: any) => {
                        
                          return (
                            <div
                              key={event.id}
                              className="rounded-xl border p-4 bg-gray-500/10 border-gray-500/30"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex-1">
                                  <p className="text-white font-bold text-lg">
                                    {event.event_name}
                                    <span className="ml-2 text-gray-400 text-xs">(Passado)</span>
                                  </p>
                                <p className="text-white/70 text-sm">
                                  {event.event_type} - {new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                </p>
                                <p className="text-white/40 text-xs mt-1">
                                  Criado em: {formatDateTime(event.created_at)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    const response = await fetch(`/api/admin/pade-event/${event.id}`);
                                    const data = await response.json();
                                    if (response.ok) {
                                      sendPadeListToWhatsApp(data);
                                    }
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  WhatsApp
                                </button>
                                <button
                                  onClick={async () => {
                                    const response = await fetch(`/api/admin/pade-event/${event.id}`);
                                    const data = await response.json();
                                    if (response.ok) {
                                      setPadeFormData({
                                        event_name: data.event.event_name,
                                        event_type: data.event.event_type,
                                        event_date: data.event.event_date,
                                        participants: data.participants.map((p: any) => p.participant_name),
                                        whatsapp_number: data.event.whatsapp_number || '',
                                      });
                                      setEditingPadeEvent(event.id);
                                      setShowPadeForm(true);
                                      setShowPadeHistory(false);
                                    }
                                  }}
                                  className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deletePadeEvent(event.id)}
                                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Show participants preview */}
                            <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                              <p className="text-white/70 text-sm mb-2 font-medium">
                                Participantes ({event.participant_count || 0}):
                              </p>
                              <p className="text-white/60 text-xs">
                                {event.participant_count > 0 
                                  ? `Clique no WhatsApp para enviar um lembrete à pessoa responsável.` 
                                  : 'Nenhum participante cadastrado'}
                              </p>
                            </div>
                          </div>
                          );
                        })}
                    </div>
                  );
                })()}
              </div>
            ) : (() => {
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
              
              // Filter to show only today's or future events
              const upcomingPadeEvents = padeEvents.filter((e: any) => e.event_date >= todayBrasilia);
              
              return upcomingPadeEvents.length === 0 ? (
                <p className="text-white/60 text-center py-8">Nenhum evento futuro cadastrado</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-white/70 text-sm">
                    Exibindo {upcomingPadeEvents.length} evento(s) ativo(s) ou futuro(s)
                  </p>
                  {upcomingPadeEvents.map((event: any) => (
                  <div
                    key={event.id}
                    className="bg-white/5 rounded-xl border border-white/10 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-white font-bold text-lg">{event.event_name}</p>
                        <p className="text-white/70 text-sm">
                          {event.event_type} - {new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </p>
                        <p className="text-white/40 text-xs mt-1">
                          Criado em: {formatDateTime(event.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const response = await fetch(`/api/admin/pade-event/${event.id}`);
                            const data = await response.json();
                            if (response.ok) {
                              sendPadeListToWhatsApp(data);
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </button>
                        <button
                          onClick={async () => {
                            if (editingPadeEvent === event.id) {
                              // Close if already editing this event
                              setEditingPadeEvent(null);
                              setPadeFormData({
                                event_name: '',
                                event_type: '',
                                event_date: '',
                                participants: [],
                                whatsapp_number: '',
                              });
                            } else {
                              // Load and edit this event
                              const response = await fetch(`/api/admin/pade-event/${event.id}`);
                              const data = await response.json();
                              if (response.ok) {
                                setPadeFormData({
                                  event_name: data.event.event_name,
                                  event_type: data.event.event_type,
                                  event_date: data.event.event_date,
                                  participants: data.participants.map((p: any) => p.participant_name),
                                  whatsapp_number: data.event.whatsapp_number || '',
                                });
                                setEditingPadeEvent(event.id);
                              }
                            }
                          }}
                          className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePadeEvent(event.id)}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Show participants preview or edit form */}
                    {editingPadeEvent === event.id ? (
                      <div className="bg-black/40 rounded-lg p-4 border border-purple-500/30">
                        <h4 className="text-white font-semibold mb-4">Editar Lista</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                              Nome do Evento
                            </label>
                            <input
                              type="text"
                              value={padeFormData.event_name}
                              onChange={(e) => setPadeFormData({ ...padeFormData, event_name: e.target.value })}
                              placeholder="Ex: Padê de Abertura"
                              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                              Tipo de Evento
                            </label>
                            <select
                              value={padeFormData.event_type}
                              onChange={(e) => setPadeFormData({ ...padeFormData, event_type: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-800 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                              <option value="">Selecione...</option>
                              <option value="Gira">Gira</option>
                              <option value="E.M">E.M</option>
                              <option value="Outro">Outro</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                              Data do Evento
                            </label>
                            <input
                              type="date"
                              value={padeFormData.event_date}
                              onChange={(e) => setPadeFormData({ ...padeFormData, event_date: e.target.value })}
                              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                              Participantes
                            </label>
                            <div className="space-y-2 mb-3">
                              <div className="flex gap-2">
                                <select
                                  value={selectedPadePerson}
                                  onChange={(e) => {
                                    const personName = e.target.value;
                                    setSelectedPadePerson(personName);
                                    
                                    const person = padePeople.find((p: any) => p.name === personName);
                                    if (person && person.whatsapp) {
                                      setPadeFormData({ ...padeFormData, whatsapp_number: person.whatsapp });
                                    }
                                  }}
                                  className="flex-1 px-4 py-2 bg-slate-800 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                  <option value="">Selecione uma pessoa...</option>
                                  {padePeople.map((person: any) => (
                                    <option key={person.id} value={person.name}>
                                      {person.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                onClick={() => {
                                  if (selectedPadePerson) {
                                    if (!padeFormData.participants.includes(selectedPadePerson)) {
                                      setPadeFormData({
                                        ...padeFormData,
                                        participants: [...padeFormData.participants, selectedPadePerson]
                                      });
                                    }
                                    setSelectedPadePerson('');
                                  }
                                }}
                                disabled={!selectedPadePerson}
                                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Adicionar
                              </button>
                            </div>

                            {padeFormData.participants.length > 0 && (
                              <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                                <p className="text-white/70 text-sm mb-2">
                                  Participantes ({padeFormData.participants.length}):
                                </p>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {padeFormData.participants.map((name, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                                      <span className="text-white text-sm">{index + 1}. {name}</span>
                                      <button
                                        onClick={() => {
                                          setPadeFormData({
                                            ...padeFormData,
                                            participants: padeFormData.participants.filter((_, i) => i !== index)
                                          });
                                        }}
                                        className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-all"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                              Número de WhatsApp para enviar a lista
                            </label>
                            <input
                              type="tel"
                              inputMode="numeric"
                              value={padeFormData.whatsapp_number}
                              onChange={(e) => setPadeFormData({ ...padeFormData, whatsapp_number: e.target.value })}
                              placeholder="5519999999999"
                              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={savePadeEvent}
                              className="flex items-center justify-center gap-2 flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                            >
                              <Save className="w-4 h-4" />
                              Salvar Alterações
                            </button>
                            <button
                              onClick={() => {
                                setEditingPadeEvent(null);
                                setPadeFormData({
                                  event_name: '',
                                  event_type: '',
                                  event_date: '',
                                  participants: [],
                                  whatsapp_number: '',
                                });
                              }}
                              className="flex items-center justify-center gap-2 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                            >
                              <X className="w-4 h-4" />
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                        <p className="text-white/70 text-sm mb-2 font-medium">
                          Participantes ({event.participant_count || 0}):
                        </p>
                        <p className="text-white/60 text-xs">
                          {event.participant_count > 0 
                            ? `Clique no WhatsApp para enviar um lembrete à pessoa responsável.` 
                            : 'Nenhum participante cadastrado'}
                        </p>
                      </div>
                    )}
                  </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Observations Modal */}
        {showObservationsModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full border border-white/20 my-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  Observações do Evento - {new Date(showObservationsModal + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </h3>
                <button
                  onClick={() => {
                    setShowObservationsModal(null);
                    setEventObservations('');
                  }}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-blue-200 text-sm">
                  ℹ️ Essas observações serão incluídas ao enviar a lista via WhatsApp no menu "Lista".
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={eventObservations}
                    onChange={(e) => setEventObservations(e.target.value)}
                    placeholder="Digite aqui as observações do evento..."
                    rows={8}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 resize-vertical"
                  />
                  <p className="text-white/50 text-xs mt-1">
                    Essas observações aparecerão na mensagem de WhatsApp quando você enviar a lista
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!showObservationsModal) return;
                      
                      const response = await fetch('/api/admin/event-observations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          event_date: showObservationsModal,
                          observations: eventObservations,
                        }),
                      });

                      if (response.ok) {
                        showAlert('✅ Observações salvas com sucesso');
                        setShowObservationsModal(null);
                        setEventObservations('');
                        loadEvents();
                      } else {
                        showAlert('❌ Erro ao salvar observações');
                      }
                    }}
                    className="flex items-center justify-center gap-2 flex-1 py-3 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Observações
                  </button>
                  <button
                    onClick={() => {
                      setShowObservationsModal(null);
                      setEventObservations('');
                    }}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extend Block Modal */}
        {showExtendBlockModal && extendBlockUserId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-white/20 my-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  Estender Bloqueio - {extendBlockUserName}
                </h3>
                <button
                  onClick={() => {
                    setShowExtendBlockModal(false);
                    setExtendBlockUserId(null);
                    setExtendBlockUserName('');
                    setExtendBlockCurrentDate('');
                    setExtendBlockNewDate('');
                    setExtendBlockAdditionalDays('');
                  }}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-blue-200 text-sm">
                  {extendBlockCurrentDate 
                    ? `Bloqueado até: ${formatDateTime(extendBlockCurrentDate)}`
                    : 'Usuário não está bloqueado atualmente'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Nova Data de Desbloqueio
                  </label>
                  <input
                    type="date"
                    value={extendBlockNewDate}
                    onChange={(e) => {
                      setExtendBlockNewDate(e.target.value);
                      setExtendBlockAdditionalDays(''); // Clear additional days when date is set
                    }}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white [color-scheme:dark]"
                  />
                  <p className="text-white/50 text-xs mt-1">
                    Escolha uma data específica para desbloquear
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-white/20"></div>
                  <span className="text-white/60 text-sm">OU</span>
                  <div className="flex-1 border-t border-white/20"></div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Adicionar Dias ao Bloqueio Atual
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={extendBlockAdditionalDays}
                    onChange={(e) => {
                      setExtendBlockAdditionalDays(e.target.value);
                      setExtendBlockNewDate(''); // Clear date when additional days is set
                    }}
                    placeholder="Ex: 7"
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                  />
                  <p className="text-white/50 text-xs mt-1">
                    Quantos dias deseja adicionar ao bloqueio atual?
                  </p>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={async () => {
                      if (!extendBlockNewDate && !extendBlockAdditionalDays) {
                        showAlert('❌ Escolha uma data ou dias adicionais');
                        return;
                      }

                      const response = await fetch('/api/admin/extend-block', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          user_id: extendBlockUserId,
                          new_date: extendBlockNewDate || undefined,
                          additional_days: extendBlockAdditionalDays ? parseInt(extendBlockAdditionalDays) : undefined,
                        }),
                      });

                      const data = await response.json();

                      if (response.ok) {
                        showAlert('✅ ' + data.message);
                        setShowExtendBlockModal(false);
                        setExtendBlockUserId(null);
                        setExtendBlockUserName('');
                        setExtendBlockCurrentDate('');
                        setExtendBlockNewDate('');
                        setExtendBlockAdditionalDays('');
                        await loadBlockedUsers();
                      } else {
                        showAlert('❌ ' + (data.error || 'Erro ao estender bloqueio'));
                      }
                    }}
                    disabled={!extendBlockNewDate && !extendBlockAdditionalDays}
                    className="flex items-center justify-center gap-2 flex-1 py-3 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Clock className="w-4 h-4" />
                    Estender Bloqueio
                  </button>
                  <button
                    onClick={() => {
                      setShowExtendBlockModal(false);
                      setExtendBlockUserId(null);
                      setExtendBlockUserName('');
                      setExtendBlockCurrentDate('');
                      setExtendBlockNewDate('');
                      setExtendBlockAdditionalDays('');
                    }}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  Editar Usuário
                </h3>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setEditUserData({ first_name: '', last_name: '', whatsapp: '' });
                    setEditUserError('');
                  }}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editUserError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                  <p className="text-red-200 text-sm">❌ {editUserError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={editUserData.first_name}
                    onChange={(e) => setEditUserData({ ...editUserData, first_name: e.target.value })}
                    placeholder="Digite o nome"
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Sobrenome
                  </label>
                  <input
                    type="text"
                    value={editUserData.last_name}
                    onChange={(e) => setEditUserData({ ...editUserData, last_name: e.target.value })}
                    placeholder="Digite o sobrenome"
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editUserData.whatsapp}
                    onChange={(e) => setEditUserData({ ...editUserData, whatsapp: e.target.value.replace(/\D/g, '') })}
                    placeholder="11999999999"
                    maxLength={15}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50"
                  />
                  <p className="text-white/50 text-xs mt-1">
                    Digite seu número com DDD (11 dígitos: DDD + 9 dígitos)
                  </p>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={updateUser}
                    className="flex items-center justify-center gap-2 flex-1 py-3 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Salvar
                  </button>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setEditUserData({ first_name: '', last_name: '', whatsapp: '' });
                      setEditUserError('');
                    }}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit User History Modal */}
        {editingHistoryUser && editHistoryUserData && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-4xl w-full border border-white/20 my-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  Editar Participações - {editHistoryUserData.name}
                </h3>
                <button
                  onClick={() => {
                    setEditingHistoryUser(null);
                    setEditHistoryUserData(null);
                  }}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-blue-200 text-sm">
                  ℹ️ Selecione em qual lista a pessoa deve estar para cada evento. Use "Nenhuma" para remover a pessoa do evento.
                </p>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {editHistoryUserData.events.map((event, index) => {
                  const isPastEvent = event.event_date < new Date().toISOString().split('T')[0];
                  
                  return (
                    <div key={event.event_date} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            {isPastEvent && <span className="ml-2 text-gray-400 text-xs">(Passado)</span>}
                          </p>
                          <p className="text-white/60 text-sm">{event.gira_text}</p>
                        </div>
                        <select
                          value={event.status}
                          onChange={(e) => {
                            const newEvents = [...editHistoryUserData.events];
                            newEvents[index].status = e.target.value;
                            setEditHistoryUserData({ ...editHistoryUserData, events: newEvents });
                          }}
                          className="px-4 py-2 bg-slate-700 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="none">Nenhuma</option>
                          <option value="confirmed">Lista de Presença</option>
                          <option value="waitlist">Lista de Espera Prioritária</option>
                          <option value="waitlist_secondary">Lista de Espera Secundária</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={async () => {
                    // Save changes
                    const response = await fetch('/api/admin/update-user-events', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        user_id: editHistoryUserData.user_id,
                        events: editHistoryUserData.events,
                      }),
                    });

                    if (response.ok) {
                      showAlert('✅ Participações atualizadas com sucesso');
                      setEditingHistoryUser(null);
                      setEditHistoryUserData(null);
                      loadHistory();
                    } else {
                      showAlert('❌ Erro ao atualizar participações');
                    }
                  }}
                  className="flex items-center justify-center gap-2 flex-1 py-3 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                >
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </button>
                <button
                  onClick={() => {
                    setEditingHistoryUser(null);
                    setEditHistoryUserData(null);
                  }}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
