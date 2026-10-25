# bot/main.py
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

# ============================================
# Логирование
# ============================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('bot.log', encoding='utf-8')
    ]
)
logger = logging.getLogger('moderation_bot')


# ============================================
# Класс бота
# ============================================
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
        # Синхронизация slash-команд
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
        logger.info(f"✅ Бот подключён как {self.user} (ID: {self.user.id})")
        logger.info(f"📡 Подключён к {len(self.guilds)} серверам")

        for guild in self.guilds:
            logger.info(f"  └─ {guild.name} ({guild.member_count} участников)")
            # Инициализация настроек сервера в БД
            self.db.update_guild_settings(guild.id)

        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name=f"за порядком | {Config.PREFIX}help"
            )
        )

    async def on_command_error(self, ctx, error):
        """Обработка ошибок"""
        if isinstance(error, commands.MissingPermissions):
            await ctx.send("❌ У вас нет прав для выполнения этой команды!")
        elif isinstance(error, commands.MemberNotFound):
            await ctx.send("❌ Пользователь не найден!")
        elif isinstance(error, commands.CommandOnCooldown):
            await ctx.send(f"⏳ Подождите {error.retry_after:.1f} сек.")
        else:
            logger.error(f"Ошибка команды: {error}")
            await ctx.send(f"❌ Произошла ошибка: {error}")

    async def on_member_join(self, member):
        """Событие входа участника"""
        logger.info(f"👋 {member} присоединился к {member.guild.name}")

    async def on_member_remove(self, member):
        """Событие выхода участника"""
        logger.info(f"👋 {member} покинул {member.guild.name}")


# ============================================
# Slash-команды
# ============================================

@app_commands.command(name='timeout', description='Выдать таймаут пользователю')
@app_commands.describe(
    member='Кого таймаутить',
    duration='Длительность (1m, 5m, 10m, 1h, 6h, 12h, 1d, 1w)',
    reason='Причина таймаута'
)
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
        presets = ', '.join(Config.TIMEOUT_PRESETS.keys())
        await interaction.response.send_message(
            f"❌ Неверная длительность! Доступные: {presets}",
            ephemeral=True
        )
        return

    try:
        await member.timeout(
            timedelta(seconds=seconds),
            reason=f"{reason} (Модератор: {interaction.user})"
        )

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

        # Уведомление в ЛС
        try:
            await member.send(
                f"⏱️ Вы получили таймаут на сервере **{interaction.guild.name}**\n"
                f"📝 Причина: {reason}\n"
                f"⏰ Длительность: {duration}"
            )
        except discord.Forbidden:
            pass

        embed = discord.Embed(
            title="⏱️ Таймаут выдан",
            description=f"{member.mention} получил таймаут на **{duration}**",
            color=Config.EMBED_COLORS['timeout']
        )
        embed.add_field(name="Причина", value=reason, inline=False)
        embed.add_field(name="Модератор", value=str(interaction.user), inline=True)
        embed.set_thumbnail(url=member.avatar.url if member.avatar else None)
        await interaction.response.send_message(embed=embed)

    except discord.Forbidden:
        await interaction.response.send_message(
            "❌ У меня нет прав для выдачи таймаута этому пользователю!",
            ephemeral=True
        )


@app_commands.command(name='kick', description='Кикнуть пользователя с сервера')
@app_commands.describe(
    member='Кого кикнуть',
    reason='Причина кика'
)
@app_commands.checks.has_permissions(kick_members=True)
async def kick_cmd(
    interaction: discord.Interaction,
    member: discord.Member,
    reason: str = 'Не указана'
):
    """Кикнуть пользователя"""
    try:
        # Уведомление в ЛС
        try:
            await member.send(
                f"👢 Вы были кикнуты с сервера **{interaction.guild.name}**\n"
                f"📝 Причина: {reason}"
            )
        except discord.Forbidden:
            pass

        await member.kick(reason=f"{reason} (Модератор: {interaction.user})")

        # Лог
        bot = interaction.client
        bot.db.add_log(
            guild_id=interaction.guild_id,
            action_type='kick',
            target_id=member.id,
            target_name=str(member),
            moderator_id=interaction.user.id,
            moderator_name=str(interaction.user),
            reason=reason
        )

        embed = discord.Embed(
            title="👢 Пользователь кикнут",
            description=f"**{member}** кикнут с сервера",
            color=Config.EMBED_COLORS['kick']
        )
        embed.add_field(name="Причина", value=reason, inline=False)
        embed.add_field(name="Модератор", value=str(interaction.user), inline=True)
        await interaction.response.send_message(embed=embed)

    except discord.Forbidden:
        await interaction.response.send_message(
            "❌ У меня нет прав для кика этого пользователя!",
            ephemeral=True
        )


