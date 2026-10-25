# bot/web_server.py
# Flask веб-сервер для управления ботом через API

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from database import DatabaseManager
from datetime import datetime
import os


def create_app(db: DatabaseManager, bot_instance=None) -> Flask:
    """Создание Flask приложения"""
    app = Flask(__name__, static_folder='../dist', static_url_path='')
    CORS(app)

    # Привязка к экземпляру бота и БД
    app.db = db
    app.bot = bot_instance

    # ============================================
    # Статические файлы (React SPA)
    # ============================================
    @app.route('/')
    def serve_spa():
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/<path:path>')
    def serve_static(path):
        file_path = os.path.join(app.static_folder, path)
        if os.path.exists(file_path):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    # ============================================
    # API: Статистика
    # ============================================
    @app.route('/api/stats', methods=['GET'])
    def get_stats():
        """Получить статистику модерации"""
        try:
            cursor = app.db.conn.cursor()

            # Общее количество действий по типам
            cursor.execute("""
                SELECT action_type, COUNT(*) as count
                FROM moderation_log
                GROUP BY action_type
            """)
            action_counts = {row[0]: row[1] for row in cursor.fetchall()}

            # Активные таймауты
            cursor.execute("""
                SELECT COUNT(*) FROM active_timeouts
                WHERE active = 1 AND expires_at > datetime('now')
            """)
            active_timeouts = cursor.fetchone()[0]

            # Всего участников (заглушка - в реальности через bot)
            total_members = 0
            if app.bot:
                for guild in app.bot.guilds:
                    total_members += guild.member_count

            stats = {
                'totalTimeouts': action_counts.get('timeout', 0),
                'totalKicks': action_counts.get('kick', 0),
                'totalBans': action_counts.get('ban', 0),
                'activeTimeouts': active_timeouts,
                'totalMembers': total_members,
                'totalServers': len(app.bot.guilds) if app.bot else 0,
            }
            return jsonify(stats)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ============================================
    # API: Логи модерации
    # ============================================
    @app.route('/api/logs', methods=['GET'])
    def get_logs():
        """Получить логи модерации"""
        try:
            limit = request.args.get('limit', 50, type=int)
            action_type = request.args.get('type', None)
            guild_id = request.args.get('guild_id', type=int)

            cursor = app.db.conn.cursor()

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

            cursor.execute(query, params)
            columns = [desc[0] for desc in cursor.description]
            logs = [dict(zip(columns, row)) for row in cursor.fetchall()]

            return jsonify(logs)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ============================================
    # API: Модерация - Таймаут
    # ============================================
    @app.route('/api/moderation/timeout', methods=['POST'])
    async def apply_timeout():
        """Выдать таймаут через API"""
        try:
            data = request.json
            user_id = data.get('user_id')
            duration = data.get('duration')  # в секундах
            reason = data.get('reason', 'Не указана')
            guild_id = data.get('guild_id')
            moderator_id = data.get('moderator_id')

            if not all([user_id, duration, guild_id, moderator_id]):
                return jsonify({'error': 'Не все обязательные поля заполнены'}), 400

            if not app.bot:
                return jsonify({'error': 'Бот не подключён'}), 503

            # Находим сервер и участника
            guild = app.bot.get_guild(guild_id)
            if not guild:
                return jsonify({'error': 'Сервер не найден'}), 404

            member = guild.get_member(int(user_id))
            if not member:
                return jsonify({'error': 'Участник не найден'}), 404

            moderator = guild.get_member(int(moderator_id))
            moderator_name = str(moderator) if moderator else 'Web Panel'

            # Применяем таймаут
            from datetime import timedelta
            await member.timeout(
                timedelta(seconds=duration),
                reason=f"{reason} (через веб-панель)"
            )

            # Логируем в БД
            app.db.add_log(
                guild_id=guild_id,
                action_type='timeout',
                target_id=int(user_id),
                target_name=str(member),
                moderator_id=int(moderator_id),
                moderator_name=moderator_name,
                reason=reason,
                duration=duration
            )

            # Добавляем в активные таймауты
            cursor = app.db.conn.cursor()
            expires_at = (datetime.now() + timedelta(seconds=duration)).isoformat()
            cursor.execute("""
                INSERT INTO active_timeouts
                (guild_id, user_id, user_name, moderator_id, reason, duration_seconds, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (guild_id, int(user_id), str(member), int(moderator_id),
                  reason, duration, expires_at))
            app.db.conn.commit()

            return jsonify({
                'success': True,
                'message': f'Таймаут выдан {member} на {duration} секунд',
                'user': str(member),
                'duration': duration,
                'reason': reason
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ============================================
    # API: Модерация - Кик
    # ============================================
    @app.route('/api/moderation/kick', methods=['POST'])
    async def apply_kick():
        """Кикнуть пользователя через API"""
        try:
            data = request.json
            user_id = data.get('user_id')
            reason = data.get('reason', 'Не указана')
            guild_id = data.get('guild_id')
            moderator_id = data.get('moderator_id')

            if not all([user_id, guild_id, moderator_id]):
                return jsonify({'error': 'Не все обязательные поля заполнены'}), 400

            if not app.bot:
                return jsonify({'error': 'Бот не подключён'}), 503

            guild = app.bot.get_guild(guild_id)
            if not guild:
                return jsonify({'error': 'Сервер не найден'}), 404

            member = guild.get_member(int(user_id))
            if not member:
                return jsonify({'error': 'Участник не найден'}), 404

            moderator = guild.get_member(int(moderator_id))
            moderator_name = str(moderator) if moderator else 'Web Panel'

            # Уведомление в ЛС
            try:
                await member.send(
                    f"👢 Вы были кикнуты с сервера **{guild.name}**\n"
                    f"📝 Причина: {reason}"
                )
            except Exception:
                pass

            # Кик
            await member.kick(reason=f"{reason} (через веб-панель)")

            # Лог
            app.db.add_log(
                guild_id=guild_id,
                action_type='kick',
                target_id=int(user_id),
                target_name=str(member),
                moderator_id=int(moderator_id),
                moderator_name=moderator_name,
                reason=reason
            )

            return jsonify({
                'success': True,
                'message': f'{member} кикнут с сервера',
                'user': str(member),
                'reason': reason
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ============================================
    # API: Модерация - Бан
    # ============================================
    @app.route('/api/moderation/ban', methods=['POST'])
    async def apply_ban():
        """Забанить пользователя через API"""
        try:
            data = request.json
            user_id = data.get('user_id')
            reason = data.get('reason', 'Не указана')
            guild_id = data.get('guild_id')
            moderator_id = data.get('moderator_id')
            delete_days = data.get('delete_days', 0)

            if not all([user_id, guild_id, moderator_id]):
                return jsonify({'error': 'Не все обязательные поля заполнены'}), 400

            if not app.bot:
                return jsonify({'error': 'Бот не подключён'}), 503

            guild = app.bot.get_guild(guild_id)
            if not guild:
                return jsonify({'error': 'Сервер не найден'}), 404

            member = guild.get_member(int(user_id))
            if not member:
                return jsonify({'error': 'Участник не найден'}), 404

            moderator = guild.get_member(int(moderator_id))
            moderator_name = str(moderator) if moderator else 'Web Panel'

            # Уведомление в ЛС
            try:
                await member.send(
                    f"🔨 Вы были забанены на сервере **{guild.name}**\n"
                    f"📝 Причина: {reason}"
                )
            except Exception:
                pass

            # Бан
            await member.ban(
                reason=f"{reason} (через веб-панель)",
                delete_message_days=delete_days
            )

            # Лог
            app.db.add_log(
                guild_id=guild_id,
                action_type='ban',
                target_id=int(user_id),
                target_name=str(member),
                moderator_id=int(moderator_id),
                moderator_name=moderator_name,
                reason=reason
            )

            return jsonify({
                'success': True,
                'message': f'{member} забанен',
                'user': str(member),
                'reason': reason
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ============================================
    # API: Настройки сервера
    # ============================================
    @app.route('/api/settings/<int:guild_id>', methods=['GET'])
    def get_settings(guild_id):
        """Получить настройки сервера"""
        try:
            settings = app.db.get_guild_settings(guild_id)
            if settings:
                return jsonify(settings)
            return jsonify({
                'guild_id': guild_id,
                'log_channel_id': None,
                'mod_role_id': None,
                'auto_mod_enabled': 0,
                'dm_notifications': 1,
                'custom_prefix': '!',
                'max_warnings_before_ban': 3
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/settings/<int:guild_id>', methods=['PUT'])
    def update_settings(guild_id):
        """Обновить настройки сервера"""
        try:
            data = request.json
            allowed_fields = [
                'log_channel_id', 'mod_role_id', 'auto_mod_enabled',
                'dm_notifications', 'custom_prefix', 'max_warnings_before_ban'
            ]
            update_data = {k: v for k, v in data.items() if k in allowed_fields}

            if not update_data:
                return jsonify({'error': 'Нет данных для обновления'}), 400

            app.db.update_guild_settings(guild_id, **update_data)
            return jsonify({'success': True, 'message': 'Настройки обновлены'})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ============================================
    # API: Список серверов бота
    # ============================================
    @app.route('/api/guilds', methods=['GET'])
    def get_guilds():
        """Получить список серверов бота"""
        try:
            if not app.bot:
                return jsonify([])

            guilds = []
            for guild in app.bot.guilds:
                guilds.append({
                    'id': guild.id,
                    'name': guild.name,
                    'member_count': guild.member_count,
                    'icon': str(guild.icon.url) if guild.icon else None
                })
            return jsonify(guilds)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ============================================
    # API: Статус бота
    # ============================================
    @app.route('/api/status', methods=['GET'])
    def get_status():
        """Получить статус бота"""
        try:
            if not app.bot:
                return jsonify({'online': False, 'message': 'Бот не запущен'})

            return jsonify({
                'online': True,
                'user': str(app.bot.user),
                'user_id': app.bot.user.id,
                'guilds': len(app.bot.guilds),
                'latency': round(app.bot.latency * 1000, 2),  # мс
                'uptime': str(datetime.now() - app.bot.start_time) if hasattr(app.bot, 'start_time') else 'N/A'
            })
        except Exception as e:
            return jsonify({'error': str(e)})

    # ============================================
    # API: Поиск пользователей
    # ============================================
    @app.route('/api/guilds/<int:guild_id>/members', methods=['GET'])
    def search_members(guild_id):
        """Поиск участников сервера"""
        try:
            query = request.args.get('q', '')
            if not app.bot:
                return jsonify([])

            guild = app.bot.get_guild(guild_id)
            if not guild:
                return jsonify({'error': 'Сервер не найден'}), 404

            members = []
            for member in guild.members:
                if query.lower() in str(member).lower():
                    members.append({
                        'id': member.id,
                        'name': str(member),
                        'display_name': member.display_name,
                        'avatar': str(member.avatar.url) if member.avatar else None,
                        'roles': [role.name for role in member.roles if role.name != '@everyone']
                    })
                    if len(members) >= 20:
                        break

            return jsonify(members)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return app
