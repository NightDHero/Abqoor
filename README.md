# Abqoor Study Bot

This project runs a private Telegram study bot and an admin website in the same Python process.

## What It Does

- The admin dashboard lets you upload question images into a reusable question bank.
- The admin dashboard can also import a PDF where each page is one question, and it can optionally match those pages to answers from an Excel or CSV file using a starting question number.
- Each student starts the bot in a private chat and builds a personal study plan in Arabic.
- The bot stores each student's chosen weekdays, picked reminder time, typed question count, and optional review day.
- On scheduled days, the bot creates a personal session in DM with a question image, a Telegram quiz poll for the answer, and previous/next/question-map navigation.
- Wrong answers are saved into a personal mistake bank and can be reviewed later on a chosen study day or manually at any time from the mistake-bank screen.
- After a user has opened the bot once, reminders can continue automatically at the saved times without needing `/start` again.
- Questions are assigned per student, so members do not all receive the same set.

## Student Flow

1. The student opens the bot privately and sends `/start`, or sends any normal text after the chat is open.
2. The bot asks for study days, then the student picks the reminder time from buttons and types the daily question count.
3. If the student chose more than one study day, the bot can reserve one of those days for mistake-bank review.
4. On each active day, the student receives a private session with a question image, a quiz poll answer, plus previous, next, and a question map.
5. Wrong answers are stored in a personal bank and can be checked any time with `/mistakes`, and the student can start an optional review session directly from there.

Telegram limitation:

- The bot cannot start a private chat by itself with a person who has never opened it before.
- Each student must open the bot once and press Start at least once before Telegram allows automatic reminders.
- After that first contact, the saved reminders continue automatically at the chosen times while the plan is active.
- The bot cannot detect a user simply logging out of Telegram.
- The closest reliable signal in a private bot chat is when the user blocks the bot or the bot becomes unavailable in that private chat; the bot now detects that via Telegram membership updates and disables reminders for that account.

Supported commands:

- `/start` to onboard or show the current plan
- `/plan` to edit the study plan
- `/today` to start or resume today's session manually
- `/mistakes` to inspect the personal wrong-answer bank and optionally start a review session from it
- `/reset` to erase the student's saved plan, sessions, and mistake bank and start over
- `/pause` to stop automatic reminders
- `/resume` to re-enable reminders

## Channel Entry Link

If you want something inside the public channel that sends people into the bot, post a normal Telegram link or button that points to the bot deep link:

```text
https://t.me/Abqoor_practice_bot?start=from_channel
```

When a user taps that link, Telegram opens the bot and passes the `from_channel` start payload so the bot knows they came from the channel.

## Storage

- Active app data lives in `data/study.db`.
- Uploaded images live in `uploads/`.
- If `data/questions.json` exists and the SQLite question bank is empty, legacy questions are imported automatically on first startup.

Excel answer-sheet note:

- The sheet should include one column for question numbers and one column for the correct answer.
- Supported answer-sheet formats are `XLSX`, `XLSM`, and `CSV`.
- Accepted answer values are `A/B/C/D`, Arabic `أ/ب/ج/د`, or numeric `1/2/3/4`.

## Local Setup

1. Create a `.env` file based on `.env.example`.
2. Set at least these values:

   ```env
   TELEGRAM_BOT_TOKEN=your-bot-token
   ADMIN_PASSWORD=your-admin-password
   ABQOOR_TIMEZONE=Asia/Riyadh
   ```

3. Install Python packages:

   ```powershell
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   ```

4. Install frontend dependencies if needed:

   ```powershell
   npm install
   ```

5. Build the browser bundle after frontend edits:

   ```powershell
   npm run build
   ```

6. Start the full app:

   ```powershell
   .\.venv\Scripts\python.exe bot.py
   ```

7. Open `http://127.0.0.1:8000` in your browser.

## Local Admin-Only Mode

If the live bot is already polling elsewhere and you only want to validate the admin dashboard locally, disable Telegram startup for that run:

```powershell
$env:ABQOOR_ENABLE_TELEGRAM='0'
.\.venv\Scripts\python.exe bot.py
```

This keeps FastAPI and the admin website running locally without starting Telegram polling.

## Deploy On Oracle Cloud Always Free

This project is a better fit for an always-on VM than for a sleeping free web tier, because it needs:

- continuous Telegram polling
- persistent SQLite storage
- persistent uploaded image files

Recommended path for this repo:

