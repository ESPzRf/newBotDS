import { useState } from 'react';

type Tab = 'main' | 'web_server' | 'database' | 'config' | 'requirements';

const mainCode = `# bot/main.py
# Discord Moderation Bot - Python 3.14
# Запуск Discord бота + Flask API сервера

import discord
from discord.ext import commands
from discord import app_commands
import asyncio
import logging
import threading
import signal
import sys
from datetime import timedelta, datetime

from config import Config
from database import DatabaseManager
from web_server import create_app

# Логирование
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('bot.log', encoding='utf-8')
    ]
)
logger = logging.getLogger('moderation_bot')


class ModerationBot(commands.Bot):
    """Основной класс Discord бота модерации"""

    def __init__(self, db: DatabaseManager):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True

        super().__init__(
            command_prefix=Config.PREFIX,
            intents=intents,
            description="Бот модерации Discord сервера"
        )
        self.db = db
        self.start_time = None

    async def setup_hook(self):
        """Инициализация при запуске"""
        self.tree.add_command(timeout_cmd)
        self.tree.add_command(kick_cmd)
        self.tree.add_command(ban_cmd)
        self.tree.add_command(warn_cmd)
        self.tree.add_command(warnings_cmd)
        self.tree.add_command(unban_cmd)
        self.tree.add_command(untimeout_cmd)
        await self.tree.sync()
        logger.info("Slash-команды синхронизированы")

    async def on_ready(self):
        """Событие при подключении к Discord"""
        self.start_time = datetime.now()
        logger.info(f"✅ Бот подключён как {self.user}")
        logger.info(f"📡 Подключён к {len(self.guilds)} серверам")

        for guild in self.guilds:
            logger.info(f"  └─ {guild.name} ({guild.member_count} участников)")
            self.db.update_guild_settings(guild.id)

        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name=f"за порядком | {Config.PREFIX}help"
            )
        )


# --- Slash-команды ---

@app_commands.command(name='timeout', description='Выдать таймаут')
@app_commands.checks.has_permissions(moderate_members=True)
async def timeout_cmd(
    interaction: discord.Interaction,
    member: discord.Member,
    duration: str,
    reason: str = 'Не указана'
):
    """Выдать таймаут пользователю"""
    seconds = Config.TIMEOUT_PRESETS.get(duration.lower())
    if not seconds:
        await interaction.response.send_message(
            f"❌ Неверная длительность! Доступные: {', '.join(Config.TIMEOUT_PRESETS.keys())}",
            ephemeral=True
        )
        return

    await member.timeout(timedelta(seconds=seconds), reason=reason)

    # Лог в БД
    bot = interaction.client
    bot.db.add_log(
        guild_id=interaction.guild_id,
        action_type='timeout',
        target_id=member.id,
        target_name=str(member),
        moderator_id=interaction.user.id,
        moderator_name=str(interaction.user),
        reason=reason,
        duration=seconds
    )

    await interaction.response.send_message(
        f"⏱️ Таймаут выдан {member.mention} на {duration}. Причина: {reason}"
    )


@app_commands.command(name='kick', description='Кикнуть пользователя')
@app_commands.checks.has_permissions(kick_members=True)
async def kick_cmd(
    interaction: discord.Interaction,
    member: discord.Member,
    reason: str = 'Не указана'
):
    """Кикнуть пользователя"""
    try:
        await member.send(f"👢 Вы кикнуты с **{interaction.guild.name}**. Причина: {reason}")
    except: pass

    await member.kick(reason=reason)
    interaction.client.db.add_log(
        guild_id=interaction.guild_id, action_type='kick',
        target_id=member.id, target_name=str(member),
        moderator_id=interaction.user.id,
        moderator_name=str(interaction.user), reason=reason
    )
    await interaction.response.send_message(f"👢 {member} кикнут. Причина: {reason}")


@app_commands.command(name='ban', description='Забанить пользователя')
@app_commands.checks.has_permissions(ban_members=True)
async def ban_cmd(
    interaction: discord.Interaction,
    member: discord.Member,
    reason: str = 'Не указана',
    delete_days: app_commands.Range[int, 0, 7] = 0
):
    """Забанить пользователя"""
    try:
        await member.send(f"🔨 Вы забанены на **{interaction.guild.name}**. Причина: {reason}")
    except: pass

    await member.ban(reason=reason, delete_message_days=delete_days)
    interaction.client.db.add_log(
        guild_id=interaction.guild_id, action_type='ban',
        target_id=member.id, target_name=str(member),
        moderator_id=interaction.user.id,
        moderator_name=str(interaction.user), reason=reason
    )
    await interaction.response.send_message(f"🔨 {member} забанен. Причина: {reason}")


# --- Запуск ---

def run_flask_app(bot, db):
    """Flask API в отдельном потоке"""
    app = create_app(db, bot)
    logger.info(f"🌐 Веб-сервер на http://0.0.0.0:{Config.WEB_PORT}")
    app.run(host='0.0.0.0', port=Config.WEB_PORT, debug=False, use_reloader=False)


def main():
    logger.info("🤖 Discord Moderation Bot")
    db = DatabaseManager(Config.DB_PATH)
    db.connect()
    logger.info("🗄️ База данных инициализирована")

    bot = ModerationBot(db)

    # Flask в отдельном потоке
    flask_thread = threading.Thread(target=run_flask_app, args=(bot, db), daemon=True)
    flask_thread.start()

    # Запуск Discord бота
    logger.info("🚀 Запуск бота...")
    bot.run(Config.BOT_TOKEN)


if __name__ == "__main__":
    main()`;

