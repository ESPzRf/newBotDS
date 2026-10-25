import { useState, useEffect } from 'react';
import api, { type Stats, type LogEntry, type BotStatus } from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statsData, logsData, statusData] = await Promise.all([
        api.getStats(),
        api.getLogs({ limit: 10 }),
        api.getStatus(),
      ]);
      setStats(statsData);
      setLogs(logsData);
      setStatus(statusData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Не удалось подключиться к API');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'timeout': return 'bg-warning/20 text-warning border-warning/30';
      case 'kick': return 'bg-info/20 text-info border-info/30';
      case 'ban': return 'bg-danger/20 text-danger border-danger/30';
      case 'unban': return 'bg-success/20 text-success border-success/30';
      case 'untimeout': return 'bg-success/20 text-success border-success/30';
      default: return 'bg-white/10 text-text-primary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'timeout': return '⏱️';
      case 'kick': return '👢';
      case 'ban': return '🔨';
      case 'unban': return '✅';
      case 'untimeout': return '✅';
      case 'warn': return '⚠️';
      default: return '❓';
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
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-text-secondary">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">📊 Панель управления</h1>
          <p className="text-text-secondary">Обзор активности бота и модерации сервера</p>
        </div>
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-6 text-center">
          <span className="text-4xl block mb-4">🔌</span>
          <h2 className="text-lg font-semibold text-danger mb-2">Нет подключения к API</h2>
          <p className="text-text-secondary mb-4">{error}</p>
          <p className="text-sm text-text-secondary mb-4">
            Убедитесь, что Python бот запущен и Flask API доступен
          </p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-discord text-white rounded-lg hover:bg-discord-dark transition-colors"
          >
            🔄 Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">📊 Панель управления</h1>
        <p className="text-text-secondary">Обзор активности бота и модерации сервера</p>
      </div>

      {/* Bot Status Banner */}
      {status && (
        <div className={`mb-6 p-4 rounded-xl border ${
          status.online
            ? 'bg-success/5 border-success/20'
            : 'bg-danger/5 border-danger/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${status.online ? 'bg-success animate-pulse' : 'bg-danger'}`} />
            <span className={`text-sm font-medium ${status.online ? 'text-success' : 'text-danger'}`}>
              {status.online ? `Бот онлайн — ${status.user}` : 'Бот оффлайн'}
            </span>
            {status.online && status.latency && (
              <span className="text-xs text-text-secondary ml-auto">
                Пинг: {status.latency}мс • Серверов: {status.guilds}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-bg-card rounded-xl p-5 border border-white/5 hover:border-warning/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">⏱️</span>
            <span className="text-xs text-warning bg-warning/10 px-2 py-1 rounded-full">
              Активно: {stats?.activeTimeouts || 0}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-text-primary">{stats?.totalTimeouts || 0}</h3>
          <p className="text-sm text-text-secondary">Таймаутов</p>
        </div>

        <div className="bg-bg-card rounded-xl p-5 border border-white/5 hover:border-info/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">👢</span>
          </div>
          <h3 className="text-2xl font-bold text-text-primary">{stats?.totalKicks || 0}</h3>
          <p className="text-sm text-text-secondary">Киков</p>
        </div>

        <div className="bg-bg-card rounded-xl p-5 border border-white/5 hover:border-danger/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🔨</span>
          </div>
          <h3 className="text-2xl font-bold text-text-primary">{stats?.totalBans || 0}</h3>
          <p className="text-sm text-text-secondary">Банов</p>
        </div>

        <div className="bg-bg-card rounded-xl p-5 border border-white/5 hover:border-success/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">✅</span>
            <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">
              {status?.online ? 'Онлайн' : 'Оффлайн'}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-text-primary">{stats?.totalMembers || 0}</h3>
          <p className="text-sm text-text-secondary">Участников</p>
        </div>
      </div>

      {/* Recent Actions */}
      <div className="bg-bg-card rounded-xl border border-white/5 overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Последние действия</h2>
          <span className="text-xs text-text-secondary bg-white/5 px-3 py-1 rounded-full">
            Обновлено: {new Date().toLocaleTimeString('ru-RU')}
          </span>
        </div>
        {logs.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-3xl block mb-2">📭</span>
            <p className="text-text-secondary">Действий пока нет</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Тип</th>
                  <th className="text-left p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Пользователь</th>
                  <th className="text-left p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Причина</th>
                  <th className="text-left p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Модератор</th>
                  <th className="text-left p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Дата</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getTypeColor(log.action_type)}`}>
                        {getTypeIcon(log.action_type)} {getTypeLabel(log.action_type)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-text-primary font-medium">{log.target_name}</td>
                    <td className="p-4 text-sm text-text-secondary">{log.reason || '—'}</td>
                    <td className="p-4 text-sm text-text-secondary">{log.moderator_name}</td>
                    <td className="p-4 text-sm text-text-secondary">{formatDate(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
