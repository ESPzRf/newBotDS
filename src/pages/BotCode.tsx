import { useState } from 'react';

type Tab = 'bot' | 'database' | 'config' | 'requirements';

const botCode = `# bot/main.py
# Discord Moderation Bot - Python 3.14
# Основной файл бота

import discord
from discord.ext import commands
from discord import app_commands
import sqlite3
import asyncio
from datetime import timedelta
import logging
from config import Config

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('moderation_bot')


class ModerationBot(commands.Bot):
    """Основной класс бота модерации"""

    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True

        super().__init__(
            command_prefix=Config.PREFIX,
            intents=intents,
            description="Бот модерации сервера"
        )
        self.db = Database()

    async def setup_hook(self):
        """Инициализация при запуске"""
        await self.db.connect()
        await self.tree.sync()
        logger.info("Бот инициализирован и готов к работе")

    async def on_ready(self):
        """Событие при успешном подключении"""
        logger.info(f"Бот подключён как {self.user} (ID: {self.user.id})")
        logger.info(f"Подключён к {len(self.guilds)} серверам")
        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name="за порядком | !help"
            )
        )

    async def on_command_error(self, ctx, error):
        """Обработка ошибок команд"""
        if isinstance(error, commands.MissingPermissions):
            await ctx.send("❌ У вас нет прав для выполнения этой команды!")
        elif isinstance(error, commands.MemberNotFound):
            await ctx.send("❌ Пользователь не найден!")
        else:
            logger.error(f"Ошибка: {error}")
            await ctx.send(f"❌ Произошла ошибка: {error}")


class Database:
    """Класс для работы с базой данных SQLite"""

    def __init__(self):
        self.conn = None
        self.cursor = None

    async def connect(self):
        """Подключение к базе данных"""
        self.conn = sqlite3.connect(Config.DB_PATH)
        self.cursor = self.conn.cursor()
        await self._create_tables()
        logger.info("База данных подключена")

    async def _create_tables(self):
        """Создание таблиц"""
        self.cursor.executescript("""
            CREATE TABLE IF NOT EXISTS moderation_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_type TEXT NOT NULL,
                target_id INTEGER NOT NULL,
                target_name TEXT NOT NULL,
                moderator_id INTEGER NOT NULL,
                moderator_name TEXT NOT NULL,
                reason TEXT,
                duration INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                user_name TEXT NOT NULL,
                moderator_id INTEGER NOT NULL,
                reason TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS server_settings (
                guild_id INTEGER PRIMARY KEY,
                log_channel_id INTEGER,
                mod_role_id INTEGER,
                auto_mod INTEGER DEFAULT 0,
                dm_on_action INTEGER DEFAULT 1,
                prefix TEXT DEFAULT '!'
            );
        """)
        self.conn.commit()

    async def log_action(self, action_type, target_id, target_name,
                         moderator_id, moderator_name, reason, duration=None):
        """Запись действия в лог"""
        self.cursor.execute(
            """INSERT INTO moderation_log
               (action_type, target_id, target_name, moderator_id,
                moderator_name, reason, duration)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (action_type, target_id, target_name, moderator_id,
             moderator_name, reason, duration)
        )
        self.conn.commit()

    async def get_user_warnings(self, user_id):
        """Получить количество предупреждений"""
        self.cursor.execute(
            "SELECT COUNT(*) FROM warnings WHERE user_id = ?",
            (user_id,)
        )
        return self.cursor.fetchone()[0]

    async def add_warning(self, user_id, user_name, moderator_id, reason):
        """Добавить предупреждение"""
        self.cursor.execute(
            """INSERT INTO warnings (user_id, user_name, moderator_id, reason)
               VALUES (?, ?, ?, ?)""",
            (user_id, user_name, moderator_id, reason)
        )
        self.conn.commit()

    async def get_recent_logs(self, limit=20):
        """Получить последние записи лога"""
        self.cursor.execute(
            """SELECT * FROM moderation_log
               ORDER BY timestamp DESC LIMIT ?""",
            (limit,)
        )
        return self.cursor.fetchall()

    def close(self):
        """Закрытие соединения"""
        if self.conn:
            self.conn.close()


# --- Slash Commands ---

@commands.has_permissions(moderate_members=True)
async def timeout_command(
    interaction: discord.Interaction,
    member: discord.Member,
    duration: str,
    reason: str
):
    """Выдать таймаут пользователю"""
    duration_map = {
        '1m': 60, '5m': 300, '10m': 600,
        '1h': 3600, '6h': 21600, '12h': 43200,
        '1d': 86400, '1w': 604800
    }

    seconds = duration_map.get(duration.lower())
    if not seconds:
        await interaction.response.send_message(
            "❌ Неверная длительность! Используйте: 1m, 5m, 10m, 1h, 6h, 12h, 1d, 1w",
            ephemeral=True
        )
        return

    try:
        await member.timeout(
            timedelta(seconds=seconds),
            reason=f"{reason} (Модератор: {interaction.user})"
        )
        await interaction.response.send_message(
            f"⏱️ **Таймаут** выдан {member.mention} на **{duration}**\\n"
            f"📝 Причина: {reason}"
        )

        # Логирование в БД
        bot = interaction.client
        await bot.db.log_action(
            'TIMEOUT', member.id, str(member),
            interaction.user.id, str(interaction.user),
            reason, seconds
        )

        # Уведомление в ЛС
        try:
            await member.send(
                f"⏱️ Вы получили таймаут на сервере **{interaction.guild.name}**\\n"
                f"📝 Причина: {reason}\\n"
                f"⏰ Длительность: {duration}"
            )
        except discord.Forbidden:
            pass

    except discord.Forbidden:
        await interaction.response.send_message(
            "❌ У меня нет прав для выдачи таймаута этому пользователю!",
            ephemeral=True
        )


@commands.has_permissions(kick_members=True)
async def kick_command(
    interaction: discord.Interaction,
    member: discord.Member,
    reason: str
):
    """Кикнуть пользователя с сервера"""
    try:
        # Уведомление в ЛС перед киком
        try:
            await member.send(
                f"👢 Вы были кикнуты с сервера **{interaction.guild.name}**\\n"
                f"📝 Причина: {reason}"
            )
        except discord.Forbidden:
            pass

        await member.kick(reason=f"{reason} (Модератор: {interaction.user})")
        await interaction.response.send_message(
            f"👢 **{member}** был кикнут с сервера\\n"
            f"📝 Причина: {reason}"
        )

        # Логирование в БД
        bot = interaction.client
        await bot.db.log_action(
            'KICK', member.id, str(member),
            interaction.user.id, str(interaction.user),
            reason
        )

    except discord.Forbidden:
        await interaction.response.send_message(
            "❌ У меня нет прав для кика этого пользователя!",
            ephemeral=True
        )


@commands.has_permissions(ban_members=True)
async def ban_command(
    interaction: discord.Interaction,
    member: discord.Member,
    reason: str,
    delete_days: int = 0
):
    """Забанить пользователя на сервере"""
    try:
        # Уведомление в ЛС перед баном
        try:
            await member.send(
                f"🔨 Вы были забанены на сервере **{interaction.guild.name}**\\n"
                f"📝 Причина: {reason}"
            )
        except discord.Forbidden:
            pass

        await member.ban(
            reason=f"{reason} (Модератор: {interaction.user})",
            delete_message_days=delete_days
        )
        await interaction.response.send_message(
            f"🔨 **{member}** был забанен\\n"
            f"📝 Причина: {reason}"
        )

        # Логирование в БД
        bot = interaction.client
        await bot.db.log_action(
            'BAN', member.id, str(member),
            interaction.user.id, str(interaction.user),
            reason
        )

    except discord.Forbidden:
        await interaction.response.send_message(
            "❌ У меня нет прав для бана этого пользователя!",
            ephemeral=True
        )


# --- Запуск бота ---

def main():
    bot = ModerationBot()

    # Регистрация slash-команд
    bot.tree.add_command(
        app_commands.Command(
            name='timeout',
            description='Выдать таймаут пользователю',
            callback=timeout_command
        )
    )
    bot.tree.add_command(
        app_commands.Command(
            name='kick',
            description='Кикнуть пользователя',
            callback=kick_command
        )
    )
    bot.tree.add_command(
        app_commands.Command(
            name='ban',
            description='Забанить пользователя',
            callback=ban_command
        )
    )

    bot.run(Config.BOT_TOKEN)


if __name__ == "__main__":
    main()`;

