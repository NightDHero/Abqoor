# Oracle VM Deployment

This folder contains a simple VM deployment path for Oracle Cloud Always Free.

If you want the exact Oracle-side setup order before touching the app, start with [oracle-console-checklist.md](oracle-console-checklist.md).

It keeps the current architecture unchanged:

- Telegram bot stays on long polling
- FastAPI and Telegram still run in the same Python process from `bot.py`
- SQLite remains the primary database
- uploaded files remain on local disk

## Recommended VM Layout

- app checkout: `/opt/abqoor/app`
- environment file: `/etc/abqoor/abqoor.env`
- persistent storage root: `/var/lib/abqoor`
- service name: `abqoor`

Under the storage root, the app will use:

- `/var/lib/abqoor/data/study.db`
- `/var/lib/abqoor/uploads/`

## Files In This Folder

- `abqoor.env.example`: production environment template
- `abqoor.service`: `systemd` service template
- `nginx-abqoor.conf`: reverse-proxy config for Nginx
- `nginx-abqoor-domain.conf`: domain-specific Nginx template for later HTTPS
- `enable-https.sh`: Certbot helper for switching to domain + HTTPS
- `check-abqoor.sh`: local production verification helper
- `backup-abqoor.sh`: backup helper for SQLite data and uploads
- `setup-oracle-vm.sh`: bootstrap script for an Ubuntu-based VM

## Fastest Setup Path

1. Create an Oracle Always Free Ubuntu VM.
2. Open inbound ports `22` and `80` in both the Oracle VCN and the VM firewall if enabled.
3. Clone this repo onto the VM.
4. Run:

   ```bash
   sudo bash deploy/oracle/setup-oracle-vm.sh
   ```

   On the first run, the script installs the service and Nginx config immediately, but it will not start the app service until the environment file contains real secrets instead of the placeholder values.

5. Edit the environment file:

   ```bash
   sudo nano /etc/abqoor/abqoor.env
   ```

6. Fill in at least:

   ```env
   TELEGRAM_BOT_TOKEN=your-real-bot-token
   ADMIN_PASSWORD=your-real-admin-password
   ABQOOR_TIMEZONE=Asia/Riyadh
   ```

7. Restart the app:

   ```bash
   sudo systemctl restart abqoor
   sudo systemctl status abqoor --no-pager
   ```

8. Open the server IP in the browser.

This is the recommended first stage because it proves the app, Telegram polling, SQLite storage, and uploads are all working before you add DNS and certificates.

## Better Production Finish: Add A Domain And HTTPS

After the app works on the server IP, point your domain's DNS `A` record to the VM public IP.

Then run:

```bash
sudo bash deploy/oracle/enable-https.sh your-domain.com your-email@example.com
```

That script:

- installs `certbot` and the Nginx plugin
- rewrites the Nginx site to use your real domain instead of the wildcard host
- requests a Let's Encrypt certificate
- enables automatic HTTP to HTTPS redirection

Before running it, make sure:

- the domain already resolves to the VM public IP
- inbound TCP `443` is open in the Oracle VCN and the VM firewall if used
- Nginx is already serving the app successfully on port `80`

## Useful Commands

```bash
sudo systemctl status abqoor --no-pager
sudo journalctl -u abqoor -n 100 --no-pager
sudo systemctl restart abqoor
sudo nginx -t
sudo systemctl reload nginx
bash deploy/oracle/check-abqoor.sh
bash deploy/oracle/backup-abqoor.sh
```

The app now exposes a simple local health endpoint at:

```text
http://127.0.0.1:8000/healthz
```

Use it to confirm that the service, SQLite path, and uploads directory are all available after startup.

## Updating The App Later

From a fresh repo state on the VM:

```bash
cd /path/to/your/repo
git pull
sudo bash deploy/oracle/setup-oracle-vm.sh
```

Because the persistent storage lives in `/var/lib/abqoor`, app updates do not replace your live SQLite data or uploaded images.

## HTTPS Later

For the first deployment, HTTP on the VM IP is the fastest safe path. After that, moving to a real domain plus HTTPS is the better long-term production setup.
