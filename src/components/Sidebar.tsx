import { useState, useEffect } from 'react';
import { type Page } from '../App';
import api, { type BotStatus } from '../api/client';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const menuItems: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Дашборд', icon: '📊' },
  { id: 'moderation', label: 'Модерация', icon: '🛡️' },
  { id: 'logs', label: 'Логи', icon: '📋' },
  { id: 'settings', label: 'Настройки', icon: '⚙️' },
  { id: 'botcode', label: 'Код бота', icon: '🐍' },
  { id: 'install', label: 'Установка', icon: '🐧' },
];

export default function Sidebar({ currentPage, setCurrentPage, isOpen, setIsOpen }: SidebarProps) {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const status = await api.getStatus();
      setBotStatus(status);
    } catch {
      setBotStatus({ online: false });
    }
  };

  return (
    <aside className={`fixed left-0 top-0 h-full bg-bg-secondary border-r border-white/10 transition-all duration-300 z-50 ${isOpen ? 'w-64' : 'w-16'}`}>
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-discord rounded-lg flex items-center justify-center text-white font-bold text-sm">
              DB
            </div>
            <span className="text-text-primary font-semibold text-sm">Bot Manager</span>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-text-secondary hover:text-text-primary transition-colors p-1"
        >
          {isOpen ? '◀' : '▶'}
        </button>
      </div>

      <nav className="p-2 mt-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 ${
              currentPage === item.id
                ? 'bg-discord/20 text-discord-light border border-discord/30'
                : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {isOpen && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="absolute bottom-4 left-0 right-0 px-4">
        {isOpen && (
          <div className="bg-bg-card rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${
                botStatus?.online ? 'bg-success animate-pulse' : 'bg-danger'
              }`} />
              <span className={`text-xs font-medium ${
                botStatus?.online ? 'text-success' : 'text-danger'
              }`}>
                {botStatus?.online ? 'Бот онлайн' : 'Бот оффлайн'}
              </span>
            </div>
            {botStatus?.online ? (
              <>
                <p className="text-xs text-text-secondary truncate">{botStatus.user}</p>
                <p className="text-xs text-text-secondary mt-1">
                  Серверов: {botStatus.guilds} • {botStatus.latency}мс
                </p>
              </>
            ) : (
              <p className="text-xs text-text-secondary">Запустите: <code className="text-discord-light">python main.py</code></p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
