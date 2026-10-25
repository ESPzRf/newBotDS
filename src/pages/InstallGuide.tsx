import { useState } from 'react';

interface Step {
  id: number;
  title: string;
  icon: string;
  content: React.ReactNode;
}

export default function InstallGuide() {
  const [activeStep, setActiveStep] = useState(1);
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBlock(id);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  const CodeBlock = ({ code, id, lang = 'bash' }: { code: string; id: string; lang?: string }) => (
    <div className="relative group my-3">
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-0.5 rounded">{lang}</span>
        <button
          onClick={() => copyToClipboard(code, id)}
          className="text-xs bg-discord/20 text-discord-light px-2 py-1 rounded hover:bg-discord/30 transition-all"
        >
          {copiedBlock === id ? '✅' : '📋'}
        </button>
      </div>
      <pre className="bg-bg-primary border border-white/10 rounded-lg p-4 pt-10 overflow-x-auto text-sm font-mono text-text-primary leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );

  const steps: Step[] = [
    {
      id: 1,
      title: 'Подготовка сервера',
      icon: '🖥️',
      content: (
        <div className="space-y-4">
          <p className="text-text-secondary">Подключитесь к серверу по SSH и обновите систему:</p>
          <CodeBlock id="ssh" code={`ssh username@your_server_ip`} />
          <CodeBlock id="update" code={`sudo apt update && sudo apt upgrade -y`} />
          <CodeBlock id="utils" code={`sudo apt install -y curl wget git build-essential software-properties-common`} />
        </div>
      ),
    },
    {
      id: 2,
      title: 'Установка Python 3.14',
      icon: '🐍',
      content: (
        <div className="space-y-4">
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
            <p className="text-sm text-warning">💡 Рекомендуется установка из PPA deadsnakes</p>
          </div>
          <h4 className="text-sm font-semibold text-text-primary">Вариант А: Из PPA (рекомендуется)</h4>
          <CodeBlock id="ppa" code={`# Добавляем репозиторий deadsnakes
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update

# Устанавливаем Python 3.14
sudo apt install -y python3.14 python3.14-venv python3.14-dev

# Проверяем
python3.14 --version`} />

          <h4 className="text-sm font-semibold text-text-primary mt-6">Вариант Б: Компиляция из исходников</h4>
          <CodeBlock id="compile" code={`# Зависимости для компиляции
sudo apt install -y build-essential zlib1g-dev libncurses5-dev \\
    libgdbm-dev libnss3-dev libssl-dev libreadline-dev \\
    libffi-dev libsqlite3-dev libbz2-dev liblzma-dev

# Скачиваем и компилируем
cd /tmp
wget https://www.python.org/ftp/python/3.14.0/Python-3.14.0.tgz
tar -xf Python-3.14.0.tgz
cd Python-3.14.0
./configure --enable-optimizations --with-ensurepip=install
make -j $(nproc)
sudo make altinstall`} />
        </div>
      ),
    },
    {
      id: 3,
      title: 'Клонирование проекта',
      icon: '📥',
      content: (
        <div className="space-y-4">
          <CodeBlock id="clone" code={`# Создаём директорию
sudo mkdir -p /opt/discord-bot
cd /opt/discord-bot

# Клонируем репозиторий (замените URL на ваш)
sudo git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Устанавливаем владельца
sudo chown -R $USER:$USER /opt/discord-bot`} />
          <div className="bg-info/10 border border-info/20 rounded-lg p-3">
            <p className="text-sm text-info">💡 Замените <code className="bg-bg-secondary px-1 rounded">YOUR_USERNAME/YOUR_REPO</code> на ваш репозиторий</p>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      title: 'Виртуальное окружение',
      icon: '📦',
      content: (
        <div className="space-y-4">
          <CodeBlock id="venv" code={`# Переходим в папку бота
cd /opt/discord-bot/bot

# Создаём виртуальное окружение
python3.14 -m venv venv

# Активируем
source venv/bin/activate

# Проверяем
python --version  # Должно быть: Python 3.14.x`} />
          <div className="bg-success/10 border border-success/20 rounded-lg p-3">
            <p className="text-sm text-success">✅ После активации в терминале появится префикс <code className="bg-bg-secondary px-1 rounded">(venv)</code></p>
          </div>
        </div>
      ),
    },
    {
      id: 5,
      title: 'Установка зависимостей',
      icon: '📚',
      content: (
        <div className="space-y-4">
          <CodeBlock id="deps" code={`# Обновляем pip
pip install --upgrade pip setuptools wheel

# Устанавливаем зависимости
pip install -r requirements.txt

# Проверяем
pip list`} />
          <p className="text-sm text-text-secondary">Должны быть установлены: <code className="bg-bg-secondary px-1 rounded">discord.py</code>, <code className="bg-bg-secondary px-1 rounded">flask</code>, <code className="bg-bg-secondary px-1 rounded">python-dotenv</code>, <code className="bg-bg-secondary px-1 rounded">aiohttp</code></p>
        </div>
      ),
    },
    {
      id: 6,
      title: 'Создание Discord бота',
      icon: '🤖',
      content: (
        <div className="space-y-4">
          <div className="bg-bg-secondary rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-discord-light">Шаг 1: Создание приложения</h4>
            <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
              <li>Перейдите на <a href="https://discord.com/developers/applications" target="_blank" className="text-discord-light hover:underline">Discord Developer Portal</a></li>
              <li>Нажмите <strong>"New Application"</strong></li>
              <li>Введите имя бота и нажмите <strong>"Create"</strong></li>
            </ol>
          </div>

          <div className="bg-bg-secondary rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-discord-light">Шаг 2: Создание бота и получение токена</h4>
            <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
              <li>В меню выберите <strong>"Bot"</strong></li>
              <li>Нажмите <strong>"Add Bot"</strong> → <strong>"Yes, do it!"</strong></li>
              <li>Нажмите <strong>"Reset Token"</strong> и скопируйте токен</li>
            </ol>
            <div className="bg-danger/10 border border-danger/20 rounded-lg p-2 mt-2">
              <p className="text-xs text-danger">⚠️ НИКОГДА не публикуйте токен! Храните его в секрете!</p>
            </div>
          </div>

          <div className="bg-bg-secondary rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-discord-light">Шаг 3: Включение Privileged Intents</h4>
            <p className="text-sm text-text-secondary">В разделе <strong>"Bot"</strong> включите:</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-success/10 border border-success/20 rounded-full text-xs text-success">✅ Presence Intent</span>
              <span className="px-3 py-1 bg-success/10 border border-success/20 rounded-full text-xs text-success">✅ Server Members Intent</span>
              <span className="px-3 py-1 bg-success/10 border border-success/20 rounded-full text-xs text-success">✅ Message Content Intent</span>
            </div>
          </div>

          <div className="bg-bg-secondary rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-discord-light">Шаг 4: Добавление бота на сервер</h4>
            <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
              <li>Перейдите в <strong>"OAuth2"</strong> → <strong>"URL Generator"</strong></li>
              <li>В Scopes выберите: <code className="bg-bg-primary px-1 rounded">bot</code>, <code className="bg-bg-primary px-1 rounded">applications.commands</code></li>
              <li>В Bot Permissions выберите нужные права</li>
              <li>Откройте сгенерированную ссылку и добавьте бота на сервер</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 7,
      title: 'Настройка .env',
      icon: '🔧',
      content: (
        <div className="space-y-4">
          <CodeBlock id="env-setup" code={`cd /opt/discord-bot/bot
cp .env.example .env
nano .env`} />
          <p className="text-sm text-text-secondary">Заполните файл:</p>
          <CodeBlock id="env-content" code={`# Токен бота (обязательно!)
DISCORD_BOT_TOKEN=ваш_токен_сюда

# Префикс команд
BOT_PREFIX=!

# Путь к базе данных
DB_PATH=data/bot_database.db

# ID канала для логов
LOG_CHANNEL_ID=0

# ID роли модератора
MOD_ROLE_ID=0`} lang="env" />
          <div className="bg-info/10 border border-info/20 rounded-lg p-3">
            <p className="text-sm text-info">💡 <strong>Как получить ID:</strong> Discord → Настройки → Расширенные → Режим разработчика. Затем правый клик → "Копировать ID"</p>
          </div>
          <CodeBlock id="mkdir-data" code={`mkdir -p data`} />
        </div>
      ),
    },
    {
      id: 8,
      title: 'Первый запуск',
      icon: '🚀',
      content: (
        <div className="space-y-4">
          <CodeBlock id="first-run" code={`cd /opt/discord-bot/bot
source venv/bin/activate
python main.py`} />
          <p className="text-sm text-text-secondary">При успешном запуске увидите:</p>
          <CodeBlock id="output" code={`🤖 Discord Moderation Bot
🗄️ База данных инициализирована
🌐 Flask API запущен на порту 5000
🚀 Запуск Discord бота...
✅ Бот подключён как ModerationBot#1234
📡 Подключён к 1 серверам`} lang="log" />
          <div className="bg-info/10 border border-info/20 rounded-lg p-3">
            <p className="text-sm text-info">💡 Теперь доступны два интерфейса:</p>
            <ul className="text-xs text-text-secondary mt-1 space-y-1 list-disc list-inside">
              <li><strong>Discord</strong> — slash-команды: /timeout, /kick, /ban</li>
              <li><strong>Веб-панель</strong> — <code className="bg-bg-secondary px-1 rounded">http://your_server:5000</code></li>
            </ul>
          </div>
          <p className="text-sm text-text-secondary">Остановить: <code className="bg-bg-secondary px-1 rounded">Ctrl+C</code></p>
        </div>
      ),
    },
    {
      id: 9,
      title: 'Автозапуск (systemd)',
      icon: '⚡',
      content: (
        <div className="space-y-4">
          <CodeBlock id="systemd-create" code={`sudo nano /etc/systemd/system/discord-bot.service`} />
          <p className="text-sm text-text-secondary">Вставьте содержимое:</p>
          <CodeBlock id="systemd-content" code={`[Unit]
Description=Discord Moderation Bot + Flask API
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
Environment=PYTHONUNBUFFERED=1
# Переменные окружения (или используйте .env файл)
Environment=DISCORD_BOT_TOKEN=your_token
Environment=WEB_PORT=5000

[Install]
WantedBy=multi-user.target`} lang="ini" />
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
            <p className="text-sm text-warning">⚠️ Замените <code className="bg-bg-secondary px-1 rounded">ваш_пользователь</code> на ваше имя (узнать: <code className="bg-bg-secondary px-1 rounded">whoami</code>)</p>
          </div>
          <CodeBlock id="systemd-enable" code={`# Активируем сервис
sudo systemctl daemon-reload
sudo systemctl enable discord-bot
sudo systemctl start discord-bot

# Проверяем статус
sudo systemctl status discord-bot`} />
          <div className="bg-bg-secondary rounded-lg p-4">
            <h4 className="text-sm font-semibold text-text-primary mb-2">Полезные команды:</h4>
            <CodeBlock id="systemd-cmds" code={`# Остановить
sudo systemctl stop discord-bot

# Перезапустить
sudo systemctl restart discord-bot

# Логи в реальном времени
sudo journalctl -u discord-bot -f`} />
          </div>
        </div>
      ),
    },
    {
      id: 10,
      title: 'Веб-панель (Nginx)',
      icon: '🌐',
      content: (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-text-primary">Сборка React приложения</h4>
          <CodeBlock id="node-install" code={`# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Сборка
cd /opt/discord-bot
npm install
npm run build`} />

          <h4 className="text-sm font-semibold text-text-primary mt-4">Настройка Nginx</h4>
          <CodeBlock id="nginx-install" code={`sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/discord-bot`} />
          <CodeBlock id="nginx-config" code={`server {
    listen 80;
    server_name your_domain.com;

    root /opt/discord-bot/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}`} lang="nginx" />
          <CodeBlock id="nginx-enable" code={`sudo ln -s /etc/nginx/sites-available/discord-bot /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx`} />

          <h4 className="text-sm font-semibold text-text-primary mt-4">SSL сертификат (Let's Encrypt)</h4>
          <CodeBlock id="ssl" code={`sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com`} />
        </div>
      ),
    },
    {
      id: 11,
      title: 'Безопасность и файрвол',
      icon: '🔐',
      content: (
        <div className="space-y-4">
          <CodeBlock id="ufw" code={`# Настройка UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Проверка
sudo ufw status`} />
          <div className="bg-bg-secondary rounded-lg p-4">
            <h4 className="text-sm font-semibold text-text-primary mb-2">🔑 Рекомендации:</h4>
            <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
              <li>Никогда не публикуйте файл <code className="bg-bg-primary px-1 rounded">.env</code></li>
              <li>Добавьте <code className="bg-bg-primary px-1 rounded">.env</code> в <code className="bg-bg-primary px-1 rounded">.gitignore</code></li>
              <li>Регулярно обновляйте систему</li>
              <li>Меняйте токен при подозрении на утечку</li>
              <li>Делайте бэкапы базы данных</li>
            </ul>
          </div>
          <CodeBlock id="backup" code={`# Резервная копия БД
cp /opt/discord-bot/bot/data/bot_database.db ~/backup_$(date +%Y%m%d).db`} />
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">🐧 Установка на Ubuntu</h1>
        <p className="text-text-secondary">Пошаговая инструкция по установке бота на Ubuntu Server 22.04 / 24.04</p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-secondary">Шаг {activeStep} из {steps.length}</span>
          <span className="text-sm text-discord-light">{Math.round((activeStep / steps.length) * 100)}%</span>
        </div>
        <div className="w-full bg-bg-secondary rounded-full h-2">
          <div
            className="bg-discord h-2 rounded-full transition-all duration-300"
            style={{ width: `${(activeStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Steps Navigation */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-bg-card rounded-xl border border-white/5 p-3 lg:sticky lg:top-6">
            <h3 className="text-sm font-semibold text-text-primary px-2 py-2 mb-1">Навигация</h3>
            <div className="space-y-1">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                    activeStep === step.id
                      ? 'bg-discord/20 text-discord-light border border-discord/30'
                      : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                  }`}
                >
                  <span>{step.icon}</span>
                  <span className="truncate">{step.title}</span>
                  {step.id < activeStep && <span className="ml-auto text-success text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-bg-card rounded-xl border border-white/5 p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{steps[activeStep - 1].icon}</span>
              <div>
                <span className="text-xs text-text-secondary">Шаг {activeStep}</span>
                <h2 className="text-xl font-bold text-text-primary">{steps[activeStep - 1].title}</h2>
              </div>
            </div>

            <div className="mt-4">
              {steps[activeStep - 1].content}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/5">
              <button
                onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
                disabled={activeStep === 1}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-bg-secondary text-text-secondary hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ← Назад
              </button>
              <span className="text-xs text-text-secondary">{activeStep} / {steps.length}</span>
              <button
                onClick={() => setActiveStep(Math.min(steps.length, activeStep + 1))}
                disabled={activeStep === steps.length}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-discord text-white hover:bg-discord-dark disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Далее →
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/INSTALL_UBUNTU.md"
              download
              className="bg-bg-card rounded-xl border border-white/5 p-4 hover:border-discord/30 transition-all group"
            >
              <span className="text-2xl block mb-2">📄</span>
              <h3 className="text-sm font-semibold text-text-primary group-hover:text-discord-light transition-colors">Скачать инструкцию</h3>
              <p className="text-xs text-text-secondary mt-1">Markdown файл для офлайн-доступа</p>
            </a>
            <a
              href="/bot/main.py"
              download
              className="bg-bg-card rounded-xl border border-white/5 p-4 hover:border-discord/30 transition-all group"
            >
              <span className="text-2xl block mb-2">🐍</span>
              <h3 className="text-sm font-semibold text-text-primary group-hover:text-discord-light transition-colors">Скачать main.py</h3>
              <p className="text-xs text-text-secondary mt-1">Основной файл бота</p>
            </a>
            <a
              href="/bot/requirements.txt"
              download
              className="bg-bg-card rounded-xl border border-white/5 p-4 hover:border-discord/30 transition-all group"
            >
              <span className="text-2xl block mb-2">📦</span>
              <h3 className="text-sm font-semibold text-text-primary group-hover:text-discord-light transition-colors">Скачать requirements</h3>
              <p className="text-xs text-text-secondary mt-1">Файл зависимостей</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
