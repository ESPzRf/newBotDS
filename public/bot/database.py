# bot/database.py
# Модуль работы с базой данных SQLite

import sqlite3
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any


class DatabaseManager:
    """Менеджер базы данных для бота модерации"""

    def __init__(self, db_path: str = "data/bot_database.db"):
        self.db_path = db_path
        self._ensure_data_dir()
        self.conn: Optional[sqlite3.Connection] = None

    def _ensure_data_dir(self):
        """Создание директории для данных"""
        db_dir = os.path.dirname(self.db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

    def connect(self):
        """Подключение к БД и инициализация таблиц"""
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        # Включаем WAL режим для лучшей производительности
        self.conn.execute("PRAGMA journal_mode=WAL")
        self._init_tables()

    def _init_tables(self):
        """Создание всех необходимых таблиц"""
        cursor = self.conn.cursor()

        # Таблица логов модерации
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS moderation_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                action_type TEXT NOT NULL CHECK(action_type IN (
                    'timeout', 'kick', 'ban', 'unban', 'untimeout', 'warn'
                )),
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

        # Таблица активных таймаутов
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

        # Таблица веб-сессий (для авторизации в панели)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS web_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                user_name TEXT NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                active INTEGER DEFAULT 1
            )
        """)

        # Индексы для ускорения запросов
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_moderation_log_guild
            ON moderation_log(guild_id, created_at)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_warnings_user
            ON warnings(guild_id, user_id, active)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_active_timeouts_expires
            ON active_timeouts(expires_at, active)
        """)

        self.conn.commit()

    # ==========================================
    # Методы для работы с логами
    # ==========================================

    def add_log(
        self,
        guild_id: int,
        action_type: str,
        target_id: int,
        target_name: str,
        moderator_id: int,
        moderator_name: str,
        reason: str = None,
        duration: int = None
    ) -> int:
        """Добавить запись в лог модерации"""
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

    def get_logs(
        self,
        guild_id: int = None,
        limit: int = 50,
        action_type: str = None
    ) -> List[Dict[str, Any]]:
        """Получить логи модерации"""
        cursor = self.conn.cursor()
        query = "SELECT * FROM moderation_log WHERE 1=1"
        params = []

        if guild_id:
            query += " AND guild_id = ?"
            params.append(guild_id)
        if action_type:
            query += " AND action_type = ?"
            params.append(action_type)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def get_stats(self, guild_id: int = None) -> Dict[str, int]:
        """Получить статистику действий"""
        cursor = self.conn.cursor()
        query = "SELECT action_type, COUNT(*) as count FROM moderation_log"
        params = []

        if guild_id:
            query += " WHERE guild_id = ?"
            params.append(guild_id)

        query += " GROUP BY action_type"
        cursor.execute(query, params)

        return {row[0]: row[1] for row in cursor.fetchall()}

    # ==========================================
    # Методы для работы с предупреждениями
    # ==========================================

    def add_warning(
        self,
        guild_id: int,
        user_id: int,
        user_name: str,
        moderator_id: int,
        reason: str
    ) -> int:
        """Добавить предупреждение пользователю"""
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO warnings (guild_id, user_id, user_name, moderator_id, reason)
            VALUES (?, ?, ?, ?, ?)
        """, (guild_id, user_id, user_name, moderator_id, reason))
        self.conn.commit()
        return cursor.lastrowid

    def get_warnings_count(self, guild_id: int, user_id: int) -> int:
        """Получить количество активных предупреждений пользователя"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) FROM warnings
            WHERE guild_id = ? AND user_id = ? AND active = 1
        """, (guild_id, user_id))
        return cursor.fetchone()[0]

    def get_user_warnings(self, guild_id: int, user_id: int) -> List[Dict]:
        """Получить все предупреждения пользователя"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT * FROM warnings
            WHERE guild_id = ? AND user_id = ? AND active = 1
            ORDER BY created_at DESC
        """, (guild_id, user_id))
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def remove_warning(self, warning_id: int) -> bool:
        """Деактивировать предупреждение"""
        cursor = self.conn.cursor()
        cursor.execute(
            "UPDATE warnings SET active = 0 WHERE id = ?",
            (warning_id,)
        )
        self.conn.commit()
        return cursor.rowcount > 0

    # ==========================================
    # Методы для настроек сервера
    # ==========================================

    def get_guild_settings(self, guild_id: int) -> Optional[Dict[str, Any]]:
        """Получить настройки сервера"""
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT * FROM guild_settings WHERE guild_id = ?",
            (guild_id,)
        )
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None

    def update_guild_settings(self, guild_id: int, **kwargs) -> bool:
        """Обновить настройки сервера"""
        cursor = self.conn.cursor()

        # Создаём запись если её нет
        cursor.execute("""
            INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)
        """, (guild_id,))

        if kwargs:
            set_clause = ", ".join(f"{k} = ?" for k in kwargs.keys())
            values = list(kwargs.values()) + [guild_id]
            cursor.execute(f"""
                UPDATE guild_settings
                SET {set_clause}, updated_at = CURRENT_TIMESTAMP
                WHERE guild_id = ?
            """, values)

        self.conn.commit()
        return True

    # ==========================================
    # Методы для активных таймаутов
    # ==========================================

    def get_active_timeouts(self, guild_id: int = None) -> List[Dict]:
        """Получить активные таймауты"""
        cursor = self.conn.cursor()
        query = """
            SELECT * FROM active_timeouts
            WHERE active = 1 AND expires_at > datetime('now')
        """
        params = []

        if guild_id:
            query += " AND guild_id = ?"
            params.append(guild_id)

        query += " ORDER BY expires_at ASC"
        cursor.execute(query, params)
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def deactivate_timeout(self, user_id: int, guild_id: int):
        """Деактивировать таймаут"""
        cursor = self.conn.cursor()
        cursor.execute("""
            UPDATE active_timeouts SET active = 0
            WHERE user_id = ? AND guild_id = ? AND active = 1
        """, (user_id, guild_id))
        self.conn.commit()

    # ==========================================
    # Служебные методы
    # ==========================================

    def cleanup_expired_timeouts(self):
        """Очистка истёкших таймаутов"""
        cursor = self.conn.cursor()
        cursor.execute("""
            UPDATE active_timeouts SET active = 0
            WHERE expires_at <= datetime('now') AND active = 1
        """)
        self.conn.commit()
        return cursor.rowcount

    def get_db_size(self) -> str:
        """Получить размер базы данных"""
        try:
            size = os.path.getsize(self.db_path)
            if size < 1024:
                return f"{size} B"
            elif size < 1024 * 1024:
                return f"{size / 1024:.1f} KB"
            else:
                return f"{size / (1024 * 1024):.1f} MB"
        except OSError:
            return "0 B"

    def get_table_count(self) -> int:
        """Получить количество таблиц"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) FROM sqlite_master
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        """)
        return cursor.fetchone()[0]

    def close(self):
        """Закрытие соединения с БД"""
        if self.conn:
            self.conn.close()
            self.conn = None
