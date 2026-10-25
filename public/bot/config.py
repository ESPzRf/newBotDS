# bot/config.py
# Конфигурация бота и веб-сервера

import os
from dataclasses import dataclass


@dataclass
class Config:
    """Конфигурация бота"""

    # ==========================================
    # Discord
    # ==========================================

    # Токен бота (из переменных окружения)
    BOT_TOKEN: str = os.getenv("DISCORD_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")

    # Префикс команд (для legacy команд)
    PREFIX: str = os.getenv("BOT_PREFIX", "!")

    # ==========================================
    # База данных
    # ==========================================

    # Путь к базе данных SQLite
    DB_PATH: str = os.getenv("DB_PATH", "data/bot_database.db")

    # ==========================================
    # Веб-сервер (Flask API)
    # ==========================================

    # Порт веб-сервера
    WEB_PORT: int = int(os.getenv("WEB_PORT", "5000"))

    # Хост веб-сервера
    WEB_HOST: str = os.getenv("WEB_HOST", "0.0.0.0")

    # Секретный ключ для Flask (сессии)
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")

    # Разрешённые CORS origins
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "*").split(",")

    # ==========================================
    # Настройки модерации
    # ==========================================

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

    # Максимум предупреждений до авто-бана
    MAX_WARNINGS_BEFORE_BAN: int = int(os.getenv("MAX_WARNINGS", "3"))

    # ==========================================
    # Цвета embed-сообщений
    # ==========================================
    EMBED_COLORS: dict = {
        'timeout': 0xF59E0B,   # Жёлтый/оранжевый
        'kick': 0x3B82F6,      # Синий
        'ban': 0xEF4444,       # Красный
        'success': 0x22C55E,   # Зелёный
        'info': 0x5865F2,      # Discord blue
        'warning': 0xF59E0B,   # Жёлтый
    }
