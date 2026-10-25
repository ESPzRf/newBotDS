import { useState, useEffect } from 'react';
import api, { type Guild, type GuildSettings, type BotStatus } from '../api/client';

export default function Settings() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<number>(0);
  const [settings, setSettings] = useState<GuildSettings | null>(null);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedGuild) {
      loadSettings();
    }
  }, [selectedGuild]);

  const loadInitial = async () => {
    try {
      const [guildsData, statusData] = await Promise.all([
        api.getGuilds(),
        api.getStatus(),
      ]);
      setGuilds(guildsData);
      setStatus(statusData);
      if (guildsData.length > 0) {
        setSelectedGuild(guildsData[0].id);
      }
      setApiAvailable(true);
    } catch {
      setApiAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.getSettings(selectedGuild);
      setSettings(data);
    } catch {
      setSettings(null);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      await api.updateSettings(selectedGuild, {
        custom_prefix: settings.custom_prefix,
        log_channel_id: settings.log_channel_id,
        mod_role_id: settings.mod_role_id,
        auto_mod_enabled: settings.auto_mod_enabled,
        dm_notifications: settings.dm_notifications,
        max_warnings_before_ban: settings.max_warnings_before_ban,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert('Ошибка сохранения: ' + err.message);
    }
  };

  if (!apiAvailable) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">⚙️ Настройки бота</h1>
          <p className="text-text-secondary">Конфигурация поведения и параметров бота</p>
        </div>
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-6 text-center">
          <span className="text-4xl block mb-4">🔌</span>
          <h2 className="text-lg font-semibold text-danger mb-2">API недоступен</h2>
          <p className="text-text-secondary mb-4">Запустите Python бот для управления настройками</p>
          <button
            onClick={loadInitial}
            className="px-4 py-2 bg-discord text-white rounded-lg hover:bg-discord-dark transition-colors"
          >
            🔄 Проверить подключение
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">⚙️ Настройки бота</h1>
        <p className="text-text-secondary">Конфигурация через Flask API → SQLite</p>
      </div>

      {saved && (
        <div className="mb-6 p-4 rounded-lg border bg-success/10 border-success/30 text-success animate-fade-in">
          ✅ Настройки сохранены в базу данных!
        </div>
      )}

      {/* Bot Status */}
      {status && (
        <div className={`mb-6 p-4 rounded-xl border ${
          status.online ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${status.online ? 'bg-success animate-pulse' : 'bg-danger'}`} />
            <div>
              <p className={`text-sm font-medium ${status.online ? 'text-success' : 'text-danger'}`}>
                {status.online ? `Бот: ${status.user}` : 'Бот оффлайн'}
              </p>
              {status.online && (
                <p className="text-xs text-text-secondary">
                  Пинг: {status.latency}мс • Аптайм: {status.uptime}
                </p>
              )}
            </div>
          </div>
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

      {settings && (
        <div className="space-y-6">
          {/* General Settings */}
          <div className="bg-bg-card rounded-xl border border-white/5 p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              🔧 Основные настройки
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Префикс команд</label>
                <input
                  type="text"
                  value={settings.custom_prefix}
                  onChange={(e) => setSettings({ ...settings, custom_prefix: e.target.value })}
                  className="w-full bg-bg-secondary border border-white/10 rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-discord/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">ID канала для логов</label>
                <input
                  type="number"
                  value={settings.log_channel_id || ''}
                  onChange={(e) => setSettings({ ...settings, log_channel_id: Number(e.target.value) || null })}
                  placeholder="ID канала"
                  className="w-full bg-bg-secondary border border-white/10 rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-discord/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">ID роли модератора</label>
                <input
                  type="number"
                  value={settings.mod_role_id || ''}
                  onChange={(e) => setSettings({ ...settings, mod_role_id: Number(e.target.value) || null })}
                  placeholder="ID роли"
                  className="w-full bg-bg-secondary border border-white/10 rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-discord/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Moderation Settings */}
          <div className="bg-bg-card rounded-xl border border-white/5 p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              🛡️ Настройки модерации
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                <div>
                  <p className="text-sm font-medium text-text-primary">Автомодерация</p>
                  <p className="text-xs text-text-secondary">Автоматическое обнаружение нарушений</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, auto_mod_enabled: settings.auto_mod_enabled ? 0 : 1 })}
                  className={`w-12 h-6 rounded-full transition-all duration-200 ${
                    settings.auto_mod_enabled ? 'bg-discord' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                    settings.auto_mod_enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                <div>
                  <p className="text-sm font-medium text-text-primary">Уведомлять в ЛС</p>
                  <p className="text-xs text-text-secondary">Отправлять сообщение пользователю при модерации</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, dm_notifications: settings.dm_notifications ? 0 : 1 })}
                  className={`w-12 h-6 rounded-full transition-all duration-200 ${
                    settings.dm_notifications ? 'bg-discord' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                    settings.dm_notifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Макс. предупреждений до авто-бана
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.max_warnings_before_ban}
                  onChange={(e) => setSettings({ ...settings, max_warnings_before_ban: Number(e.target.value) })}
                  className="w-full bg-bg-secondary border border-white/10 rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-discord/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Database Info */}
          <div className="bg-bg-card rounded-xl border border-white/5 p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              🗄️ База данных (SQLite)
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded-lg">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm text-success font-medium">SQLite подключена</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-bg-secondary rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-text-primary">5</p>
                  <p className="text-xs text-text-secondary">Таблицы</p>
                </div>
                <div className="bg-bg-secondary rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-text-primary">WAL</p>
                  <p className="text-xs text-text-secondary">Режим</p>
                </div>
                <div className="bg-bg-secondary rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-text-primary">Python</p>
                  <p className="text-xs text-text-secondary">Драйвер</p>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-lg font-semibold text-white bg-discord hover:bg-discord-dark transition-all duration-200"
          >
            💾 Сохранить настройки в БД
          </button>
        </div>
      )}
    </div>
  );
}
