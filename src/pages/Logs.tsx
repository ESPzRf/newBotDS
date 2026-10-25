import { useState } from 'react';

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  action: string;
  details: string;
  user?: string;
  moderator?: string;
}

const mockLogs: LogEntry[] = [
  { id: 1, timestamp: '2026-01-15 14:32:01', level: 'warning', action: 'TIMEOUT', details: 'Таймаут 1ч выдан пользователю', user: 'ToxicPlayer#1234', moderator: 'Admin#0001' },
  { id: 2, timestamp: '2026-01-15 14:28:45', level: 'error', action: 'BAN', details: 'Пользователь забанен навсегда', user: 'SpamBot#9999', moderator: 'ModHelper#0042' },
  { id: 3, timestamp: '2026-01-15 14:15:22', level: 'info', action: 'KICK', details: 'Пользователь кикнут с сервера', user: 'Annoying#5678', moderator: 'Admin#0001' },
  { id: 4, timestamp: '2026-01-15 13:55:10', level: 'success', action: 'UNBAN', details: 'Бан снят с пользователя', user: 'ReformedUser#4321', moderator: 'Admin#0001' },
  { id: 5, timestamp: '2026-01-15 13:42:33', level: 'warning', action: 'TIMEOUT', details: 'Таймаут 24ч выдан пользователю', user: 'Raider#3456', moderator: 'ModHelper#0042' },
  { id: 6, timestamp: '2026-01-15 13:30:00', level: 'info', action: 'BOT_START', details: 'Бот успешно запущен и подключён к серверу', moderator: 'System' },
  { id: 7, timestamp: '2026-01-15 13:29:55', level: 'info', action: 'DB_CONNECT', details: 'Подключение к базе данных установлено', moderator: 'System' },
  { id: 8, timestamp: '2026-01-15 12:00:00', level: 'error', action: 'BAN', details: 'Пользователь забанен за рейд', user: 'Scammer#7890', moderator: 'Admin#0001' },
  { id: 9, timestamp: '2026-01-15 11:45:12', level: 'success', action: 'TIMEOUT_REMOVE', details: 'Таймаут снят досрочно', user: 'GoodUser#1111', moderator: 'ModHelper#0042' },
  { id: 10, timestamp: '2026-01-15 11:20:00', level: 'warning', action: 'KICK', details: 'Пользователь кикнут за спам', user: 'Spammer#2222', moderator: 'Admin#0001' },
];

export default function Logs() {
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = mockLogs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = searchQuery === '' ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.moderator?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-info bg-info/10 border-info/20';
      case 'warning': return 'text-warning bg-warning/10 border-warning/20';
      case 'error': return 'text-danger bg-danger/10 border-danger/20';
      case 'success': return 'text-success bg-success/10 border-success/20';
      default: return 'text-text-secondary bg-white/5 border-white/10';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '🔴';
      case 'success': return '✅';
      default: return '📝';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">📋 Логи действий</h1>
        <p className="text-text-secondary">История всех действий модерации на сервере</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Поиск по логам..."
            className="w-full bg-bg-card border border-white/10 rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-discord/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'info', 'warning', 'error', 'success'].map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                filter === level
                  ? 'bg-discord text-white'
                  : 'bg-bg-card text-text-secondary hover:bg-white/10 border border-white/5'
              }`}
            >
              {level === 'all' ? 'Все' : level === 'info' ? 'ℹ️ Инфо' : level === 'warning' ? '⚠️ Предупр.' : level === 'error' ? '🔴 Ошибки' : '✅ Успех'}
            </button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="bg-bg-card rounded-lg border border-white/5 p-4 hover:border-white/10 transition-all"
          >
            <div className="flex items-start gap-4">
              <span className="text-lg mt-0.5">{getLevelIcon(log.level)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getLevelColor(log.level)}`}>
                    {log.action}
                  </span>
                  <span className="text-xs text-text-secondary">{log.timestamp}</span>
                </div>
                <p className="text-sm text-text-primary">{log.details}</p>
                <div className="flex items-center gap-4 mt-2">
                  {log.user && (
                    <span className="text-xs text-text-secondary">
                      👤 <span className="text-text-primary">{log.user}</span>
                    </span>
                  )}
                  {log.moderator && (
                    <span className="text-xs text-text-secondary">
                      🛡️ <span className="text-text-primary">{log.moderator}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-12">
          <span className="text-4xl block mb-4">📭</span>
          <p className="text-text-secondary">Логи не найдены</p>
        </div>
      )}
    </div>
  );
}