- Ubuntu VM first
- HTTP on the server IP first
- add a domain and HTTPS second, after the app is already running

The repo now includes Oracle VM deployment assets under `deploy/oracle/README.md`.

For the Oracle-side console steps themselves, use `deploy/oracle/oracle-console-checklist.md` first.

Recommended production layout on the VM:

- app code in `/opt/abqoor/app`
- runtime env file in `/etc/abqoor/abqoor.env`
- persistent data in `/var/lib/abqoor`

Quick path on an Ubuntu VM after cloning the repo:

```bash
sudo bash deploy/oracle/setup-oracle-vm.sh
sudo nano /etc/abqoor/abqoor.env
sudo systemctl restart abqoor
sudo systemctl status abqoor --no-pager
```

The setup script:

- installs Python, Nginx, Node, and rsync
- installs `curl` for local health checks
- copies the app into `/opt/abqoor/app`
- creates the virtual environment and installs Python packages
- builds `static/admin.js`
- installs a `systemd` service for the bot
- installs an `nginx` reverse-proxy config

On the first run, if `/etc/abqoor/abqoor.env` still contains placeholder values, the script will install everything but will wait for you to fill in the real secrets before starting the service.

Before opening the app publicly, make sure your Oracle VCN security rules allow at least:

- TCP `22` for SSH
- TCP `80` for HTTP
- TCP `443` later if you add HTTPS

If you later attach a domain, the repo also includes an HTTPS helper:

```bash
sudo bash deploy/oracle/enable-https.sh your-domain.com your-email@example.com
```

That script:

- installs Certbot for Nginx
- switches the Nginx site from wildcard host mode to your real domain
- requests the certificate and enables HTTPS redirect

Useful production helpers are also included:

```bash
bash deploy/oracle/check-abqoor.sh
bash deploy/oracle/backup-abqoor.sh
```

- `check-abqoor.sh` checks `systemd`, `nginx`, and `http://127.0.0.1:8000/healthz`
- `backup-abqoor.sh` creates a consistent SQLite backup and an archive of `uploads/`

## Deploy On Fly.io

The repo includes a `Dockerfile`, `.dockerignore`, and `fly.toml` for Fly.io deployment.

Deployment notes:

- The bot uses long polling, so the machine must remain running.
- `data/study.db` and `uploads/` must live on the mounted Fly volume.
- Set secrets with Fly secrets rather than baking them into the image.

Typical deployment flow:

1. Log in to Fly:

   ```powershell
   flyctl auth login
   ```

2. Create the app if needed:

   ```powershell
   flyctl apps create abqoor-admin-fly
   ```

3. Create the persistent volume in the same region as `fly.toml`:

   ```powershell
   flyctl volumes create abqoor_data --region fra --size 1 --app abqoor-admin-fly
   ```

4. Set runtime secrets:

   ```powershell
   flyctl secrets set TELEGRAM_BOT_TOKEN=your-token ADMIN_PASSWORD=your-password ABQOOR_TIMEZONE=Asia/Riyadh --app abqoor-admin-fly
   ```

5. Deploy:

   ```powershell
   flyctl deploy
   ```

6. Open the live app:

   ```powershell
   flyctl open
   ```

If you already have old question assets locally, copy `data/` and `uploads/` into the mounted Fly volume before first production use.

## Deploy On Render

This repo can deploy on Render as a single Docker web service.

Render notes:

- choose `Web Service`, not `Static Site`
- use a paid plan because the app needs a persistent disk
- mount the persistent disk at `/data` so SQLite and uploads survive restarts
- keep the service at one instance because the app uses SQLite on a single attached disk

The repo root now includes `render.yaml` for a Blueprint-based setup.

Typical deployment flow:

1. In Render, choose `New` -> `Blueprint` and select this repo.
2. Review the generated web service settings from `render.yaml`.
3. Provide secret values when prompted for `TELEGRAM_BOT_TOKEN` and `ADMIN_PASSWORD`.
4. Keep `ABQOOR_STORAGE_DIR=/data`, `ABQOOR_PORT=10000`, and `ABQOOR_HOST=0.0.0.0`.
5. Deploy and wait for the health check on `/healthz` to pass.

If you prefer the manual form instead of Blueprints, create a Docker-based web service with the same disk mount and environment values.

## Frontend

- The admin website is plain HTML, CSS, and TypeScript.
- `static/admin.ts` is the editable source.
- `static/admin.js` is the compiled browser bundle loaded by the dashboard.
