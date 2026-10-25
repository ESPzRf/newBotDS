# Discord Moderation Bot

> Python 3.14 Discord бот с веб-панелью управления на Flask API + React

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Python 3.14                           │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │ Discord Bot  │    │  Flask API   │    │  SQLite   │  │
│  │  (discord.py)│◄──►│  (порт 5000) │◄──►│    DB     │  │
│  └──────────────┘    └──────┬───────┘    └───────────┘  │
│                              │                           │
└──────────────────────────────┼───────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   React Frontend    │
                    │   (веб-панель)      │
                    └─────────────────────┘
```

**Всё работает в одном процессе Python:**
- Discord бот обрабатывает команды из Discord
- Flask API обслуживает веб-панель и принимает запросы от неё
- SQLite хранит логи, настройки и активные таймауты

## 🚀 Возможности

### Discord команды (Slash)
- ⏱️ `/timeout` — таймаут с пресетами (1m, 5m, 1h, 1d, 1w)
- 👢 `/kick` — кик пользователя
- 🔨 `/ban` — бан с удалением сообщений
- ⚠️ `/warn` — предупреждение (авто-бан при лимите)
- 📋 `/warnings` — проверка предупреждений
- ✅ `/unban` — снять бан
- ✅ `/untimeout` — снять таймаут

### Flask API (REST)
- `GET /api/status` — статус бота
- `GET /api/stats` — статистика модерации
- `GET /api/logs` — логи действий
- `POST /api/moderation/timeout` — выдать таймаут
- `POST /api/moderation/kick` — кикнуть
- `POST /api/moderation/ban` — забанить
- `GET /api/settings/:guild_id` — настройки сервера
- `PUT /api/settings/:guild_id` — обновить настройки
- `GET /api/guilds` — список серверов
- `GET /api/guilds/:id/members` — поиск участников

### Веб-панель (React)
- 📊 Дашборд со статистикой
- 🛡️ Модерация через веб-интерфейс
- 📋 Просмотр логов с фильтрами
- ⚙️ Настройки бота
- 🐍 Просмотр исходного кода
- 🐧 Инструкция по установке

## 📁 Структура проекта

```
project/
├── bot/                    # Python бэкенд
│   ├── main.py            # Точка входа (бот + Flask)
│   ├── web_server.py      # Flask API сервер
│   ├── database.py        # Работа с SQLite
│   ├── config.py          # Конфигурация
│   ├── requirements.txt   # Зависимости Python
│   └── .env.example       # Пример .env
├── src/                    # React фронтенд
│   ├── App.tsx            # Главный компонент
│   ├── api/client.ts      # API клиент
│   ├── components/        # UI компоненты
│   └── pages/             # Страницы
├── public/
│   └── bot/               # Python файлы для скачивания
├── package.json
└── README.md
```

## 🛠️ Установка

### 1. Клонирование
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 2. Python бэкенд
```bash
cd bot
python3.14 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Заполните .env (токен бота обязательно!)
python main.py
```

### 3. React фронтенд (опционально)
```bash
cd ..
npm install
npm run build    # Сборка → dist/
# Flask автоматически раздаёт dist/ на порту 5000
```

### 4. Доступ
- **Discord** — используйте slash-команды
- **Веб-панель** — http://localhost:5000

## 🔧 Конфигурация (.env)

```env
DISCORD_BOT_TOKEN=your_token_here
BOT_PREFIX=!
DB_PATH=data/bot_database.db
WEB_PORT=5000
WEB_HOST=0.0.0.0
SECRET_KEY=change-me
LOG_CHANNEL_ID=0
MOD_ROLE_ID=0
MAX_WARNINGS=3
```

## 🗄️ База данных (SQLite)

Таблицы:
- `moderation_log` — логи всех действий
- `warnings` — предупреждения пользователей
- `guild_settings` — настройки серверов
- `active_timeouts` — активные таймауты
- `web_sessions` — сессии веб-панели

## 📋 Требования

- Python 3.14+
- Node.js 20+ (для сборки фронтенда)
- Discord Bot Token

## 🔐 Безопасность

1. Никогда не публикуйте `.env`
2. Используйте `SECRET_KEY` отличный от дефолтного
3. Настройте CORS origins в продакшене
4. Используйте Nginx reverse proxy + SSL

## 📄 Лицензия

MIT