const databaseCode = `# bot/database.py
# Модуль работы с базой данных (вынесенный)

import sqlite3
import os
from datetime import datetime
from typing import Optional, List, Tuple


class DatabaseManager:
    """Расширенный менеджер базы данных"""

    def __init__(self, db_path: str = "data/bot_database.db"):
        self.db_path = db_path
        self._ensure_data_dir()
        self.conn: Optional[sqlite3.Connection] = None

    def _ensure_data_dir(self):
        """Создание директории для данных"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

    def connect(self):
        """Подключение к БД"""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self._init_tables()

    def _init_tables(self):
        """Инициализация таблиц"""
        cursor = self.conn.cursor()

        # Таблица логов модерации
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS moderation_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                action_type TEXT NOT NULL CHECK(action_type IN ('timeout', 'kick', 'ban', 'unban', 'untimeout')),
                target_id INTEGER NOT NULL,
                target_name TEXT NOT NULL,
                moderator_id INTEGER NOT NULL,
                moderator_name TEXT NOT NULL,
                reason TEXT,
                duration_seconds INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME
            )
        """)

        # Таблица предупреждений
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                user_name TEXT NOT NULL,
                moderator_id INTEGER NOT NULL,
                reason TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                active INTEGER DEFAULT 1
            )
        """)

        # Таблица настроек сервера
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id INTEGER PRIMARY KEY,
                log_channel_id INTEGER,
                mod_role_id INTEGER,
                auto_mod_enabled INTEGER DEFAULT 0,
                dm_notifications INTEGER DEFAULT 1,
                custom_prefix TEXT DEFAULT '!',
                max_warnings_before_ban INTEGER DEFAULT 3,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Таблица таймаутов
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS active_timeouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                user_name TEXT NOT NULL,
                moderator_id INTEGER NOT NULL,
                reason TEXT,
                duration_seconds INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                active INTEGER DEFAULT 1
            )
        """)

        self.conn.commit()

    # --- Методы для работы с логами ---

    def add_log(self, guild_id: int, action_type: str, target_id: int,
                target_name: str, moderator_id: int, moderator_name: str,
                reason: str = None, duration: int = None) -> int:
        """Добавить запись в лог"""
        cursor = self.conn.cursor()
        expires_at = None
        if duration:
            from datetime import timedelta
            expires_at = (datetime.now() + timedelta(seconds=duration)).isoformat()

        cursor.execute("""
            INSERT INTO moderation_log
            (guild_id, action_type, target_id, target_name, moderator_id,
             moderator_name, reason, duration_seconds, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (guild_id, action_type, target_id, target_name,
              moderator_id, moderator_name, reason, duration, expires_at))
        self.conn.commit()
        return cursor.lastrowid

    def get_logs(self, guild_id: int, limit: int = 50,
                 action_type: str = None) -> List[Tuple]:
        """Получить логи"""
        cursor = self.conn.cursor()
        if action_type:
            cursor.execute("""
                SELECT * FROM moderation_log
                WHERE guild_id = ? AND action_type = ?
                ORDER BY created_at DESC LIMIT ?
            """, (guild_id, action_type, limit))
        else:
            cursor.execute("""
                SELECT * FROM moderation_log
                WHERE guild_id = ?
                ORDER BY created_at DESC LIMIT ?
            """, (guild_id, limit))
        return cursor.fetchall()

    # --- Методы для работы с предупреждениями ---

    def add_warning(self, guild_id: int, user_id: int, user_name: str,
                    moderator_id: int, reason: str) -> int:
        """Добавить предупреждение"""
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO warnings (guild_id, user_id, user_name, moderator_id, reason)
            VALUES (?, ?, ?, ?, ?)
        """, (guild_id, user_id, user_name, moderator_id, reason))
        self.conn.commit()
        return cursor.lastrowid

    def get_warnings_count(self, guild_id: int, user_id: int) -> int:
        """Получить количество активных предупреждений"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) FROM warnings
            WHERE guild_id = ? AND user_id = ? AND active = 1
        """, (guild_id, user_id))
        return cursor.fetchone()[0]

    # --- Методы для настроек ---

    def get_guild_settings(self, guild_id: int) -> Optional[dict]:
        """Получить настройки сервера"""
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT * FROM guild_settings WHERE guild_id = ?",
            (guild_id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    def update_guild_settings(self, guild_id: int, **kwargs):
        """Обновить настройки сервера"""
        # Сначала создаём запись если её нет
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)
        """, (guild_id,))

        set_clause = ", ".join(f"{k} = ?" for k in kwargs.keys())
        values = list(kwargs.values()) + [guild_id]
        cursor.execute(f"""
            UPDATE guild_settings SET {set_clause}, updated_at = CURRENT_TIMESTAMP
            WHERE guild_id = ?
        """, values)
        self.conn.commit()

    def close(self):
        """Закрытие соединения"""
        if self.conn:
            self.conn.close()`;

