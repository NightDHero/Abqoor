# Oracle Console Checklist

Use this checklist to create the VM and networking pieces before you run the app deployment scripts.

## 1. Create The Instance

In Oracle Cloud:

1. Open `Compute` -> `Instances`.
2. Click `Create instance`.
3. Choose an Always Free eligible Ubuntu image.
4. Choose an Always Free eligible shape.
5. Keep the default boot volume unless you have a specific reason to change it.
6. Add your SSH public key during instance creation.
7. Create the instance.

Practical preference for this project:

- Ubuntu image
- a shape that is explicitly marked Always Free eligible

## 2. Confirm Public Access

After the VM is created, note:

- the public IP
- the private IP
- the username Oracle expects for the image, usually `ubuntu`

Typical SSH form:

```bash
ssh -i /path/to/private_key ubuntu@YOUR_PUBLIC_IP
```

## 3. Open Oracle Network Ports

Open the VCN security list or network security group attached to the instance and allow inbound:

- TCP `22` from your admin IP or a trusted source range
- TCP `80` from `0.0.0.0/0`
- TCP `443` from `0.0.0.0/0` when you are ready for HTTPS

If you also use the VM firewall, allow the same ports there.

## 4. Connect To The VM

SSH into the instance and clone the project:

```bash
git clone YOUR_REPO_URL
cd telegrambot
```

If the repo is copied another way, just make sure the deployment scripts exist under `deploy/oracle/`.

## 5. Run The Bootstrap Script

From the repo root:

```bash
sudo bash deploy/oracle/setup-oracle-vm.sh
```

This installs:

- Python runtime and venv
- Nginx
- Node and npm for building `static/admin.js`
- the `abqoor` `systemd` service
- the Nginx reverse proxy config

## 6. Fill The Runtime Environment

Edit:

```bash
sudo nano /etc/abqoor/abqoor.env
```

Set at least:

```env
TELEGRAM_BOT_TOKEN=your-real-bot-token
ADMIN_PASSWORD=your-real-admin-password
ABQOOR_TIMEZONE=Asia/Riyadh
ABQOOR_HOST=127.0.0.1
ABQOOR_PORT=8000
ABQOOR_ENABLE_TELEGRAM=1
ABQOOR_STORAGE_DIR=/var/lib/abqoor
```

## 7. Start And Verify

```bash
sudo systemctl restart abqoor
sudo systemctl status abqoor --no-pager
bash deploy/oracle/check-abqoor.sh
```

The local health endpoint should respond on:

```text
http://127.0.0.1:8000/healthz
```

The site itself should open at:

```text
http://YOUR_PUBLIC_IP/
```

## 8. Move Existing Data If Needed

If you already have production data from this machine, move these into the VM storage root:

- `data/study.db` -> `/var/lib/abqoor/data/study.db`
- `uploads/` -> `/var/lib/abqoor/uploads/`

After copying them, restart the service:

```bash
sudo systemctl restart abqoor
```

## 9. Add A Domain Later

Once the app works on the public IP:

1. Point your domain `A` record to the VM public IP.
2. Wait until DNS resolves correctly.
3. Run:

   ```bash
   sudo bash deploy/oracle/enable-https.sh your-domain.com your-email@example.com
   ```

## 10. Ongoing Operations

Useful commands:

```bash
sudo systemctl status abqoor --no-pager
sudo journalctl -u abqoor -n 100 --no-pager
sudo systemctl restart abqoor
sudo nginx -t
sudo systemctl reload nginx
bash deploy/oracle/check-abqoor.sh
bash deploy/oracle/backup-abqoor.sh
```