const webServerCode = `# bot/web_server.py
# Flask API сервер для веб-панели

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
import os


def create_app(db, bot_instance=None) -> Flask:
    """Создание Flask приложения"""
    app = Flask(__name__, static_folder='../dist', static_url_path='')
    CORS(app)
    app.db = db
    app.bot = bot_instance

    # --- Раздача React SPA ---
    @app.route('/')
    def serve_spa():
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/<path:path>')
    def serve_static(path):
        file_path = os.path.join(app.static_folder, path)
        if os.path.exists(file_path):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    # --- API: Статус бота ---
    @app.route('/api/status', methods=['GET'])
    def get_status():
        if not app.bot:
            return jsonify({'online': False})
        return jsonify({
            'online': True,
            'user': str(app.bot.user),
            'user_id': app.bot.user.id,
            'guilds': len(app.bot.guilds),
            'latency': round(app.bot.latency * 1000, 2),
            'uptime': str(datetime.now() - app.bot.start_time) if app.bot.start_time else 'N/A'
        })

    # --- API: Статистика ---
    @app.route('/api/stats', methods=['GET'])
    def get_stats():
        cursor = app.db.conn.cursor()
        cursor.execute("SELECT action_type, COUNT(*) FROM moderation_log GROUP BY action_type")
        counts = {row[0]: row[1] for row in cursor.fetchall()}

        cursor.execute("SELECT COUNT(*) FROM active_timeouts WHERE active=1 AND expires_at > datetime('now')")
        active_timeouts = cursor.fetchone()[0]

        total_members = sum(g.member_count for g in app.bot.guilds) if app.bot else 0

        return jsonify({
            'totalTimeouts': counts.get('timeout', 0),
            'totalKicks': counts.get('kick', 0),
            'totalBans': counts.get('ban', 0),
            'activeTimeouts': active_timeouts,
            'totalMembers': total_members,
            'totalServers': len(app.bot.guilds) if app.bot else 0,
        })

    # --- API: Логи ---
    @app.route('/api/logs', methods=['GET'])
    def get_logs():
        limit = request.args.get('limit', 50, type=int)
        action_type = request.args.get('type')
        guild_id = request.args.get('guild_id', type=int)

        query = "SELECT * FROM moderation_log WHERE 1=1"
        params = []
        if action_type:
            query += " AND action_type = ?"
            params.append(action_type)
        if guild_id:
            query += " AND guild_id = ?"
            params.append(guild_id)
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        cursor = app.db.conn.cursor()
        cursor.execute(query, params)
        columns = [d[0] for d in cursor.description]
        return jsonify([dict(zip(columns, row)) for row in cursor.fetchall()])

    # --- API: Таймаут ---
    @app.route('/api/moderation/timeout', methods=['POST'])
    async def apply_timeout():
        data = request.json
        guild = app.bot.get_guild(data['guild_id'])
        member = guild.get_member(int(data['user_id']))

        await member.timeout(timedelta(seconds=data['duration']), reason=data['reason'])

        app.db.add_log(
            guild_id=data['guild_id'], action_type='timeout',
            target_id=member.id, target_name=str(member),
            moderator_id=int(data['moderator_id']),
            moderator_name='Web Panel',
            reason=data['reason'], duration=data['duration']
        )

        return jsonify({'success': True, 'message': f'Таймаут выдан {member}'})

    # --- API: Кик ---
    @app.route('/api/moderation/kick', methods=['POST'])
    async def apply_kick():
        data = request.json
        guild = app.bot.get_guild(data['guild_id'])
        member = guild.get_member(int(data['user_id']))

        await member.kick(reason=data['reason'])
        app.db.add_log(
            guild_id=data['guild_id'], action_type='kick',
            target_id=member.id, target_name=str(member),
            moderator_id=int(data['moderator_id']),
            moderator_name='Web Panel', reason=data['reason']
        )
        return jsonify({'success': True, 'message': f'{member} кикнут'})

    # --- API: Бан ---
    @app.route('/api/moderation/ban', methods=['POST'])
    async def apply_ban():
        data = request.json
        guild = app.bot.get_guild(data['guild_id'])
        member = guild.get_member(int(data['user_id']))

        await member.ban(reason=data['reason'], delete_message_days=data.get('delete_days', 0))
        app.db.add_log(
            guild_id=data['guild_id'], action_type='ban',
            target_id=member.id, target_name=str(member),
            moderator_id=int(data['moderator_id']),
            moderator_name='Web Panel', reason=data['reason']
        )
        return jsonify({'success': True, 'message': f'{member} забанен'})

    # --- API: Настройки ---
    @app.route('/api/settings/<int:guild_id>', methods=['GET'])
    def get_settings(guild_id):
        settings = app.db.get_guild_settings(guild_id)
        return jsonify(settings or {'guild_id': guild_id, 'custom_prefix': '!'})

    @app.route('/api/settings/<int:guild_id>', methods=['PUT'])
    def update_settings(guild_id):
        data = request.json
        app.db.update_guild_settings(guild_id, **data)
        return jsonify({'success': True})

    # --- API: Серверы ---
    @app.route('/api/guilds', methods=['GET'])
    def get_guilds():
        if not app.bot:
            return jsonify([])
        return jsonify([{
            'id': g.id, 'name': g.name,
            'member_count': g.member_count
        } for g in app.bot.guilds])

    # --- API: Поиск участников ---
    @app.route('/api/guilds/<int:guild_id>/members', methods=['GET'])
    def search_members(guild_id):
        query = request.args.get('q', '')
        guild = app.bot.get_guild(guild_id)
        members = []
        for m in guild.members:
            if query.lower() in str(m).lower():
                members.append({
                    'id': m.id, 'name': str(m),
                    'display_name': m.display_name,
                    'avatar': str(m.avatar.url) if m.avatar else None,
                })
                if len(members) >= 20: break
        return jsonify(members)

    return app`;

