# Discord Moderation Bot

> 🤖 Discord бот модерации на **Python 3.14** с веб-панелью управления

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
- **Discord бот** — обрабатывает slash-команды из Discord
- **Flask API** — REST API для веб-панели (порт 5000)
- **SQLite** — хранение логов, настроек и активных таймаутов
- **React** — веб-интерфейс для управления

## 🚀 Возможности

### Discord команды (Slash)
| Команда | Описание | Права |
|---------|----------|-------|
| `/timeout` | Выдать таймаут (1m, 5m, 1h, 1d, 1w) | Moderate Members |
| `/kick` | Кикнуть пользователя | Kick Members |
| `/ban` | Забанить пользователя | Ban Members |
| `/warn` | Предупреждение (авто-бан при лимите) | Moderate Members |
| `/warnings` | Проверить предупреждения | Все |
| `/unban` | Снять бан | Ban Members |
| `/untimeout` | Снять таймаут | Moderate Members |

### Flask API (REST)
| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/status` | Статус бота |
| GET | `/api/stats` | Статистика модерации |
| GET | `/api/logs` | Логи действий |
| POST | `/api/moderation/timeout` | Выдать таймаут |
| POST | `/api/moderation/kick` | Кикнуть |
| POST | `/api/moderation/ban` | Забанить |
| GET | `/api/settings/:guild_id` | Настройки сервера |
| PUT | `/api/settings/:guild_id` | Обновить настройки |
| GET | `/api/guilds` | Список серверов |
| GET | `/api/guilds/:id/members` | Поиск участников |

### Веб-панель (React)
- 📊 Дашборд со статистикой
- 🛡️ Модерация через веб-интерфейс
- 📋 Просмотр логов с фильтрами
- ⚙️ Настройки бота
- 🐍 Просмотр исходного кода
- 🐧 Инструкция по установке на Ubuntu

## 📁 Структура проекта

```
project/
├── bot/                     # Python бэкенд
│   ├── main.py             # Точка входа (бот + Flask)
│   ├── web_server.py       # Flask API сервер
│   ├── database.py         # Работа с SQLite
│   ├── config.py           # Конфигурация
│   ├── requirements.txt    # Зависимости Python
│   └── .env.example        # Пример .env
├── src/                     # React фронтенд
│   ├── App.tsx             # Главный компонент
│   ├── api/client.ts       # API клиент
│   ├── components/         # UI компоненты
│   └── pages/              # Страницы
├── public/
│   └── bot/                # Python файлы для скачивания
├── package.json
├── .gitignore
└── README.md
```

## 🛠️ Быстрый старт

### 1. Клонирование
```bash
git clone https://github.com/YOUR_USERNAME/discord-moderation-bot.git
cd discord-moderation-bot
```

### 2. Python бэкенд
```bash
cd bot
python3.14 -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

pip install -r requirements.txt
cp .env.example .env
# Отредактируйте .env — вставьте токен бота!

python main.py
```

### 3. React фронтенд (опционально)
```bash
# В корне проекта
npm install
npm run build
# Flask автоматически раздаёт dist/ на порту 5000
```

### 4. Использование
- **Discord** — используйте slash-команды (`/timeout`, `/kick`, `/ban`)
- **Веб-панель** — откройте `http://localhost:5000`

## 🔧 Конфигурация (.env)

```env
# Discord (обязательно!)
DISCORD_BOT_TOKEN=your_token_here
BOT_PREFIX=!

# База данных
DB_PATH=data/bot_database.db

# Веб-сервер
WEB_PORT=5000
WEB_HOST=0.0.0.0
SECRET_KEY=change-me-in-production

# Модерация
LOG_CHANNEL_ID=0
MOD_ROLE_ID=0
MAX_WARNINGS=3
```

## 🗄️ База данных (SQLite)

| Таблица | Описание |
|---------|----------|
| `moderation_log` | Логи всех действий модерации |
| `warnings` | Предупреждения пользователей |
| `guild_settings` | Настройки серверов |
| `active_timeouts` | Активные таймауты |
| `web_sessions` | Сессии веб-панели |

## 📋 Требования

- **Python** 3.14+
- **Node.js** 20+ (для сборки фронтенда)
- **Discord Bot Token** ([получить](https://discord.com/developers/applications))

### Privileged Intents (обязательно включить)
- ✅ Presence Intent
- ✅ Server Members Intent
- ✅ Message Content Intent

## 📖 Подробная инструкция

Полная инструкция по установке на Ubuntu Server:
- 📄 [INSTALL_UBUNTU.md](public/INSTALL_UBUNTU.md)
- 🌐 Или через веб-панель → раздел «🐧 Установка»

## 🔐 Безопасность

1. Никогда не публикуйте `.env` файл
2. Используйте уникальный `SECRET_KEY`
3. Настройте CORS origins в продакшене
4. Используйте Nginx reverse proxy + SSL
5. Регулярно обновляйте зависимости

## 📄 Лицензия

MIT

---

**Сделано с ❤️ на Python 3.14 + React + Discord.py**