const configCode = `# bot/config.py
# Конфигурация бота

import os
from dataclasses import dataclass


@dataclass
class Config:
    """Конфигурация бота"""

    # Токен бота (из переменных окружения)
    BOT_TOKEN: str = os.getenv("DISCORD_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")

    # Префикс команд
    PREFIX: str = os.getenv("BOT_PREFIX", "!")

    # Путь к базе данных
    DB_PATH: str = os.getenv("DB_PATH", "data/bot_database.db")

    # ID канала для логов
    LOG_CHANNEL_ID: int = int(os.getenv("LOG_CHANNEL_ID", "0"))

    # ID роли модератора
    MOD_ROLE_ID: int = int(os.getenv("MOD_ROLE_ID", "0"))

    # Предустановки таймаутов (в секундах)
    TIMEOUT_PRESETS: dict = {
        '1m': 60,
        '5m': 300,
        '10m': 600,
        '1h': 3600,
        '6h': 21600,
        '12h': 43200,
        '1d': 86400,
        '1w': 604800,
    }

    # Максимальная длительность таймаута (28 дней - лимит Discord)
    MAX_TIMEOUT_SECONDS: int = 2419200

    # Цвета для embed-сообщений
    EMBED_COLORS: dict = {
        'timeout': 0xF59E0B,  # Жёлтый
        'kick': 0x3B82F6,     # Синий
        'ban': 0xEF4444,      # Красный
        'success': 0x22C55E,  # Зелёный
        'info': 0x5865F2,     # Discord
    }`;

