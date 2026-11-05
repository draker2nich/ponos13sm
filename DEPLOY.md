# Деплой на Vercel + домен tubric.tech

Итоговая схема на одном проекте Vercel:

| URL | Что там |
| --- | --- |
| `https://tubric.tech/` | лендинг |
| `https://tubric.tech/app/` | Telegram Mini App |
| `https://tubric.tech/api/*` | API, webhook бота, cron |

Нужно: аккаунт Vercel (Hobby бесплатный), GitHub-репозиторий, токен бота, доступ к namefy.

---

## 1. Накатить патч

```bash
git clone https://github.com/draker2nich/ponos13sm.git && cd ponos13sm
git checkout -b refactor/vercel
git apply --whitespace=nowarn /путь/к/ponos13sm-refactor-vercel.patch
git add -A
git commit -m "Refactor and move to Vercel"
git push -u origin refactor/vercel
```

Проверить на ветке, потом влить в `main`.

## 2. Секреты

Сгенерировать две случайные строки (можно этой командой два раза):

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Одна пойдёт в `WEBHOOK_SECRET`, другая в `CRON_SECRET`.

## 3. Проект на Vercel

1. vercel.com → **Add New → Project** → импортировать репозиторий `ponos13sm`.
2. Framework Preset, Build/Install/Output — **ничего не трогать**, всё задано в `vercel.json`.
3. **Environment Variables** (для Production и Preview):

   | Name | Value |
   | --- | --- |
   | `BOT_TOKEN` | токен от @BotFather |
   | `BOT_USERNAME` | `ponos13sm_bot` (без @) |
   | `WEBHOOK_SECRET` | первая строка из шага 2 |
   | `CRON_SECRET` | вторая строка из шага 2 |
   | `MINI_APP_URL` | `https://tubric.tech/app/` |

4. **Deploy**. Первый деплой может упасть на запросах к БД — это нормально, база ещё не подключена.

## 4. База данных (Neon)

1. В проекте: **Storage → Create Database → Neon (Serverless Postgres)** → регион поближе (Frankfurt) → подключить к проекту.
   Vercel сам добавит `DATABASE_URL` и соседние переменные.
2. Накатить схему со своего компьютера:

   ```bash
   python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements-dev.txt
   npm i -g vercel && vercel link && vercel env pull .env --environment=production   # переменные прода в .env
   alembic upgrade head
   ```

   Дальше миграции применяются сами при каждом production-деплое (`scripts/vercel-build.sh`),
   вручную это нужно только для первой настройки.

   Если переносите старую базу с Heroku: сначала `pg_dump` → `pg_restore` в Neon, затем
   `alembic stamp 0001 && alembic upgrade head` (ревизия 0001 совпадает со старой схемой).

3. **Deployments → … → Redeploy**, чтобы функция подхватила `DATABASE_URL`.

Проверка: `https://<проект>.vercel.app/api/health` → `{"status":"ok"}`.

## 5. Домен tubric.tech (namefy)

Nameservers остаются как есть (`ns1–ns4.dns.host`), почту это не затронет.

1. Vercel → проект → **Settings → Domains** → добавить `tubric.tech`, затем `www.tubric.tech`
   (Vercel предложит редирект `www` → `tubric.tech`, соглашайтесь).
2. Vercel покажет, какие записи нужны. Обычно это:

   | Тип | Host / Name | Value |
   | --- | --- | --- |
   | A | `@` | IP, который показывает Vercel (`216.198.79.1` или `76.76.21.21`) |
   | CNAME | `www` | значение из Vercel (`…vercel-dns…com` или `cname.vercel-dns.com`) |

   Всегда берите значения из панели Vercel — они могут отличаться для вашего проекта.
3. namefy → **tubric.tech → DNS → DNS Records**:
   - удалить существующие `A`, `AAAA` и `CNAME` для `@` и `www` (парковка/форвардинг namefy), иначе они будут конфликтовать;
   - если включён **Domain Forwarding** — выключить;
   - добавить две записи из таблицы выше, TTL — минимальный или по умолчанию;
   - `MX`/`TXT` для почты не трогать.
4. Подождать, пока в Vercel у доменов появится **Valid Configuration** (обычно минуты, иногда до пары часов). SSL выпускается автоматически.

DNSSEC при таком способе можно не трогать. Если когда-нибудь будете переносить nameservers на Vercel — DNSSEC в namefy нужно сначала выключить.

## 6. Бот

1. **Выключить старый бот на Heroku** (worker с polling), иначе он будет конфликтовать с webhook.
2. Открыть в браузере (подставив свои значения):

   ```
   https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://tubric.tech/api/telegram/webhook&secret_token=<WEBHOOK_SECRET>&drop_pending_updates=true
   ```

   Ответ должен быть `{"ok":true,...}`. Проверка: `https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo` — `last_error_message` должен отсутствовать.
3. @BotFather → **/mybots → бот → Bot Settings → Menu Button** → URL `https://tubric.tech/app/`
   (кнопка открытия приложения рядом с полем ввода).

## 7. Проверить всё

- `https://tubric.tech/` — лендинг, `https://tubric.tech/app/` в браузере покажет «Не получилось связаться» — это нормально, вне Telegram нет подписи.
- В Telegram: `/start` → «Открыть питомца» → завести питомца → вкладка «Вдвоём» → пригласить друга.
- Vercel → **Settings → Cron Jobs**: два задания (`/api/cron/hunger`, `/api/cron/streak`), их можно запустить вручную кнопкой **Run**.

## Если что-то не работает

| Симптом | Где смотреть |
| --- | --- |
| Бот молчит | `getWebhookInfo` → `last_error_message`; 403 значит не совпал `WEBHOOK_SECRET` |
| В приложении «Не получилось связаться» | Vercel → Logs; 401 — не тот `BOT_TOKEN`, 500 — обычно не подключена БД или не накатаны миграции |
| Домен не валидируется | в namefy остались старые A/CNAME или включён Forwarding |
| После локального `python -m backend.bot` прод-бот замолчал | polling удаляет webhook — повторить шаг 6.2 |

Ограничения Hobby: cron максимум раз в сутки (время ±59 минут), план только для некоммерческих проектов.
Если понадобятся частые напоминания — Pro или внешний планировщик, дёргающий `/api/cron/*` с заголовком
`Authorization: Bearer <CRON_SECRET>`.
