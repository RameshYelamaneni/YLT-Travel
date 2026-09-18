# YLT Travels — VPS Deployment

Go `ylt-api` is the live backend. Nginx serves the Vite `dist/` frontend and
reverse-proxies `/api` to `127.0.0.1:8080`. PHP is not the production stack.

## Architecture

```
Internet → Nginx (443/SSL) → Go ylt-api (127.0.0.1:8080)   /api/*
                          → static dist/                    /*
                               → MySQL (localhost:3306)
```

## Database (hPanel)

Prefer `DATABASE_URL`, then `MYSQL_DSN`. Encode `@` in the password as `%40`.
Restart the Go app after changing env.

```
u377962510_admin:YOUR_PASSWORD@tcp(localhost:3306)/u377962510_YLT_Travels?parseTime=true&multiStatements=true&charset=utf8mb4
```

```bash
export DATABASE_URL='u377962510_admin:YOUR_PASSWORD@tcp(localhost:3306)/u377962510_YLT_Travels?parseTime=true&multiStatements=true&charset=utf8mb4'
export CORE_ADMIN_USER=CoreAdmin
export CORE_ADMIN_PASS='YOUR_PASSWORD'
export JWT_SECRET='ylt-travels-hostinger-secret-change-me-2026'
export CORS_ORIGIN='*'
export PORT=8080
```

Then `curl -X POST http://127.0.0.1:8080/api/install` once.

## Build

```bash
cd backend
go build -o ylt-api ./cmd/server
./ylt-api

# frontend
npm ci
npm run build   # dist/ → public_html or /var/www/ylttravels/dist
```

Copy `deploy/nginx/ylttravels.conf` and reload nginx. Leave `VITE_API_BASE_URL`
empty. `api.ylttravels.com` stays NXDOMAIN until DNS points at this process.

## systemd

`deploy/systemd/ylttravels-backend.service` — set `ExecStart` to the `ylt-api`
binary and `EnvironmentFile` to the hPanel env file, then:

```bash
systemctl restart ylttravels-backend
```
