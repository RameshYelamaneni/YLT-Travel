# ylttravels.com — Transit OS

High-performance travel booking + ERP platform. Migrating from PHP/React CRUD
to a Go + Next.js 15 monorepo designed to outperform redBus and AbhiBus under
heavy concurrent operator traffic.

## Monorepo layout

```
/backend   Go (Gin) — DB pool, GDS aggregator, seat locks, ERP multiplexer
/frontend  Next.js 15 (App Router) — typed API client, Zustand, seat layout
```

## Why this is faster than the legacy stack

1. **Bounded connection pool** — `MaxOpenConns=80` caps simultaneous DB
   sessions regardless of goroutine fan-out, so 50 operators opening
   dashboards cannot storm MySQL.
2. **Concurrent GDS search** — one `/bus/search` fans out to all suppliers in
   parallel via goroutines + channels; latency = slowest supplier, not sum.
3. **In-memory seat locks** — mutex-protected map with 10-min TTL; lock checks
   are nanoseconds, not DB round-trips, so booking rushes don't saturate the
   pool.
4. **Single multiplexed dashboard** — one `/erp/dashboard/sync` replaces 26
   HTTP calls; goroutines load each module concurrently against the shared
   pool, partial failures degrade gracefully.

## Run

### Backend
```bash
cd backend
export DB_DSN="user:pass@tcp(127.0.0.1:3306)/erp?parseTime=true"
go run ./cmd/server
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # proxies /api/* to http://localhost:8080
```
