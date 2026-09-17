# YLT Travels — Transit OS Frontend

Next.js 15 (App Router) frontend replacing all PHP-rendered pages.

## Structure

```
app/
  layout.tsx                      # root layout + global nav
  globals.css                     # Tailwind + shared classes
  login/page.tsx                  # customer/agent/admin login (replaces login.php)
  (customer)/search/page.tsx      # bus search + seat selection
  (operator)/dashboard/page.tsx   # unified operator dashboard
  operator/bookings/page.tsx      # booking management (replaces bookings.php)
  directors/page.tsx              # board of directors (replaces directors.php)
  employees/page.tsx              # employee management (replaces employees.php)
  expenses/page.tsx               # expense ledger (replaces expenses.php)
  settings/page.tsx               # app settings (replaces settings.php)
lib/
  types.ts                        # TS interfaces mirroring Go structs
  api/client.ts                   # fetch wrapper (single source of fetch)
  api/auth.ts                     # auth endpoints
  api/bookings.ts                 # booking endpoints
  api/bus.ts                      # bus search + seat lock
  api/directors.ts                # director endpoints
  api/employees.ts                # employee file endpoints
  api/erp.ts                      # dashboard sync endpoint
  api/expenses.ts                 # expense + payment endpoints
  store/erpStore.ts               # Zustand store for unified dashboard
components/
  BusSeatLayout.tsx               # presentational seat map
```

## Key design properties

- **No direct fetch in components.** All HTTP goes through `lib/api/*`.
- **One store, one payload.** `erpStore` holds a single `DashboardPayload`.
- **BusSeatLayout is purely presentational.** State comes from props.
- **All pages are strongly typed** against the Go backend structs.
