# YLT Travels — VPS Deployment Guide

Complete deployment setup for Hostinger VPS (Ubuntu 22.04+). Go backend + Next.js 15
frontend, backed by MySQL on the VPS.

## Architecture

```
Internet → Nginx (443/SSL) → Go backend (127.0.0.1:8080)   /api/*
                          → Next.js (127.0.0.1:3000)        /*
                               → MySQL (127.0.0.1:3306)
```

## One-Command Deploy

```bash
# SSH into your VPS, clone the repo, then:
sudo bash deploy/deploy.sh
```

The script installs Go, Node.js, Nginx, certbot, MySQL client, builds both backend
and frontend, imports the MySQL schema, sets up systemd services, and issues SSL
certs via Let's Encrypt.

## Database

MySQL connection string:
```
mysql://superadmin:Ramesh@538783@127.0.0.1:3306/global_bookings
```

The schema (39 tables) is in `deploy/schema.sql`. The deploy script imports it
automatically. To import manually:

```bash
mysql -usuperadmin -p'Ramesh@538783' -h127.0.0.1 -e "CREATE DATABASE IF NOT EXISTS global_bookings CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -usuperadmin -p'Ramesh@538783' -h127.0.0.1 global_bookings < deploy/schema.sql
```

## Manual Setup

### 1. Install Dependencies

```bash
apt update && apt install -y build-essential nginx git ufw mysql-client
# Install Go 1.23+
wget https://go.dev/dl/go1.23.4.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.23.4.linux-amd64.tar.gz
# Install Node 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 2. Build the Backend

```bash
cd /var/www/ylttravels/backend
go mod tidy
go build -o bin/server ./cmd/server
```

### 3. Build the Frontend

```bash
cd /var/www/ylttravels/frontend
npm ci --legacy-peer-deps
npm run build
```

### 4. Configure Environment

```bash
cp backend/.env.template /var/www/ylttravels/.env
# Edit .env — fill in DATABASE_URL, JWT_SECRET, SMTP credentials
```

### 5. Install Services

```bash
cp deploy/systemd/*.service /etc/systemd/system/
cp deploy/nginx/ylttravels.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/ylttravels /etc/nginx/sites-enabled/
systemctl daemon-reload
systemctl enable --now ylttravels-backend ylttravels-frontend
nginx -t && systemctl reload nginx
```

### 6. SSL Certificate

```bash
certbot --nginx -d ylttravels.com -d www.ylttravels.com
```

## Managing Services

```bash
systemctl status ylttravels-backend ylttravels-frontend
systemctl restart ylttravels-backend
journalctl -u ylttravels-backend -f    # tail backend logs
```

## File Structure

```
deploy/
├── deploy.sh                          # One-command VPS deployment
├── schema.sql                         # MySQL schema (39 tables)
├── nginx/ylttravels.conf              # Nginx reverse proxy config
└── systemd/
    ├── ylttravels-backend.service     # Go backend service
    └── ylttravels-frontend.service    # Next.js service
```
