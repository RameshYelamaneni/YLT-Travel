// Package db owns the singleton *sql.DB connection pool. Centralizing pool
// config here prevents connection storms: every concurrent goroutine draws
// from the same bounded pool instead of opening its own connection, so
// Postgres never sees more than MaxOpenConns simultaneous sessions regardless
// of how many operators open dashboards at once.
package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql" // MySQL driver

	"github.com/ylttravels/transit-os/backend/internal/config"
)

var pool *sql.DB

// Init opens the singleton pool, applies bounded limits, and pings the DB.
// Fails fast on a bad DSN so the error surfaces at startup, not mid-request.
func Init(ctx context.Context, cfg config.Config) error {
	if pool != nil {
		return nil
	}
	db, err := sql.Open("mysql", cfg.DSN())
	if err != nil {
		return fmt.Errorf("db: open: %w", err)
	}

	// Bounded pool — the single most important safeguard against connection
	// storms. With MaxOpenConns=80, even 200 goroutines issuing QueryContext
	// concurrently only ever hold 80 live connections; the rest block on the
	// pool until one frees, instead of hammering Postgres with 200 new
	// handshakes.
	db.SetMaxOpenConns(cfg.DBMaxOpenConns)
	db.SetMaxIdleConns(cfg.DBMaxIdleConns) // keep half warm for fast reuse
	db.SetConnMaxLifetime(cfg.DBConnMaxLifetime)
	db.SetConnMaxIdleTime(cfg.DBConnMaxIdleTime)

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		db.Close()
		return fmt.Errorf("db: ping: %w", err)
	}

	pool = db
	log.Printf("db: pool ready (maxOpen=%d maxIdle=%d lifetime=%s idle=%s)",
		cfg.DBMaxOpenConns, cfg.DBMaxIdleConns, cfg.DBConnMaxLifetime, cfg.DBConnMaxIdleTime)
	return nil
}

// Pool returns the initialized singleton.
func Pool() (*sql.DB, error) {
	if pool == nil {
		return nil, fmt.Errorf("db: pool not initialized")
	}
	return pool, nil
}

// Close closes the singleton pool (graceful shutdown only).
func Close() error {
	if pool == nil {
		return nil
	}
	err := pool.Close()
	pool = nil
	return err
}
