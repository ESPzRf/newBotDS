// src/api/client.ts
// API клиент для взаимодействия с Flask бэкендом

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ==========================================
// API методы
// ==========================================

export const api = {
  // Статус бота
  getStatus: () => request<BotStatus>('/status'),

  // Статистика
  getStats: () => request<Stats>('/stats'),

  // Логи
  getLogs: (params?: { limit?: number; type?: string; guild_id?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.type) query.set('type', params.type);
    if (params?.guild_id) query.set('guild_id', String(params.guild_id));
    return request<LogEntry[]>(`/logs?${query}`);
  },

  // Серверы
  getGuilds: () => request<Guild[]>('/guilds'),

  // Настройки сервера
  getSettings: (guildId: number) => request<GuildSettings>(`/settings/${guildId}`),
  updateSettings: (guildId: number, settings: Partial<GuildSettings>) =>
    request<{ success: boolean }>(`/settings/${guildId}`, { method: 'PUT', body: settings }),

  // Модерация
  applyTimeout: (data: TimeoutRequest) =>
    request<ModerationResponse>('/moderation/timeout', { method: 'POST', body: data }),
  applyKick: (data: KickRequest) =>
    request<ModerationResponse>('/moderation/kick', { method: 'POST', body: data }),
  applyBan: (data: BanRequest) =>
    request<ModerationResponse>('/moderation/ban', { method: 'POST', body: data }),

  // Поиск участников
  searchMembers: (guildId: number, query: string) =>
    request<Member[]>(`/guilds/${guildId}/members?q=${encodeURIComponent(query)}`),
};

// ==========================================
// Типы
// ==========================================

export interface BotStatus {
  online: boolean;
  user?: string;
  user_id?: number;
  guilds?: number;
  latency?: number;
  uptime?: string;
  message?: string;
}

export interface Stats {
  totalTimeouts: number;
  totalKicks: number;
  totalBans: number;
  activeTimeouts: number;
  totalMembers: number;
  totalServers: number;
}

export interface LogEntry {
  id: number;
  guild_id: number;
  action_type: string;
  target_id: number;
  target_name: string;
  moderator_id: number;
  moderator_name: string;
  reason: string;
  duration_seconds: number | null;
  created_at: string;
  expires_at: string | null;
}

export interface Guild {
  id: number;
  name: string;
  member_count: number;
  icon: string | null;
}

export interface GuildSettings {
  guild_id: number;
  log_channel_id: number | null;
  mod_role_id: number | null;
  auto_mod_enabled: number;
  dm_notifications: number;
  custom_prefix: string;
  max_warnings_before_ban: number;
}

export interface Member {
  id: number;
  name: string;
  display_name: string;
  avatar: string | null;
  roles: string[];
}

export interface TimeoutRequest {
  user_id: string;
  duration: number;
  reason: string;
  guild_id: number;
  moderator_id: string;
}

export interface KickRequest {
  user_id: string;
  reason: string;
  guild_id: number;
  moderator_id: string;
}

export interface BanRequest {
  user_id: string;
  reason: string;
  guild_id: number;
  moderator_id: string;
  delete_days?: number;
}

export interface ModerationResponse {
  success: boolean;
  message: string;
  user: string;
  reason?: string;
  duration?: number;
}

export default api;