const databaseCode = `# bot/database.py
# Модуль работы с базой данных SQLite

import sqlite3
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any


class DatabaseManager:
    """Менеджер базы данных для бота модерации"""

    def __init__(self, db_path: str = "data/bot_database.db"):
        self.db_path = db_path
        self.conn: Optional[sqlite3.Connection] = None

    def connect(self):
        """Подключение к БД и инициализация таблиц"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self._init_tables()

    def _init_tables(self):
        """Создание таблиц"""
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS moderation_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                action_type TEXT NOT NULL,
                target_id INTEGER NOT NULL,
                target_name TEXT NOT NULL,
                moderator_id INTEGER NOT NULL,
                moderator_name TEXT NOT NULL,
                reason TEXT,
                duration_seconds INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME
            );

            CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                user_name TEXT NOT NULL,
                moderator_id INTEGER NOT NULL,
                reason TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                active INTEGER DEFAULT 1
            );

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
            );

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
            );

            CREATE INDEX IF NOT EXISTS idx_log_guild
                ON moderation_log(guild_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_warnings_user
                ON warnings(guild_id, user_id, active);
        """)
        self.conn.commit()

    def add_log(self, guild_id, action_type, target_id, target_name,
                moderator_id, moderator_name, reason=None, duration=None):
        """Добавить запись в лог"""
        expires_at = None
        if duration:
            expires_at = (datetime.now() + timedelta(seconds=duration)).isoformat()
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO moderation_log
            (guild_id, action_type, target_id, target_name, moderator_id,
             moderator_name, reason, duration_seconds, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (guild_id, action_type, target_id, target_name,
              moderator_id, moderator_name, reason, duration, expires_at))
        self.conn.commit()
        return cursor.lastrowid

    def add_warning(self, guild_id, user_id, user_name, moderator_id, reason):
        """Добавить предупреждение"""
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO warnings (guild_id, user_id, user_name, moderator_id, reason)
            VALUES (?, ?, ?, ?, ?)
        """, (guild_id, user_id, user_name, moderator_id, reason))
        self.conn.commit()
        return cursor.lastrowid

    def get_warnings_count(self, guild_id, user_id):
        """Количество активных предупреждений"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) FROM warnings
            WHERE guild_id=? AND user_id=? AND active=1
        """, (guild_id, user_id))
        return cursor.fetchone()[0]

    def get_guild_settings(self, guild_id):
        """Получить настройки сервера"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM guild_settings WHERE guild_id=?", (guild_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def update_guild_settings(self, guild_id, **kwargs):
        """Обновить настройки сервера"""
        cursor = self.conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)", (guild_id,))
        if kwargs:
            set_clause = ", ".join(f"{k}=?" for k in kwargs.keys())
            values = list(kwargs.values()) + [guild_id]
            cursor.execute(f"UPDATE guild_settings SET {set_clause}, updated_at=CURRENT_TIMESTAMP WHERE guild_id=?", values)
        self.conn.commit()

    def close(self):
        if self.conn:
            self.conn.close()`;

