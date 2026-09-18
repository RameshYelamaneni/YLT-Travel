# YLT Travels Go API (`ylt-api`)

This process is the live JSON API. PHP is not sufficient for millions of users
and is not the production architecture.

Static frontend goes on Hostinger `public_html`. Reverse-proxy `/api` to this
binary on `127.0.0.1:8080`. Shared Hostinger cannot run Go — use a VPS.

## Build

```bash
cd backend
go build -o ylt-api ./cmd/server
```

## MySQL DSN (Hostinger official Go format)

`ylt-api` prefers **`DATABASE_URL`**, then **`MYSQL_DSN`**, then localhost
fallbacks. Set this in **hPanel** and **restart the Go app**.

```
u377962510_admin:PASSWORD@tcp(localhost:3306)/u377962510_YLT_Travels?parseTime=true
```

If the password contains `@`, encode it as `%40` (example: `p@ss` → `p%40ss`).
Add `&multiStatements=true&charset=utf8mb4`. Never put this in Vite / the browser.

```bash
export DATABASE_URL='u377962510_admin:YOUR_PASSWORD@tcp(localhost:3306)/u377962510_YLT_Travels?parseTime=true&multiStatements=true&charset=utf8mb4'
export PORT=8080
export CORS_ORIGIN='*'
export CORE_ADMIN_USER=CoreAdmin
export CORE_ADMIN_PASS='YOUR_PASSWORD'
export JWT_SECRET='ylt-travels-hostinger-secret-change-me-2026'
./ylt-api
```

The process binds `0.0.0.0:8080`, opens `sql.Open("mysql", dsn)`, `Ping`s, and
uses a bounded pool (`DB_MAX_OPEN_CONNS=80`). If `DATABASE_URL` / `MYSQL_DSN`
are unset, it tries `localhost`, `127.0.0.1`, and `auth-db1833.hstgr.io` with
the encoded password.

## Install schema (once)

```bash
curl -X POST http://127.0.0.1:8080/api/install
```

Login: **CoreAdmin** with `CORE_ADMIN_PASS` (same password you set for the DB).
Email OTP via SMTP. Set `OTP_DEV=1` only on a local machine. Agent
**agent@ylt.local** / **agent123**.

## Reverse proxy

Nginx:

```
location /api/ {
    proxy_pass http://127.0.0.1:8080;
}
```

Leave `public/config.js` and `VITE_API_BASE_URL` empty so the SPA calls
same-origin `/api`. `api.ylttravels.com` is NXDOMAIN until you point DNS at
this process.

## Routes

`/api/health`, `/api/install`, `/api/auth/otp/send`, `/api/auth/otp/verify`,
`/api/auth/signin`, `/api/auth/signup`, `/api/auth/admin-signin`,
`/api/auth/agent-signin`, `/api/auth/me`, partners, employees, bookings,
hotel-bookings, erp, settings, directors, payments, hotels.