@app_commands.command(name='ban', description='Забанить пользователя на сервере')
@app_commands.describe(
    member='Кого забанить',
    reason='Причина бана',
    delete_days='Удалить сообщения за N дней (0-7)'
)
@app_commands.checks.has_permissions(ban_members=True)
async def ban_cmd(
    interaction: discord.Interaction,
    member: discord.Member,
    reason: str = 'Не указана',
    delete_days: app_commands.Range[int, 0, 7] = 0
):
    """Забанить пользователя"""
    try:
        # Уведомление в ЛС
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

        # Лог
        bot = interaction.client
        bot.db.add_log(
            guild_id=interaction.guild_id,
            action_type='ban',
            target_id=member.id,
            target_name=str(member),
            moderator_id=interaction.user.id,
            moderator_name=str(interaction.user),
            reason=reason
        )

        embed = discord.Embed(
            title="🔨 Пользователь забанен",
            description=f"**{member}** забанен на сервере",
            color=Config.EMBED_COLORS['ban']
        )
        embed.add_field(name="Причина", value=reason, inline=False)
        embed.add_field(name="Модератор", value=str(interaction.user), inline=True)
        if delete_days > 0:
            embed.add_field(name="Удалено сообщений за", value=f"{delete_days} дн.", inline=True)
        await interaction.response.send_message(embed=embed)

    except discord.Forbidden:
        await interaction.response.send_message(
            "❌ У меня нет прав для бана этого пользователя!",
            ephemeral=True
        )


@app_commands.command(name='warn', description='Выдать предупреждение')
@app_commands.describe(
    member='Кому выдать предупреждение',
    reason='Причина предупреждения'
)
@app_commands.checks.has_permissions(moderate_members=True)
async def warn_cmd(
    interaction: discord.Interaction,
    member: discord.Member,
    reason: str
):
    """Выдать предупреждение"""
    bot = interaction.client

    # Добавляем предупреждение в БД
    bot.db.add_warning(
        guild_id=interaction.guild_id,
        user_id=member.id,
        user_name=str(member),
        moderator_id=interaction.user.id,
        reason=reason
    )

    # Проверяем количество предупреждений
    warnings_count = bot.db.get_warnings_count(interaction.guild_id, member.id)

    # Уведомление в ЛС
    try:
        await member.send(
            f"⚠️ Вы получили предупреждение на сервере **{interaction.guild.name}**\n"
            f"📝 Причина: {reason}\n"
            f"📊 Предупреждений: {warnings_count}"
        )
    except discord.Forbidden:
        pass

    embed = discord.Embed(
        title="⚠️ Предупреждение",
        description=f"{member.mention} получил предупреждение",
        color=Config.EMBED_COLORS['warning'] if 'warning' in Config.EMBED_COLORS else 0xF59E0B
    )
    embed.add_field(name="Причина", value=reason, inline=False)
    embed.add_field(name="Всего предупреждений", value=str(warnings_count), inline=True)
    await interaction.response.send_message(embed=embed)

    # Авто-бан при достижении лимита
    settings = bot.db.get_guild_settings(interaction.guild_id)
    max_warnings = settings.get('max_warnings_before_ban', 3) if settings else 3
    if warnings_count >= max_warnings:
        try:
            await member.ban(reason=f"Автоматический бан: {max_warnings} предупреждений")
            await interaction.followup.send(
                f"🔨 {member.mention} автоматически забанен ({max_warnings} предупреждений)"
            )
        except discord.Forbidden:
            pass


