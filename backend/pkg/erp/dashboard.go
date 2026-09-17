// Package erp holds the concurrent dashboard service that loads all ERP
// modules in one round-trip, replacing the 26 separate PHP ERP queries.
package erp

import (
	"context"
	"database/sql"
	"log"
	"sync"
	"time"

	"github.com/ylttravels/transit-os/backend/internal/models"
	"github.com/ylttravels/transit-os/backend/pkg/db"
)

// LoadOperatorDashboard is the single service function the handler calls.
//
// Concurrency model: it launches one goroutine per ERP module, each issuing
// QueryContext against the shared *sql.DB pool. Results and errors are
// collected over a buffered channel; a sync.WaitGroup knows when all are done.
//
// Why this prevents DB overload: instead of 26 sequential round-trips (each
// holding a connection for its full RTT), we issue at most N concurrent queries
// (N = number of modules), all drawing from the same bounded pool. The pool's
// MaxOpenConns caps how many ever run simultaneously, so even under 50
// operators the DB sees ≤ MaxOpenConns queries at once.
//
// Partial-failure handling: a module whose query fails is marked "degraded"
// in ModuleStatus; the rest of the payload is still returned.
func LoadOperatorDashboard(ctx context.Context, operatorID int64) (models.DashboardPayload, error) {
	start := time.Now()
	pool, err := db.Pool()
	if err != nil {
		return models.DashboardPayload{}, err
	}

	// Per-request timeout so a slow query cannot hold a connection forever.
	ctx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	type loaderFn func(context.Context, *sql.DB, int64) (moduleResult, error)
	loaders := []struct {
		name string
		fn   loaderFn
	}{
		{"buses", loadBuses},
		{"seat_inventory", loadSeatInventory},
		{"seat_locks", loadSeatLocks},
		{"live_trips", loadLiveTrips},
		{"employees", loadEmployees},
		{"expenses", loadExpenses},
	}

	resCh := make(chan moduleResult, len(loaders))
	var wg sync.WaitGroup
	for _, l := range loaders {
		wg.Add(1)
		go func(name string, fn loaderFn) {
			defer wg.Done()
			r, err := fn(ctx, pool, operatorID)
			if err != nil {
				resCh <- moduleResult{module: name, err: err}
				return
			}
			r.module = name
			resCh <- r
		}(l.name, l.fn)
	}
	go func() {
		wg.Wait()
		close(resCh)
	}()

	payload := models.DashboardPayload{
		OperatorID:   operatorID,
		ModuleStatus: make(map[string]models.ModuleStatus, len(loaders)),
		GeneratedAt:  time.Now(),
	}
	for r := range resCh {
		if r.err != nil {
			log.Printf("erp: module %s degraded: %v", r.module, r.err)
			payload.ModuleStatus[r.module] = models.StatusDegraded
			continue
		}
		switch r.module {
		case "buses":
			payload.Buses = r.buses
		case "seat_inventory":
			payload.SeatInventory = r.seats
		case "seat_locks":
			payload.SeatLocks = r.locks
		case "live_trips":
			payload.LiveTrips = r.trips
		case "employees":
			payload.Employees = r.empl
		case "expenses":
			payload.Expenses = r.exp
		}
		if r.status == models.StatusEmpty {
			payload.ModuleStatus[r.module] = models.StatusEmpty
		} else {
			payload.ModuleStatus[r.module] = models.StatusOK
		}
	}
	payload.ElapsedMs = time.Since(start).Milliseconds()
	return payload, nil
}

type moduleResult struct {
	module string
	status models.ModuleStatus
	buses  []models.ErpBus
	seats  []models.ErpSeatInventory
	locks  []models.ErpSeatLock
	trips  []models.ErpLiveTrip
	empl   []models.ErpEmployee
	exp    []models.ErpExpense
	err    error
}

// --- per-module loaders ---

func loadBuses(ctx context.Context, q *sql.DB, opID int64) (moduleResult, error) {
	rows, err := q.QueryContext(ctx,
		`SELECT id, operator_id, registration, model, bus_type, capacity,
		        amenities, status, last_service_at, created_at, updated_at
		 FROM erp_buses WHERE operator_id = ?`, opID)
	if err != nil {
		return moduleResult{}, err
	}
	defer rows.Close()
	out := make([]models.ErpBus, 0)
	for rows.Next() {
		var b models.ErpBus
		if err := rows.Scan(&b.ID, &b.OperatorID, &b.Registration, &b.Model,
			&b.BusType, &b.Capacity, &b.Amenities, &b.Status, &b.LastServiceAt,
			&b.CreatedAt, &b.UpdatedAt); err != nil {
			return moduleResult{}, err
		}
		out = append(out, b)
	}
	return moduleResult{buses: out, status: statusOf(out)}, nil
}