const configCode = `# bot/config.py
# Конфигурация бота и веб-сервера

import os
from dataclasses import dataclass


@dataclass
class Config:
    # Discord
    BOT_TOKEN: str = os.getenv("DISCORD_BOT_TOKEN", "YOUR_TOKEN")
    PREFIX: str = os.getenv("BOT_PREFIX", "!")

    # База данных
    DB_PATH: str = os.getenv("DB_PATH", "data/bot_database.db")

    # Веб-сервер (Flask API)
    WEB_PORT: int = int(os.getenv("WEB_PORT", "5000"))
    WEB_HOST: str = os.getenv("WEB_HOST", "0.0.0.0")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")

    # Модерация
    LOG_CHANNEL_ID: int = int(os.getenv("LOG_CHANNEL_ID", "0"))
    MOD_ROLE_ID: int = int(os.getenv("MOD_ROLE_ID", "0"))
    MAX_WARNINGS_BEFORE_BAN: int = int(os.getenv("MAX_WARNINGS", "3"))

    # Пресеты таймаутов (секунды)
    TIMEOUT_PRESETS: dict = {
        '1m': 60, '5m': 300, '10m': 600,
        '1h': 3600, '6h': 21600, '12h': 43200,
        '1d': 86400, '1w': 604800,
    }

    EMBED_COLORS: dict = {
        'timeout': 0xF59E0B, 'kick': 0x3B82F6,
        'ban': 0xEF4444, 'success': 0x22C55E, 'info': 0x5865F2,
    }`;

