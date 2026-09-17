#!/usr/bin/env bash
# YLT Travels — VPS deployment script for Hostinger VPS (Ubuntu 22.04+)
# Run as root (or sudo) on a fresh VPS. Installs Go, Node, Nginx, MySQL client,
# clones the project, builds backend + frontend, sets up systemd services,
# imports the MySQL schema, and issues SSL certs via certbot.
#
# Usage: bash deploy/deploy.sh
set -euo pipefail

DOMAIN="ylttravels.com"
APP_DIR="/var/www/ylttravels"
APP_USER="ylt"
GO_VERSION="1.23.4"
NODE_VERSION="20"

echo "=== YLT Travels VPS Deployment ==="

# --- 1. System packages ---
echo "[1/9] Installing system packages..."
apt-get update -qq
apt-get install -y -qq build-essential nginx certbot python3-certbot-nginx git ufw fail2ban mysql-client

# --- 2. Firewall ---
echo "[2/9] Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

# --- 3. App user ---
echo "[3/9] Creating app user..."
if ! id -u "$APP_USER" &>/dev/null; then
    useradd --system --create-home --home-dir "/home/$APP_USER" --shell /bin/bash "$APP_USER"
fi

# --- 4. Install Go ---
echo "[4/9] Installing Go ${GO_VERSION}..."
if ! command -v go &>/dev/null; then
    wget -q "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -O /tmp/go.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf /tmp/go.tar.gz
    rm /tmp/go.tar.gz
    echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile.d/go.sh
    export PATH=$PATH:/usr/local/go/bin
fi

# --- 5. Install Node.js ---
echo "[5/9] Installing Node.js ${NODE_VERSION}..."
if ! command -v node &>/dev/null || [[ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt "$NODE_VERSION" ]]; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
    apt-get install -y -qq nodejs
fi

# --- 6. App directory ---
echo "[6/9] Setting up app directory..."
mkdir -p "$APP_DIR"/{backend,frontend,uploads,bin}
cp -r . "$APP_DIR/repo/"
cd "$APP_DIR/repo"

# Build Go backend
echo "  Building Go backend..."
cd backend
/usr/local/go/bin/go mod tidy
/usr/local/go/bin/go build -o "$APP_DIR/backend/bin/server" ./cmd/server
cd ..

# Build Next.js frontend
echo "  Building Next.js frontend..."
cd frontend
npm ci --legacy-peer-deps
npm run build
cd ..

# Copy env file
if [ -f "$APP_DIR/.env" ]; then
    echo "  .env already exists, keeping it."
else
    if [ -f "$APP_DIR/repo/.env.production" ]; then
        cp "$APP_DIR/repo/.env.production" "$APP_DIR/.env"
        echo "  Copied .env.production → $APP_DIR/.env (EDIT IT NOW!)"
    fi
fi

# Permissions
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# --- 7. Import MySQL schema ---
echo "[7/9] Importing MySQL schema..."
if [ -f "$APP_DIR/.env" ]; then
    DB_USER=$(grep -E '^DB_USER=' "$APP_DIR/.env" | cut -d= -f2)
    DB_PASS=$(grep -E '^DB_PASSWORD=' "$APP_DIR/.env" | cut -d= -f2)
    DB_NAME=$(grep -E '^DB_NAME=' "$APP_DIR/.env" | cut -d= -f2)
    DB_HOST=$(grep -E '^DB_HOST=' "$APP_DIR/.env" | cut -d= -f2)
fi
DB_USER="${DB_USER:-superadmin}"
DB_PASS="${DB_PASS:-}"
DB_NAME="${DB_NAME:-global_bookings}"
DB_HOST="${DB_HOST:-127.0.0.1}"

mysql -u"$DB_USER" -p"$DB_PASS" -h"$DB_HOST" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u"$DB_USER" -p"$DB_PASS" -h"$DB_HOST" "$DB_NAME" < "$APP_DIR/repo/deploy/schema.sql"
echo "  Schema imported into $DB_NAME"

# --- 8. Systemd services ---
echo "[8/9] Installing systemd services..."
cp deploy/systemd/ylttravels-backend.service /etc/systemd/system/
cp deploy/systemd/ylttravels-frontend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable ylttravels-backend ylttravels-frontend
systemctl restart ylttravels-backend ylttravels-frontend

# --- 9. Nginx + SSL ---
echo "[9/9] Configuring Nginx + SSL..."
cp deploy/nginx/ylttravels.conf /etc/nginx/sites-available/ylttravels
ln -sf /etc/nginx/sites-available/ylttravels /etc/nginx/sites-enabled/ylttravels
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# SSL via certbot
echo "Issuing SSL certificate for ${DOMAIN}..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --redirect || \
    echo "WARNING: certbot failed. Run manually: certbot --nginx -d $DOMAIN -d www.$DOMAIN"

echo ""
echo "=== Deployment complete ==="
echo "Backend:  http://127.0.0.1:8080/api/v1/health"
echo "Frontend: http://127.0.0.1:3000"
echo "Public:   https://${DOMAIN}"
echo ""
echo "Check status:  systemctl status ylttravels-backend ylttravels-frontend"
echo "Check logs:    journalctl -u ylttravels-backend -f"
echo ""
echo "IMPORTANT: Edit $APP_DIR/.env with your MySQL + SMTP credentials, then:"
echo "  systemctl restart ylttravels-backend ylttravels-frontend"