func loadSeatInventory(ctx context.Context, q *sql.DB, opID int64) (moduleResult, error) {
	rows, err := q.QueryContext(ctx,
		`SELECT si.id, si.trip_id, si.bus_id, si.seat_id, si.status,
		        si.locked_by, si.locked_until, si.booked_at, si.updated_at
		 FROM erp_seat_inventory si
		 JOIN erp_live_trips lt ON lt.trip_id = si.trip_id
		 WHERE lt.operator_id = ?`, opID)
	if err != nil {
		return moduleResult{}, err
	}
	defer rows.Close()
	out := make([]models.ErpSeatInventory, 0)
	for rows.Next() {
		var s models.ErpSeatInventory
		if err := rows.Scan(&s.ID, &s.TripID, &s.BusID, &s.SeatID, &s.Status,
			&s.LockedBy, &s.LockedUntil, &s.BookedAt, &s.UpdatedAt); err != nil {
			return moduleResult{}, err
		}
		out = append(out, s)
	}
	return moduleResult{seats: out, status: statusOf(out)}, nil
}

func loadSeatLocks(ctx context.Context, q *sql.DB, _ int64) (moduleResult, error) {
	rows, err := q.QueryContext(ctx,
		`SELECT id, trip_id, seat_id, locked_by, acquired_at, expires_at,
		        released_at, reason
		 FROM erp_seat_locks
		 WHERE expires_at > NOW() AND released_at IS NULL`)
	if err != nil {
		return moduleResult{}, err
	}
	defer rows.Close()
	out := make([]models.ErpSeatLock, 0)
	for rows.Next() {
		var l models.ErpSeatLock
		if err := rows.Scan(&l.ID, &l.TripID, &l.SeatID, &l.LockedBy,
			&l.AcquiredAt, &l.ExpiresAt, &l.ReleasedAt, &l.Reason); err != nil {
			return moduleResult{}, err
		}
		out = append(out, l)
	}
	return moduleResult{locks: out, status: statusOf(out)}, nil
}

func loadLiveTrips(ctx context.Context, q *sql.DB, opID int64) (moduleResult, error) {
	rows, err := q.QueryContext(ctx,
		`SELECT id, trip_id, operator_id, bus_id, source, destination,
		        departure_at, seats_total, seats_sold, seats_locked,
		        gross_revenue, status, updated_at
		 FROM erp_live_trips WHERE operator_id = ?`, opID)
	if err != nil {
		return moduleResult{}, err
	}
	defer rows.Close()
	out := make([]models.ErpLiveTrip, 0)
	for rows.Next() {
		var t models.ErpLiveTrip
		if err := rows.Scan(&t.ID, &t.TripID, &t.OperatorID, &t.BusID,
			&t.Source, &t.Destination, &t.DepartureAt, &t.SeatsTotal,
			&t.SeatsSold, &t.SeatsLocked, &t.GrossRevenue, &t.Status,
			&t.UpdatedAt); err != nil {
			return moduleResult{}, err
		}
		out = append(out, t)
	}
	return moduleResult{trips: out, status: statusOf(out)}, nil
}

func loadEmployees(ctx context.Context, q *sql.DB, opID int64) (moduleResult, error) {
	rows, err := q.QueryContext(ctx,
		`SELECT id, operator_id, name, role, phone, active
		 FROM erp_employees WHERE operator_id = ?`, opID)
	if err != nil {
		return moduleResult{}, err
	}
	defer rows.Close()
	out := make([]models.ErpEmployee, 0)
	for rows.Next() {
		var e models.ErpEmployee
		if err := rows.Scan(&e.ID, &e.OperatorID, &e.Name, &e.Role, &e.Phone,
			&e.Active); err != nil {
			return moduleResult{}, err
		}
		out = append(out, e)
	}
	return moduleResult{empl: out, status: statusOf(out)}, nil
}

func loadExpenses(ctx context.Context, q *sql.DB, opID int64) (moduleResult, error) {
	rows, err := q.QueryContext(ctx,
		`SELECT id, operator_id, category, amount, currency, incurred_at, status
		 FROM erp_expenses
		 WHERE operator_id = ? AND incurred_at >= ?
		 ORDER BY incurred_at DESC LIMIT 200`, opID, time.Now().AddDate(0, -1, 0))
	if err != nil {
		return moduleResult{}, err
	}
	defer rows.Close()
	out := make([]models.ErpExpense, 0)
	for rows.Next() {
		var x models.ErpExpense
		if err := rows.Scan(&x.ID, &x.OperatorID, &x.Category, &x.Amount,
			&x.Currency, &x.IncurredAt, &x.Status); err != nil {
			return moduleResult{}, err
		}
		out = append(out, x)
	}
	return moduleResult{exp: out, status: statusOf(out)}, nil
}

func statusOf[T any](s []T) models.ModuleStatus {
	if len(s) == 0 {
		return models.StatusEmpty
	}
	return models.StatusOK
}