const requirementsCode = `# requirements.txt
discord.py>=2.3.0
flask>=3.0.0
flask-cors>=4.0.0
python-dotenv>=1.0.0
aiohttp>=3.9.0
colorlog>=6.8.0`;

export default function BotCode() {
  const [activeTab, setActiveTab] = useState<Tab>('main');
  const [copied, setCopied] = useState(false);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'main', label: 'main.py', icon: '🐍' },
    { id: 'web_server', label: 'web_server.py', icon: '🌐' },
    { id: 'database', label: 'database.py', icon: '🗄️' },
    { id: 'config', label: 'config.py', icon: '⚙️' },
    { id: 'requirements', label: 'requirements.txt', icon: '📦' },
  ];

  const getCode = () => {
    switch (activeTab) {
      case 'main': return mainCode;
      case 'web_server': return webServerCode;
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
        <p className="text-text-secondary">Python бэкенд: Discord бот + Flask API + SQLite</p>
      </div>

      {/* Architecture */}
      <div className="bg-bg-card rounded-xl border border-discord/20 p-5 mb-6">
        <h3 className="text-sm font-semibold text-discord-light mb-3">🏗️ Архитектура</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-bg-secondary rounded-lg p-3 text-center">
            <span className="text-2xl block mb-1">🐍</span>
            <p className="text-sm font-medium text-text-primary">Discord Bot</p>
            <p className="text-xs text-text-secondary">Slash-команды, события</p>
          </div>
          <div className="bg-bg-secondary rounded-lg p-3 text-center">
            <span className="text-2xl block mb-1">🌐</span>
            <p className="text-sm font-medium text-text-primary">Flask API</p>
            <p className="text-xs text-text-secondary">REST API для веб-панели</p>
          </div>
          <div className="bg-bg-secondary rounded-lg p-3 text-center">
            <span className="text-2xl block mb-1">🗄️</span>
            <p className="text-sm font-medium text-text-primary">SQLite</p>
            <p className="text-xs text-text-secondary">Логи, настройки, таймауты</p>
          </div>
        </div>
        <div className="mt-3 text-center">
          <p className="text-xs text-text-secondary">
            React фронтенд → Flask API (порт 5000) → Discord Bot + SQLite
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-bg-card rounded-xl border border-white/5 p-5 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3">📖 Быстрый старт</h3>
        <ol className="text-sm text-text-secondary space-y-2">
          <li>1. <code className="bg-bg-secondary px-2 py-0.5 rounded text-discord-light">pip install -r requirements.txt</code></li>
          <li>2. <code className="bg-bg-secondary px-2 py-0.5 rounded text-discord-light">cp .env.example .env</code> — заполните токен</li>
          <li>3. <code className="bg-bg-secondary px-2 py-0.5 rounded text-discord-light">python main.py</code> — запуск бота + API</li>
          <li>4. Откройте <code className="bg-bg-secondary px-2 py-0.5 rounded text-discord-light">http://localhost:5000</code> — веб-панель</li>
        </ol>
      </div>

      {/* Code Viewer */}
      <div className="bg-bg-card rounded-xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-4">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
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
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-discord/20 text-discord-light hover:bg-discord/30 transition-all shrink-0 ml-2"
          >
            {copied ? '✅ Скопировано!' : '📋 Копировать'}
          </button>
        </div>

        <div className="p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
          <pre className="text-sm text-text-primary font-mono leading-relaxed whitespace-pre">
            {getCode()}
          </pre>
        </div>
      </div>
    </div>
  );
}
