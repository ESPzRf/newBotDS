import { useState } from 'react';

interface BotSettings {
  prefix: string;
  logChannel: string;
  modRole: string;
  autoMod: boolean;
  dmOnAction: boolean;
  maxTimeout: number;
  welcomeChannel: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<BotSettings>({
    prefix: '!',
    logChannel: '#mod-log',
    modRole: 'Moderator',
    autoMod: true,
    dmOnAction: true,
    maxTimeout: 604800,
    welcomeChannel: '#welcome',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">⚙️ Настройки бота</h1>
        <p className="text-text-secondary">Конфигурация поведения и параметров бота</p>
      </div>

      {saved && (
        <div className="mb-6 p-4 rounded-lg border bg-success/10 border-success/30 text-success animate-fade-in">
          ✅ Настройки успешно сохранены!
        </div>
      )}

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
                value={settings.prefix}
                onChange={(e) => setSettings({ ...settings, prefix: e.target.value })}
                className="w-full bg-bg-secondary border border-white/10 rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-discord/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Канал для логов</label>
              <input
                type="text"
                value={settings.logChannel}
                onChange={(e) => setSettings({ ...settings, logChannel: e.target.value })}
                className="w-full bg-bg-secondary border border-white/10 rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-discord/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Роль модератора</label>
              <input
                type="text"
                value={settings.modRole}
                onChange={(e) => setSettings({ ...settings, modRole: e.target.value })}
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
                onClick={() => setSettings({ ...settings, autoMod: !settings.autoMod })}
                className={`w-12 h-6 rounded-full transition-all duration-200 ${
                  settings.autoMod ? 'bg-discord' : 'bg-white/20'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                  settings.autoMod ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
              <div>
                <p className="text-sm font-medium text-text-primary">Уведомлять в ЛС</p>
                <p className="text-xs text-text-secondary">Отправлять сообщение пользователю при модерации</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, dmOnAction: !settings.dmOnAction })}
                className={`w-12 h-6 rounded-full transition-all duration-200 ${
                  settings.dmOnAction ? 'bg-discord' : 'bg-white/20'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                  settings.dmOnAction ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Максимальная длительность таймаута
              </label>
              <select
                value={settings.maxTimeout}
                onChange={(e) => setSettings({ ...settings, maxTimeout: Number(e.target.value) })}
                className="w-full bg-bg-secondary border border-white/10 rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-discord/50 transition-colors"
              >
                <option value={3600}>1 час</option>
                <option value={21600}>6 часов</option>
                <option value={43200}>12 часов</option>
                <option value={86400}>1 день</option>
                <option value={604800}>1 неделя (макс. Discord)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Database Settings */}
        <div className="bg-bg-card rounded-xl border border-white/5 p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            🗄️ База данных
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded-lg">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-sm text-success font-medium">SQLite подключена</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Путь к базе данных</label>
              <input
                type="text"
                value="./data/bot_database.db"
                readOnly
                className="w-full bg-bg-secondary border border-white/10 rounded-lg px-4 py-3 text-text-secondary font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-bg-secondary rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-text-primary">67</p>
                <p className="text-xs text-text-secondary">Записей</p>
              </div>
              <div className="bg-bg-secondary rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-text-primary">2.4 MB</p>
                <p className="text-xs text-text-secondary">Размер</p>
              </div>
              <div className="bg-bg-secondary rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-text-primary">3</p>
                <p className="text-xs text-text-secondary">Таблицы</p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-lg font-semibold text-white bg-discord hover:bg-discord-dark transition-all duration-200"
        >
          💾 Сохранить настройки
        </button>
      </div>
    </div>
  );
}
