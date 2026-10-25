# bot/main.py
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
            f"⏱️ **Таймаут** выдан {member.mention} на **{duration}**\n"
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
                f"⏱️ Вы получили таймаут на сервере **{interaction.guild.name}**\n"
                f"📝 Причина: {reason}\n"
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
                f"👢 Вы были кикнуты с сервера **{interaction.guild.name}**\n"
                f"📝 Причина: {reason}"
            )
        except discord.Forbidden:
            pass

        await member.kick(reason=f"{reason} (Модератор: {interaction.user})")
        await interaction.response.send_message(
            f"👢 **{member}** был кикнут с сервера\n"
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
                f"🔨 Вы были забанены на сервере **{interaction.guild.name}**\n"
                f"📝 Причина: {reason}"
            )
        except discord.Forbidden:
            pass

        await member.ban(
            reason=f"{reason} (Модератор: {interaction.user})",
            delete_message_days=delete_days
        )
        await interaction.response.send_message(
            f"🔨 **{member}** был забанен\n"
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
    main()
