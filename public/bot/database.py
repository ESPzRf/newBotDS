# bot/database.py
# Модуль работы с базой данных (вынесенный)

import sqlite3
import os
from datetime import datetime, timedelta
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
            self.conn.close()