@app_commands.command(name='warnings', description='Проверить предупреждения пользователя')
@app_commands.describe(member='Пользователь для проверки')
async def warnings_cmd(
    interaction: discord.Interaction,
    member: discord.Member
):
    """Проверить предупреждения"""
    bot = interaction.client
    count = bot.db.get_warnings_count(interaction.guild_id, member.id)

    embed = discord.Embed(
        title=f"📋 Предупреждения {member.display_name}",
        color=Config.EMBED_COLORS['info']
    )
    embed.add_field(name="Активных предупреждений", value=str(count), inline=False)
    embed.set_thumbnail(url=member.avatar.url if member.avatar else None)
    await interaction.response.send_message(embed=embed)


@app_commands.command(name='unban', description='Снять бан с пользователя')
@app_commands.describe(user_id='ID пользователя для разбана')
@app_commands.checks.has_permissions(ban_members=True)
async def unban_cmd(
    interaction: discord.Interaction,
    user_id: str
):
    """Снять бан"""
    try:
        user = await interaction.client.fetch_user(int(user_id))
        await interaction.guild.unban(user, reason=f"Разбан: {interaction.user}")

        bot = interaction.client
        bot.db.add_log(
            guild_id=interaction.guild_id,
            action_type='unban',
            target_id=user.id,
            target_name=str(user),
            moderator_id=interaction.user.id,
            moderator_name=str(interaction.user),
            reason='Разбан через команду'
        )

        embed = discord.Embed(
            title="✅ Бан снят",
            description=f"**{user}** разбанен",
            color=Config.EMBED_COLORS['success']
        )
        await interaction.response.send_message(embed=embed)

    except discord.NotFound:
        await interaction.response.send_message("❌ Пользователь не найден или не забанен", ephemeral=True)
    except discord.Forbidden:
        await interaction.response.send_message("❌ У меня нет прав для разбана", ephemeral=True)


@app_commands.command(name='untimeout', description='Снять таймаут с пользователя')
@app_commands.describe(member='С кого снять таймаут')
@app_commands.checks.has_permissions(moderate_members=True)
async def untimeout_cmd(
    interaction: discord.Interaction,
    member: discord.Member
):
    """Снять таймаут"""
    try:
        await member.timeout(None, reason=f"Снят модератором: {interaction.user}")

        bot = interaction.client
        bot.db.add_log(
            guild_id=interaction.guild_id,
            action_type='untimeout',
            target_id=member.id,
            target_name=str(member),
            moderator_id=interaction.user.id,
            moderator_name=str(interaction.user),
            reason='Таймаут снят'
        )

        embed = discord.Embed(
            title="✅ Таймаут снят",
            description=f"Таймаут с {member.mention} снят",
            color=Config.EMBED_COLORS['success']
        )
        await interaction.response.send_message(embed=embed)

    except discord.Forbidden:
        await interaction.response.send_message("❌ У меня нет прав", ephemeral=True)


# ============================================
# Flask API в отдельном потоке
# ============================================
def run_flask_app(bot_instance: ModerationBot, db: DatabaseManager):
    """Запуск Flask сервера в отдельном потоке"""
    app = create_app(db, bot_instance)
    logger.info(f"🌐 Веб-сервер запущен на http://0.0.0.0:{Config.WEB_PORT}")
    app.run(
        host='0.0.0.0',
        port=Config.WEB_PORT,
        debug=False,
        use_reloader=False
    )


# ============================================
# Главная функция
# ============================================
def main():
    """Точка входа в приложение"""
    logger.info("=" * 50)
    logger.info("🤖 Discord Moderation Bot")
    logger.info(f"📌 Python версия: {sys.version}")
    logger.info("=" * 50)

    # Инициализация БД
    db = DatabaseManager(Config.DB_PATH)
    db.connect()
    logger.info("🗄️ База данных инициализирована")

    # Создание бота
    bot = ModerationBot(db)

    # Запуск Flask в отдельном потоке
    flask_thread = threading.Thread(
        target=run_flask_app,
        args=(bot, db),
        daemon=True
    )
    flask_thread.start()
    logger.info(f"🌐 Flask API запущен на порту {Config.WEB_PORT}")

    # Обработка graceful shutdown
    def signal_handler(sig, frame):
        logger.info("🛑 Получен сигнал остановки...")
        db.close()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Запуск Discord бота
    logger.info("🚀 Запуск Discord бота...")
    bot.run(Config.BOT_TOKEN)


if __name__ == "__main__":
    main()
