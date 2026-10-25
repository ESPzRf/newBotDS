import { useState } from 'react';

type ActionType = 'timeout' | 'kick' | 'ban';

interface TimeoutPreset {
  label: string;
  value: number; // seconds
}

const timeoutPresets: TimeoutPreset[] = [
  { label: '1 минута', value: 60 },
  { label: '5 минут', value: 300 },
  { label: '10 минут', value: 600 },
  { label: '1 час', value: 3600 },
  { label: '6 часов', value: 21600 },
  { label: '12 часов', value: 43200 },
  { label: '1 день', value: 86400 },
  { label: '1 неделя', value: 604800 },
];

const commonReasons = [
  'Спам в чате',
  'Оскорбления участников',
  'Реклама / ссылки',
  'Нарушение правил сервера',
  'NSFW контент',
  'Угрозы участникам',
  'Рейд сервера',
  'Мошенничество',
];

export default function Moderation() {
  const [actionType, setActionType] = useState<ActionType>('timeout');
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [selectedTimeout, setSelectedTimeout] = useState<number>(3600);
  const [customTimeout, setCustomTimeout] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username && !userId) {
      setNotification({ message: 'Укажите имя пользователя или ID', type: 'error' });
      return;
    }
    if (!reason) {
      setNotification({ message: 'Укажите причину действия', type: 'error' });
      return;
    }

    const actionLabel = actionType === 'timeout' ? 'Таймаут' : actionType === 'kick' ? 'Кик' : 'Бан';
    setNotification({ message: `${actionLabel} применён к ${username || userId}!`, type: 'success' });

    // Reset form
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const getActionColor = (type: ActionType) => {
    switch (type) {
      case 'timeout': return 'from-warning/20 to-warning/5 border-warning/30 hover:border-warning/50';
      case 'kick': return 'from-info/20 to-info/5 border-info/30 hover:border-info/50';
      case 'ban': return 'from-danger/20 to-danger/5 border-danger/30 hover:border-danger/50';
    }
  };

  const getActionIcon = (type: ActionType) => {
    switch (type) {
      case 'timeout': return '⏱️';
      case 'kick': return '👢';
      case 'ban': return '🔨';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">🛡️ Модерация</h1>
        <p className="text-text-secondary">Применение мер к участникам сервера</p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-lg border animate-fade-in ${
          notification.type === 'success'
            ? 'bg-success/10 border-success/30 text-success'
            : 'bg-danger/10 border-danger/30 text-danger'
        }`}>
          {notification.type === 'success' ? '✅' : '❌'} {notification.message}
        </div>
      )}

      {/* Action Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {(['timeout', 'kick', 'ban'] as ActionType[]).map((type) => (
          <button
            key={type}
            onClick={() => setActionType(type)}
            className={`p-5 rounded-xl border-2 transition-all duration-200 bg-gradient-to-br ${getActionColor(type)} ${
              actionType === type ? 'scale-105 shadow-lg' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <span className="text-3xl block mb-2">{getActionIcon(type)}</span>
            <span className="text-sm font-semibold text-text-primary">
              {type === 'timeout' ? 'Таймаут' : type === 'kick' ? 'Кик' : 'Бан'}
            </span>
            <p className="text-xs text-text-secondary mt-1">
              {type === 'timeout' ? 'Временное ограничение' : type === 'kick' ? 'Выгнать с сервера' : 'Заблокировать навсегда'}
            </p>
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-bg-card rounded-xl border border-white/5 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Имя пользователя / Тег
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username#1234"
              className="w-full bg-bg-secondary border border-white/10 rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-discord/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Discord ID (опционально)
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="123456789012345678"
              className="w-full bg-bg-secondary border border-white/10 rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-discord/50 transition-colors"
            />
          </div>
        </div>

        {/* Timeout Presets */}
        {actionType === 'timeout' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Длительность таймаута
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {timeoutPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setSelectedTimeout(preset.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedTimeout === preset.value
                      ? 'bg-discord text-white'
                      : 'bg-bg-secondary text-text-secondary hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customTimeout}
                onChange={(e) => setCustomTimeout(e.target.value)}
                placeholder="Свой вариант (секунды)"
                className="flex-1 bg-bg-secondary border border-white/10 rounded-lg px-4 py-2 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-discord/50 transition-colors text-sm"
              />
              <span className="text-xs text-text-secondary">сек.</span>
            </div>
          </div>
        )}

        {/* Reason */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-3">
            Причина
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {commonReasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  reason === r
                    ? 'bg-discord text-white'
                    : 'bg-bg-secondary text-text-secondary hover:bg-white/10 border border-white/5'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Или введите свою причину..."
            rows={2}
            className="w-full bg-bg-secondary border border-white/10 rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-discord/50 transition-colors resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
            actionType === 'timeout'
              ? 'bg-warning hover:bg-warning/80'
              : actionType === 'kick'
              ? 'bg-info hover:bg-info/80'
              : 'bg-danger hover:bg-danger/80'
          }`}
        >
          {actionType === 'timeout' ? '⏱️ Выдать таймаут' : actionType === 'kick' ? '👢 Кикнуть' : '🔨 Забанить'}
        </button>
      </form>
    </div>
  );
}