const requirementsCode = `# requirements.txt
# Зависимости проекта

discord.py>=2.3.0
python-dotenv>=1.0.0
aiohttp>=3.9.0

# Для веб-интерфейса (Flask API)
flask>=3.0.0
flask-cors>=4.0.0

# Для работы с БД (альтернатива sqlite3)
# aiosqlite>=0.19.0

# Логирование
colorlog>=6.8.0`;

const envExample = `# .env.example
# Скопируйте этот файл в .env и заполните значения

# Токен бота Discord (обязательно)
DISCORD_BOT_TOKEN=your_bot_token_here

# Префикс команд
BOT_PREFIX=!

# Путь к базе данных
DB_PATH=data/bot_database.db

# ID канала для логов модерации
LOG_CHANNEL_ID=0

# ID роли модератора
MOD_ROLE_ID=0`;

export default function BotCode() {
  const [activeTab, setActiveTab] = useState<Tab>('bot');
  const [copied, setCopied] = useState(false);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'bot', label: 'main.py', icon: '🐍' },
    { id: 'database', label: 'database.py', icon: '🗄️' },
    { id: 'config', label: 'config.py', icon: '⚙️' },
    { id: 'requirements', label: 'requirements.txt', icon: '📦' },
  ];

  const getCode = () => {
    switch (activeTab) {
      case 'bot': return botCode;
      case 'database': return databaseCode;
      case 'config': return configCode;
      case 'requirements': return requirementsCode;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">🐍 Код бота (Python 3.14)</h1>
        <p className="text-text-secondary">Исходный код Discord бота с модерацией и базой данных</p>
      </div>

      {/* Instructions */}
      <div className="bg-bg-card rounded-xl border border-discord/20 p-5 mb-6">
        <h3 className="text-sm font-semibold text-discord-light mb-3">📖 Быстрый старт</h3>
        <ol className="text-sm text-text-secondary space-y-2">
          <li>1. Установите Python 3.14 и создайте виртуальное окружение</li>
          <li>2. Установите зависимости: <code className="bg-bg-secondary px-2 py-0.5 rounded text-discord-light">pip install -r requirements.txt</code></li>
          <li>3. Скопируйте <code className="bg-bg-secondary px-2 py-0.5 rounded text-discord-light">.env.example</code> в <code className="bg-bg-secondary px-2 py-0.5 rounded text-discord-light">.env</code> и заполните токен</li>
          <li>4. Запустите бота: <code className="bg-bg-secondary px-2 py-0.5 rounded text-discord-light">python main.py</code></li>
        </ol>
      </div>

      {/* Code Viewer */}
      <div className="bg-bg-card rounded-xl border border-white/5 overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-white/5 px-4">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'text-discord-light border-discord'
                    : 'text-text-secondary border-transparent hover:text-text-primary'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-discord/20 text-discord-light hover:bg-discord/30 transition-all"
          >
            {copied ? '✅ Скопировано!' : '📋 Копировать'}
          </button>
        </div>

        {/* Code */}
        <div className="p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
          <pre className="text-sm text-text-primary font-mono leading-relaxed whitespace-pre">
            {getCode()}
          </pre>
        </div>
      </div>

      {/* .env example */}
      <div className="mt-6 bg-bg-card rounded-xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <span className="text-sm font-medium text-text-primary">📄 .env.example</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(envExample);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-discord/20 text-discord-light hover:bg-discord/30 transition-all"
          >
            {copied ? '✅ Скопировано!' : '📋 Копировать'}
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          <pre className="text-sm text-text-secondary font-mono leading-relaxed whitespace-pre">
            {envExample}
          </pre>
        </div>
      </div>
    </div>
  );
}
