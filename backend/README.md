# YLT Travels — Transit OS Backend

Complete Go backend replacing all PHP endpoints from ylttravels.com.

## Architecture

```
cmd/server/main.go              # entry point: init pool, JWT, all deps, routes
internal/
  config/config.go               # env-based configuration (no hardcoded secrets)
  models/models.go               # domain structs for all modules
  repositories/                   # data-access layer (QueryContext, sql.Null*)
    auth_settings.go             # auth, users, employees, partners, OTP, settings, email templates
    bookings_etc.go              # bookings, directors, offers, routes, payments, newsletter
    hotels_files_erp.go          # hotels, hotel_bookings, employee_files, generic ERP CRUD
  services/                      # business logic layer
    auth_service.go              # signup, signin, OTP, password reset, employee/partner mgmt
    modules_service.go           # bookings, hotels, directors, offers, routes, payments, etc.
  handlers/                      # thin Gin handlers (validate → call service → JSON)
    auth_handler.go              # /auth/* routes
    modules_handler.go           # /bookings, /directors, /offers, /routes, /payments, etc.
    bus_erp_handler.go           # /bus/search, /bus/lock-seat, /erp/dashboard/sync
    helpers.go                   # shared handler helpers
pkg/
  db/db.go                       # singleton *sql.DB pool (MaxOpenConns=80)
  auth/auth.go                   # JWT issuance, verification, Gin middleware (RBAC)
  email/email.go                 # SMTP sender + template renderer
  upload/upload.go               # multipart file upload to local disk
  gds/aggregator.go              # GDS Strategy Pattern + concurrent search
  seatlock/manager.go            # in-memory concurrency-safe seat lock manager
  erp/dashboard.go               # concurrent ERP dashboard loader (goroutine fan-out)
```

## Endpoint Map (PHP → Go)

| PHP endpoint | Go route |
|---|---|
| auth.php | `/api/v1/auth/*` (signup, signin, OTP, admin, agent, employees, partners) |
| bookings.php | `/api/v1/bookings` |
| directors.php | `/api/v1/directors` |
| erp.php | `/api/v1/erp/table/:table` (generic CRUD, 26 whitelisted tables) |
| app-settings.php | `/api/v1/settings` |
| email-templates.php | `/api/v1/email-templates` |
| hotels.php | `/api/v1/hotels` |
| hotel-bookings.php | `/api/v1/hotel-bookings` |
| newsletter.php | `/api/v1/newsletter` |
| offers.php | `/api/v1/offers` |
| payments.php | `/api/v1/payments` |
| routes.php | `/api/v1/routes` |
| employee_files | `/api/v1/employees/files` |

## Key performance properties

- **Bounded connection pool** (`pkg/db`): `MaxOpenConns=80` caps simultaneous DB sessions.
- **Concurrent GDS search** (`pkg/gds`): goroutines + channels, partial-failure tolerant.
- **In-memory seat locks** (`pkg/seatlock`): RWMutex-protected, 10-min TTL, background reaper.
- **Single multiplexed dashboard** (`pkg/erp`): one endpoint replaces 26 calls.
- **JWT auth** (`pkg/auth`): stateless HS256 access tokens, role-based middleware.
- **Context-aware queries**: all DB calls use `QueryContext`/`ExecContext`.

## Run

```bash
cp .env.template .env  # fill in real values
go run ./cmd/server
```
