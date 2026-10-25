import { useState, useEffect } from 'react';
import api, { type Guild, type Member } from '../api/client';

type ActionType = 'timeout' | 'kick' | 'ban';

interface TimeoutPreset {
  label: string;
  value: number;
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
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [reason, setReason] = useState('');
  const [selectedTimeout, setSelectedTimeout] = useState<number>(3600);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<number>(0);
  const [moderatorId, setModeratorId] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);

  useEffect(() => {
    loadGuilds();
  }, []);

  useEffect(() => {
    if (memberSearch.length >= 2 && selectedGuild) {
      searchMembers();
    }
  }, [memberSearch, selectedGuild]);

  const loadGuilds = async () => {
    try {
      const data = await api.getGuilds();
      setGuilds(data);
      if (data.length > 0) {
        setSelectedGuild(data[0].id);
      }
      setApiAvailable(true);
    } catch {
      setApiAvailable(false);
    }
  };

  const searchMembers = async () => {
    try {
      const data = await api.searchMembers(selectedGuild, memberSearch);
      setMembers(data);
    } catch {
      setMembers([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotification(null);

    if (!selectedMember && !memberSearch) {
      setNotification({ message: 'Выберите пользователя', type: 'error' });
      setSubmitting(false);
      return;
    }
    if (!reason) {
      setNotification({ message: 'Укажите причину', type: 'error' });
      setSubmitting(false);
      return;
    }
    if (!moderatorId) {
      setNotification({ message: 'Укажите ID модератора', type: 'error' });
      setSubmitting(false);
      return;
    }

    const userId = selectedMember?.id?.toString() || memberSearch;

    try {
      let response;
      switch (actionType) {
        case 'timeout':
          response = await api.applyTimeout({
            user_id: userId,
            duration: selectedTimeout,
            reason,
            guild_id: selectedGuild,
            moderator_id: moderatorId,
          });
          break;
        case 'kick':
          response = await api.applyKick({
            user_id: userId,
            reason,
            guild_id: selectedGuild,
            moderator_id: moderatorId,
          });
          break;
        case 'ban':
          response = await api.applyBan({
            user_id: userId,
            reason,
            guild_id: selectedGuild,
            moderator_id: moderatorId,
          });
          break;
      }

      setNotification({ message: response.message, type: 'success' });
      setReason('');
      setSelectedMember(null);
      setMemberSearch('');
    } catch (err: any) {
      setNotification({ message: err.message || 'Ошибка выполнения', type: 'error' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setNotification(null), 5000);
    }
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

  if (!apiAvailable) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">🛡️ Модерация</h1>
          <p className="text-text-secondary">Применение мер к участникам сервера</p>
        </div>
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-6 text-center">
          <span className="text-4xl block mb-4">🔌</span>
          <h2 className="text-lg font-semibold text-danger mb-2">API недоступен</h2>
          <p className="text-text-secondary mb-4">
            Запустите Python бот для доступа к функциям модерации
          </p>
          <code className="bg-bg-secondary px-4 py-2 rounded-lg text-sm text-text-primary">
            cd bot && source venv/bin/activate && python main.py
          </code>
          <button
            onClick={loadGuilds}
            className="block mx-auto mt-4 px-4 py-2 bg-discord text-white rounded-lg hover:bg-discord-dark transition-colors"
          >
            🔄 Проверить подключение
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">🛡️ Модерация</h1>
        <p className="text-text-secondary">Применение мер к участникам сервера через API</p>
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

      {/* Guild Selector */}
      {guilds.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">Сервер</label>
          <select
            value={selectedGuild}
            onChange={(e) => setSelectedGuild(Number(e.target.value))}
            className="w-full bg-bg-card border border-white/10 rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-discord/50 transition-colors"
          >
            {guilds.map((g) => (
              <option key={g.id} value={g.id}>{g.name} ({g.member_count} участников)</option>
            ))}
          </select>
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
        {/* Moderator ID */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Ваш Discord ID (модератор)
          </label>
          <input
            type="text"
            value={moderatorId}
            onChange={(e) => setModeratorId(e.target.value)}
            placeholder="123456789012345678"
            className="w-full bg-bg-secondary border border-white/10 rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-discord/50 transition-colors"
          />
        </div>

        {/* Member Search */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Поиск пользователя
          </label>
          <input
            type="text"
            value={memberSearch}
            onChange={(e) => {
              setMemberSearch(e.target.value);
              setSelectedMember(null);
            }}
            placeholder="Введите имя пользователя (мин. 2 символа) или ID..."
            className="w-full bg-bg-secondary border border-white/10 rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-discord/50 transition-colors"
          />

          {/* Search Results */}
          {members.length > 0 && !selectedMember && (
            <div className="mt-2 bg-bg-secondary rounded-lg border border-white/10 max-h-48 overflow-y-auto">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    setSelectedMember(member);
                    setMemberSearch(member.name);
                    setMembers([]);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                >
                  {member.avatar ? (
                    <img src={member.avatar} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-discord/30 flex items-center justify-center text-xs">
                      {member.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-text-primary font-medium">{member.display_name}</p>
                    <p className="text-xs text-text-secondary">{member.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedMember && (
            <div className="mt-2 flex items-center gap-2 p-3 bg-discord/10 border border-discord/20 rounded-lg">
              <span className="text-success">✅</span>
              <span className="text-sm text-text-primary">Выбран: <strong>{selectedMember.display_name}</strong> ({selectedMember.name})</span>
              <button
                type="button"
                onClick={() => { setSelectedMember(null); setMemberSearch(''); }}
                className="ml-auto text-xs text-text-secondary hover:text-danger"
              >
                ✕ Сбросить
              </button>
            </div>
          )}
        </div>

        {/* Timeout Presets */}
        {actionType === 'timeout' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Длительность таймаута
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
          disabled={submitting}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 ${
            actionType === 'timeout'
              ? 'bg-warning hover:bg-warning/80'
              : actionType === 'kick'
              ? 'bg-info hover:bg-info/80'
              : 'bg-danger hover:bg-danger/80'
          }`}
        >
          {submitting ? '⏳ Выполнение...' : (
            actionType === 'timeout' ? '⏱️ Выдать таймаут' : actionType === 'kick' ? '👢 Кикнуть' : '🔨 Забанить'
          )}
        </button>
      </form>
    </div>
  );
}
