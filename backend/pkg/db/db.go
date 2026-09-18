// Package db owns the singleton *sql.DB connection pool. Centralizing pool
// config here prevents connection storms: every concurrent goroutine draws
// from the same bounded pool instead of opening its own connection.
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
	var last error
	for _, dsn := range cfg.DSNs() {
		db, err := sql.Open("mysql", dsn)
		if err != nil {
			last = err
			continue
		}
		db.SetMaxOpenConns(cfg.DBMaxOpenConns)
		db.SetMaxIdleConns(cfg.DBMaxIdleConns)
		db.SetConnMaxLifetime(cfg.DBConnMaxLifetime)
		db.SetConnMaxIdleTime(cfg.DBConnMaxIdleTime)

		pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		err = db.PingContext(pingCtx)
		cancel()
		if err != nil {
			last = err
			db.Close()
			continue
		}
		pool = db
		log.Printf("db: pool ready (maxOpen=%d maxIdle=%d lifetime=%s idle=%s)",
			cfg.DBMaxOpenConns, cfg.DBMaxIdleConns, cfg.DBConnMaxLifetime, cfg.DBConnMaxIdleTime)
		return nil
	}
	if last == nil {
		last = fmt.Errorf("no DSN configured (set DATABASE_URL or MYSQL_DSN in hPanel, then restart ylt-api)")
	}
	return fmt.Errorf("db: ping: %w", last)
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
