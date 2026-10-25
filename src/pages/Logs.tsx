import { useState, useEffect } from 'react';
import api, { type LogEntry, type Guild } from '../api/client';

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selectedGuild, setSelectedGuild] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);

  useEffect(() => {
    loadData();
  }, [filter, selectedGuild]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsData, guildsData] = await Promise.all([
        api.getLogs({
          limit: 100,
          type: filter === 'all' ? undefined : filter,
          guild_id: selectedGuild || undefined,
        }),
        api.getGuilds(),
      ]);
      setLogs(logsData);
      setGuilds(guildsData);
      setApiAvailable(true);
    } catch {
      setApiAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.target_name.toLowerCase().includes(q) ||
      log.moderator_name.toLowerCase().includes(q) ||
      (log.reason && log.reason.toLowerCase().includes(q))
    );
  });

  const getLevelColor = (type: string) => {
    switch (type) {
      case 'timeout': case 'warn': return 'text-warning bg-warning/10 border-warning/20';
      case 'kick': return 'text-info bg-info/10 border-info/20';
      case 'ban': return 'text-danger bg-danger/10 border-danger/20';
      case 'unban': case 'untimeout': return 'text-success bg-success/10 border-success/20';
      default: return 'text-text-secondary bg-white/5 border-white/10';
    }
  };

  const getLevelIcon = (type: string) => {
    switch (type) {
      case 'timeout': return '⏱️';
      case 'kick': return '👢';
      case 'ban': return '🔨';
      case 'unban': return '✅';
      case 'untimeout': return '✅';
      case 'warn': return '⚠️';
      default: return '📝';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'timeout': return 'Таймаут';
      case 'kick': return 'Кик';
      case 'ban': return 'Бан';
      case 'unban': return 'Разбан';
      case 'untimeout': return 'Снят таймаут';
      case 'warn': return 'Предупреждение';
      default: return type;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  if (!apiAvailable) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">📋 Логи действий</h1>
          <p className="text-text-secondary">История всех действий модерации</p>
        </div>
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-6 text-center">
          <span className="text-4xl block mb-4">🔌</span>
          <h2 className="text-lg font-semibold text-danger mb-2">API недоступен</h2>
          <p className="text-text-secondary mb-4">Запустите Python бот для просмотра логов</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-discord text-white rounded-lg hover:bg-discord-dark transition-colors"
          >
            🔄 Проверить подключение
          </button>
        </div>
      </div>
    );
  }

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
        {guilds.length > 0 && (
          <select
            value={selectedGuild || ''}
            onChange={(e) => setSelectedGuild(e.target.value ? Number(e.target.value) : null)}
            className="bg-bg-card border border-white/10 rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-discord/50 transition-colors"
          >
            <option value="">Все серверы</option>
            {guilds.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'Все' },
            { id: 'timeout', label: '⏱️ Таймауты' },
            { id: 'kick', label: '👢 Кики' },
            { id: 'ban', label: '🔨 Баны' },
            { id: 'warn', label: '⚠️ Предупр.' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                filter === f.id
                  ? 'bg-discord text-white'
                  : 'bg-bg-card text-text-secondary hover:bg-white/10 border border-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {['timeout', 'kick', 'ban', 'unban', 'warn'].map((type) => {
          const count = logs.filter(l => l.action_type === type).length;
          return (
            <div key={type} className="bg-bg-card rounded-lg p-3 border border-white/5 text-center">
              <span className="text-lg">{getLevelIcon(type)}</span>
              <p className="text-lg font-bold text-text-primary">{count}</p>
              <p className="text-xs text-text-secondary">{getTypeLabel(type)}</p>
            </div>
          );
        })}
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-text-secondary">Загрузка логов...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-bg-card rounded-lg border border-white/5 p-4 hover:border-white/10 transition-all"
            >
              <div className="flex items-start gap-4">
                <span className="text-lg mt-0.5">{getLevelIcon(log.action_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getLevelColor(log.action_type)}`}>
                      {log.action_type.toUpperCase()}
                    </span>
                    <span className="text-xs text-text-secondary">{formatDate(log.created_at)}</span>
                    {log.duration_seconds && (
                      <span className="text-xs text-text-secondary">
                        Длительность: {Math.round(log.duration_seconds / 60)} мин
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-primary">{log.reason || 'Без причины'}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-text-secondary">
                      👤 <span className="text-text-primary">{log.target_name}</span>
                    </span>
                    <span className="text-xs text-text-secondary">
                      🛡️ <span className="text-text-primary">{log.moderator_name}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredLogs.length === 0 && !loading && (
        <div className="text-center py-12">
          <span className="text-4xl block mb-4">📭</span>
          <p className="text-text-secondary">Логи не найдены</p>
        </div>
      )}
    </div>
  );
}
