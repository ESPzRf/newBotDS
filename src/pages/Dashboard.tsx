import { useState, useEffect } from 'react';

interface Stats {
  totalTimeouts: number;
  totalKicks: number;
  totalBans: number;
  activeTimeouts: number;
}

interface RecentAction {
  id: number;
  user: string;
  action: string;
  reason: string;
  moderator: string;
  time: string;
  type: 'timeout' | 'kick' | 'ban';
}

const mockStats: Stats = {
  totalTimeouts: 47,
  totalKicks: 12,
  totalBans: 8,
  activeTimeouts: 3,
};

const mockActions: RecentAction[] = [
  { id: 1, user: 'ToxicPlayer#1234', action: 'Таймаут 1ч', reason: 'Спам в чате', moderator: 'Admin#0001', time: '5 мин назад', type: 'timeout' },
  { id: 2, user: 'SpamBot#9999', action: 'Бан навсегда', reason: 'Реклама', moderator: 'ModHelper#0042', time: '15 мин назад', type: 'ban' },
  { id: 3, user: 'Annoying#5678', action: 'Кик', reason: 'Нарушение правил', moderator: 'Admin#0001', time: '1 час назад', type: 'kick' },
  { id: 4, user: 'Raider#3456', action: 'Таймаут 24ч', reason: 'Оскорбления', moderator: 'ModHelper#0042', time: '2 часа назад', type: 'timeout' },
  { id: 5, user: 'Scammer#7890', action: 'Бан навсегда', reason: 'Мошенничество', moderator: 'Admin#0001', time: '3 часа назад', type: 'ban' },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>(mockStats);
  const [actions, setActions] = useState<RecentAction[]>(mockActions);

  useEffect(() => {
    // Симуляция обновления данных
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        activeTimeouts: Math.floor(Math.random() * 5) + 1,
      }));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'timeout': return 'bg-warning/20 text-warning border-warning/30';
      case 'kick': return 'bg-info/20 text-info border-info/30';
      case 'ban': return 'bg-danger/20 text-danger border-danger/30';
      default: return 'bg-white/10 text-text-primary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'timeout': return '⏱️';
      case 'kick': return '👢';
      case 'ban': return '🔨';
      default: return '❓';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">📊 Панель управления</h1>
        <p className="text-text-secondary">Обзор активности бота и модерации сервера</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-bg-card rounded-xl p-5 border border-white/5 hover:border-warning/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">⏱️</span>
            <span className="text-xs text-warning bg-warning/10 px-2 py-1 rounded-full">Активно: {stats.activeTimeouts}</span>
          </div>
          <h3 className="text-2xl font-bold text-text-primary">{stats.totalTimeouts}</h3>
          <p className="text-sm text-text-secondary">Таймаутов</p>
        </div>

        <div className="bg-bg-card rounded-xl p-5 border border-white/5 hover:border-info/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">👢</span>
            <span className="text-xs text-info bg-info/10 px-2 py-1 rounded-full">За неделю: 2</span>
          </div>
          <h3 className="text-2xl font-bold text-text-primary">{stats.totalKicks}</h3>
          <p className="text-sm text-text-secondary">Киков</p>
        </div>

        <div className="bg-bg-card rounded-xl p-5 border border-white/5 hover:border-danger/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🔨</span>
            <span className="text-xs text-danger bg-danger/10 px-2 py-1 rounded-full">За неделю: 1</span>
          </div>
          <h3 className="text-2xl font-bold text-text-primary">{stats.totalBans}</h3>
          <p className="text-sm text-text-secondary">Банов</p>
        </div>

        <div className="bg-bg-card rounded-xl p-5 border border-white/5 hover:border-success/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">✅</span>
            <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">Онлайн</span>
          </div>
          <h3 className="text-2xl font-bold text-text-primary">1,247</h3>
          <p className="text-sm text-text-secondary">Участников</p>
        </div>
      </div>

      {/* Recent Actions */}
      <div className="bg-bg-card rounded-xl border border-white/5 overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Последние действия</h2>
          <span className="text-xs text-text-secondary bg-white/5 px-3 py-1 rounded-full">Авто-обновление</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Тип</th>
                <th className="text-left p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Пользователь</th>
                <th className="text-left p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Действие</th>
                <th className="text-left p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Причина</th>
                <th className="text-left p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Модератор</th>
                <th className="text-left p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Время</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr key={action.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getTypeColor(action.type)}`}>
                      {getTypeIcon(action.type)} {action.type === 'timeout' ? 'Таймаут' : action.type === 'kick' ? 'Кик' : 'Бан'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-text-primary font-medium">{action.user}</td>
                  <td className="p-4 text-sm text-text-secondary">{action.action}</td>
                  <td className="p-4 text-sm text-text-secondary">{action.reason}</td>
                  <td className="p-4 text-sm text-text-secondary">{action.moderator}</td>
                  <td className="p-4 text-sm text-text-secondary">{action.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
