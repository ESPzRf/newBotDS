# 📖 Подробная инструкция по установке на Ubuntu

> Полное руководство по установке и настройке Discord Moderation Bot на Ubuntu Server (22.04 / 24.04)

---

## 📋 Содержание

1. [Подготовка сервера](#1-подготовка-сервера)
2. [Установка Python 3.14](#2-установка-python-314)
3. [Клонирование проекта](#3-клонирование-проекта)
4. [Настройка виртуального окружения](#4-настройка-виртуального-окружения)
5. [Установка зависимостей](#5-установка-зависимостей)
6. [Создание Discord бота](#6-создание-discord-бота)
7. [Настройка конфигурации](#7-настройка-конфигурации)
8. [Первый запуск](#8-первый-запуск)
9. [Настройка автозапуска (systemd)](#9-настройка-автозапуска-systemd)
10. [Настройка веб-панели](#10-настройка-веб-панели)
11. [Настройка Nginx (опционально)](#11-настройка-nginx-опционально)
12. [Обновление бота](#12-обновление-бота)
13. [Решение проблем](#13-решение-проблем)

---

## 1. Подготовка сервера

Подключитесь к серверу по SSH:

```bash
ssh username@your_server_ip
```

Обновите систему:

```bash
sudo apt update && sudo apt upgrade -y
```

Установите необходимые утилиты:

```bash
sudo apt install -y curl wget git build-essential software-properties-common
```

---

## 2. Установка Python 3.14

### Вариант А: Из PPA (рекомендуется)

```bash
# Добавляем репозиторий deadsnakes
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update

# Устанавливаем Python 3.14
sudo apt install -y python3.14 python3.14-venv python3.14-dev python3.14-distutils

# Проверяем версию
python3.14 --version
```

### Вариант Б: Компиляция из исходников

Если PPA недоступен для вашей версии Ubuntu:

```bash
# Устанавливаем зависимости для компиляции
sudo apt install -y build-essential zlib1g-dev libncurses5-dev \
    libgdbm-dev libnss3-dev libssl-dev libreadline-dev \
    libffi-dev libsqlite3-dev libbz2-dev liblzma-dev

# Скачиваем исходный код
cd /tmp
wget https://www.python.org/ftp/python/3.14.0/Python-3.14.0.tgz
tar -xf Python-3.14.0.tgz
cd Python-3.14.0

# Компиляция
./configure --enable-optimizations --with-ensurepip=install
make -j $(nproc)
sudo make altinstall

# Проверяем
python3.14 --version
```

---

## 3. Клонирование проекта

```bash
# Создаём директорию для бота
sudo mkdir -p /opt/discord-bot
cd /opt/discord-bot

# Клонируем репозиторий (замените на ваш URL)
sudo git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Устанавливаем владельца (замените на вашего пользователя)
sudo chown -R $USER:$USER /opt/discord-bot
```

Структура проекта должна выглядеть так:

```
/opt/discord-bot/
├── bot/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── requirements.txt
│   └── .env.example
├── public/
│   └── bot/
│       └── ... (файлы бота)
├── src/
│   └── ... (React компоненты)
├── package.json
└── README.md
```

---

## 4. Настройка виртуального окружения

```bash
# Переходим в папку бота
cd /opt/discord-bot/bot

# Создаём виртуальное окружение
python3.14 -m venv venv

# Активируем его
source venv/bin/activate

# Проверяем, что используется правильный Python
python --version
# Должно вывести: Python 3.14.x

# (Опционально) Деактивация: deactivate
```

---

## 5. Установка зависимостей

```bash
# Убедитесь, что виртуальное окружение активировано
# (должен быть префикс (venv) в терминале)

# Обновляем pip
pip install --upgrade pip setuptools wheel

# Устанавливаем зависимости
pip install -r requirements.txt
```

Проверка установки:

```bash
pip list
```

Должны быть установлены:
- `discord.py` >= 2.3.0
- `python-dotenv` >= 1.0.0
- `flask` >= 3.0.0
- `flask-cors` >= 4.0.0
- `aiohttp` >= 3.9.0

---

## 6. Создание Discord бота

### Шаг 6.1: Создание приложения

1. Перейдите на [Discord Developer Portal](https://discord.com/developers/applications)
2. Нажмите **"New Application"**
3. Введите имя бота (например, "Moderation Bot")
4. Нажмите **"Create"**

### Шаг 6.2: Создание бота

1. В левом меню выберите **"Bot"**
2. Нажмите **"Add Bot"** → **"Yes, do it!"**
3. Под разделом **"Token"** нажмите **"Reset Token"** (или "View Token")
4. **Скопируйте токен** — он понадобится далее!

> ⚠️ **ВАЖНО:** Никогда не публикуйте токен! Храните его в секрете.

### Шаг 6.3: Настройка привилегий

В разделе **"Bot"** включите следующие **Privileged Gateway Intents**:

- ✅ **Presence Intent**
- ✅ **Server Members Intent**
- ✅ **Message Content Intent**

### Шаг 6.4: Настройка прав бота

1. Перейдите в **"OAuth2"** → **"URL Generator"**
2. В **"Scopes"** выберите:
   - ✅ `bot`
   - ✅ `applications.commands`
3. В **"Bot Permissions"** выберите:
   - ✅ **Moderate Members** (для таймаутов)
   - ✅ **Kick Members** (для кика)
   - ✅ **Ban Members** (для бана)
   - ✅ **Send Messages**
   - ✅ **Embed Links**
   - ✅ **Read Message History**
   - ✅ **View Channels**
4. Скопируйте сгенерированную ссылку внизу страницы

### Шаг 6.5: Добавление бота на сервер

1. Откройте скопированную ссылку в браузере
2. Выберите сервер, на который хотите добавить бота
3. Нажмите **"Authorize"**
4. Подтвердите капчу

---

## 7. Настройка конфигурации

```bash
# Переходим в папку бота
cd /opt/discord-bot/bot

# Копируем пример .env файла
cp .env.example .env

# Открываем для редактирования
nano .env
```

Заполните файл:

```env
# Вставьте ваш токен бота (обязательно!)
DISCORD_BOT_TOKEN=ваш_токен_сюда_без_кавычек

# Префикс команд (можно оставить !)
BOT_PREFIX=!

# Путь к базе данных (не меняйте)
DB_PATH=data/bot_database.db

# ID канала для логов (получите в Discord)
# Правый клик на канале → "Copy ID" (нужен режим разработчика)
LOG_CHANNEL_ID=123456789012345678

# ID роли модератора
MOD_ROLE_ID=987654321098765432
```

> 💡 **Как получить ID канала/роли:**
> В Discord: Настройки → Расширенные → включить **"Режим разработчика"**
> Затем правый клик на канале/роли → **"Копировать ID"**

Сохраните файл: `Ctrl+O` → `Enter` → `Ctrl+X`

Создайте директорию для базы данных:

```bash
mkdir -p data
```

---

## 8. Первый запуск

```bash
# Переходим в папку бота
cd /opt/discord-bot/bot

# Активируем виртуальное окружение
source venv/bin/activate

# Запускаем бота
python main.py
```

При успешном запуске вы увидите:

```
2026-01-15 14:00:00 - moderation_bot - INFO - База данных подключена
2026-01-15 14:00:01 - moderation_bot - INFO - Бот инициализирован и готов к работе
2026-01-15 14:00:01 - moderation_bot - INFO - Бот подключён как ModerationBot#1234 (ID: 123456789)
2026-01-15 14:00:01 - moderation_bot - INFO - Подключён к 1 серверам
```

### Проверка работы

В Discord отправьте:
- `/timeout @user 1h Спам` — выдаст таймаут на 1 час
- `/kick @user Нарушение правил` — кикнет пользователя
- `/ban @user Рейд` — забанит пользователя

Остановить бота: `Ctrl+C`

---

## 9. Настройка автозапуска (systemd)

Чтобы бот запускался автоматически при перезагрузке сервера:

```bash
# Создаём systemd service файл
sudo nano /etc/systemd/system/discord-bot.service
```

Вставьте содержимое:

```ini
[Unit]
Description=Discord Moderation Bot
After=network.target

[Service]
Type=simple
User=ваш_пользователь
WorkingDirectory=/opt/discord-bot/bot
ExecStart=/opt/discord-bot/bot/venv/bin/python main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Переменные окружения (альтернатива .env файлу)
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

> ⚠️ Замените `ваш_пользователь` на ваше имя пользователя в Ubuntu (узнать: `whoami`)

Активируем и запускаем сервис:

```bash
# Перезагружаем systemd
sudo systemctl daemon-reload

# Включаем автозапуск
sudo systemctl enable discord-bot

# Запускаем бота
sudo systemctl start discord-bot

# Проверяем статус
sudo systemctl status discord-bot
```

### Управление сервисом

```bash
# Остановить бота
sudo systemctl stop discord-bot

# Перезапустить бота
sudo systemctl restart discord-bot

# Посмотреть логи
sudo journalctl -u discord-bot -f

# Посмотреть последние 50 строк логов
sudo journalctl -u discord-bot -n 50
```

---

## 10. Настройка веб-панели

### Шаг 10.1: Сборка React приложения

```bash
# Переходим в корень проекта
cd /opt/discord-bot

# Устанавливаем Node.js (если не установлен)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверяем
node --version
npm --version

# Устанавливаем зависимости
npm install

# Собираем проект
npm run build
```

После сборки файлы будут в папке `dist/`.

### Шаг 10.2: Простой HTTP сервер (для тестирования)

```bash
# Устанавливаем serve
sudo npm install -g serve

# Запускаем на порту 3000
serve -s dist -l 3000
```

Веб-панель будет доступна по адресу: `http://your_server_ip:3000`

---

## 11. Настройка Nginx (опционально)

Для продакшена рекомендуется использовать Nginx:

```bash
# Устанавливаем Nginx
sudo apt install -y nginx

# Создаём конфигурацию
sudo nano /etc/nginx/sites-available/discord-bot
```

Вставьте:

```nginx
server {
    listen 80;
    server_name your_domain.com;  # или IP сервера

    # Веб-панель
    root /opt/discord-bot/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API бота (если добавите Flask API)
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Активируем конфигурацию:

```bash
# Создаём символическую ссылку
sudo ln -s /etc/nginx/sites-available/discord-bot /etc/nginx/sites-enabled/

# Удаляем дефолтный сайт
sudo rm /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl restart nginx
```

### Настройка SSL (Let's Encrypt)

```bash
# Устанавливаем certbot
sudo apt install -y certbot python3-certbot-nginx

# Получаем SSL сертификат (замените домен)
sudo certbot --nginx -d your_domain.com

# Автопродление
sudo certbot renew --dry-run
```

---

## 12. Обновление бота

```bash
# Переходим в папку проекта
cd /opt/discord-bot

# Останавливаем бота
sudo systemctl stop discord-bot

# Получаем обновления
git pull origin main

# Обновляем зависимости (если изменились)
cd bot
source venv/bin/activate
pip install -r requirements.txt

# Пересобираем веб-панель (если изменилась)
cd ..
npm install
npm run build

# Запускаем бота
sudo systemctl start discord-bot

# Проверяем статус
sudo systemctl status discord-bot
```

---

## 13. Решение проблем

### Ошибка: `python3.14: command not found`

```bash
# Проверьте установку
which python3.14

# Если не найден, добавьте в PATH
echo 'export PATH="/usr/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Ошибка: `discord.errors.LoginFailure`

Токен неверный. Проверьте файл `.env`:

```bash
cat /opt/discord-bot/bot/.env
```

Убедитесь, что токен без кавычек и пробелов.

### Ошибка: `Permission denied` при запуске

```bash
# Дайте права на выполнение
chmod +x /opt/discord-bot/bot/main.py

# Проверьте владельца файлов
sudo chown -R $USER:$USER /opt/discord-bot
```

### Бот не отвечает на команды

1. Убедитесь, что включены **Privileged Intents** в Discord Developer Portal
2. Проверьте, что бот имеет необходимые права на сервере
3. Проверьте, что роль бота находится ВЫШЕ роли пользователя в настройках сервера

### Ошибка: `sqlite3.OperationalError: database is locked`

```bash
# Убедитесь, что бот запущен только в одном экземпляре
ps aux | grep main.py

# Если несколько — убейте лишние
sudo pkill -f "python main.py"

# Перезапустите
sudo systemctl start discord-bot
```

### Веб-панель не открывается

```bash
# Проверьте, что Nginx запущен
sudo systemctl status nginx

# Проверьте файрвол
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Как посмотреть логи бота в реальном времени

```bash
sudo journalctl -u discord-bot -f --no-pager
```

---

## 📝 Полезные команды

```bash
# Быстрый статус бота
sudo systemctl status discord-bot

# Логи за последний час
sudo journalctl -u discord-bot --since "1 hour ago"

# Размер базы данных
ls -lh /opt/discord-bot/bot/data/bot_database.db

# Резервная копия БД
cp /opt/discord-bot/bot/data/bot_database.db ~/backup_$(date +%Y%m%d).db

# Полная очистка и переустановка
sudo systemctl stop discord-bot
cd /opt/discord-bot/bot
rm -rf venv data
python3.14 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
mkdir data
sudo systemctl start discord-bot
```

---

## 🔐 Безопасность

1. **Никогда** не публикуйте файл `.env` — добавьте его в `.gitignore`
2. Используйте файрвол (UFW) для ограничения доступа
3. Регулярно обновляйте систему: `sudo apt update && sudo apt upgrade`
4. Меняйте токен бота при подозрении на утечку
5. Ограничьте доступ к веб-панели через Nginx (базовая авторизация или IP whitelist)

```bash
# Настройка UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## ✅ Чеклист после установки

- [ ] Python 3.14 установлен
- [ ] Проект клонирован
- [ ] Виртуальное окружение создано
- [ ] Зависимости установлены
- [ ] Discord бот создан в Developer Portal
- [ ] Токен вписан в `.env`
- [ ] Privileged Intents включены
- [ ] Бот добавлен на сервер с нужными правами
- [ ] Бот запускается вручную без ошибок
- [ ] Systemd сервис настроен и работает
- [ ] Веб-панель доступна
- [ ] Файрвол настроен

---

**Готово!** 🎉 Ваш бот модерации полностью настроен и работает!
