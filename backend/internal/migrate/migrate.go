package migrate

import (
	"context"
	_ "embed"
	"fmt"
	"strings"

	"database/sql"
)

//go:embed schema.sql
var schemaSQL string

// Run drops every table in the current database, applies schema.sql, and seeds
// CoreAdmin / agent / inventory defaults. Call once via GET|POST /api/install.
func Run(ctx context.Context, db *sql.DB, adminUser, adminPass, agentEmail, agentPass string) error {
	if _, err := db.ExecContext(ctx, "SET FOREIGN_KEY_CHECKS=0"); err != nil {
		return fmt.Errorf("migrate: fk off: %w", err)
	}
	rows, err := db.QueryContext(ctx, "SHOW TABLES")
	if err != nil {
		return fmt.Errorf("migrate: show tables: %w", err)
	}
	var names []string
	for rows.Next() {
		var n string
		if err := rows.Scan(&n); err != nil {
			rows.Close()
			return err
		}
		names = append(names, n)
	}
	rows.Close()
	for _, n := range names {
		if _, err := db.ExecContext(ctx, "DROP TABLE IF EXISTS `"+strings.ReplaceAll(n, "`", "")+"`"); err != nil {
			return fmt.Errorf("migrate: drop %s: %w", n, err)
		}
	}
	if err := execSQLFile(ctx, db, schemaSQL); err != nil {
		return err
	}

	hashAdmin, err := hash(adminPass)
	if err != nil {
		return err
	}
	hashAgent, err := hash(agentPass)
	if err != nil {
		return err
	}
	uid := newID()
	if _, err := db.ExecContext(ctx,
		`INSERT INTO users (id,email,password,name) VALUES (?,?,?,?)`,
		uid, "coreadmin@ylttravels.com", hashAdmin, "Core Admin"); err != nil {
		return fmt.Errorf("migrate: seed user: %w", err)
	}
	if _, err := db.ExecContext(ctx,
		`INSERT INTO employees (id,email,password_hash,name,role,status) VALUES (?,?,?,?,?,?)`,
		newID(), "coreadmin@ylttravels.com", hashAdmin, adminUser, "admin", "active"); err != nil {
		return fmt.Errorf("migrate: seed employee: %w", err)
	}
	if _, err := db.ExecContext(ctx,
		`INSERT INTO partners (id,email,password_hash,name,agency_name,status) VALUES (?,?,?,?,?,?)`,
		newID(), agentEmail, hashAgent, "YLT Agent", "YLT Partner Agency", "active"); err != nil {
		return fmt.Errorf("migrate: seed partner: %w", err)
	}
	if _, err := db.ExecContext(ctx,
		`INSERT INTO erp_partner_profile (id,company_name,legal_name,contact_email,brand_color) VALUES (?,?,?,?,?)`,
		newID(), "YLT Travels", "YLT Travels Pvt Ltd", "coreadmin@ylttravels.com", "#0b1f3a"); err != nil {
		return fmt.Errorf("migrate: seed partner profile: %w", err)
	}
	if _, err := db.ExecContext(ctx,
		`UPDATE app_settings SET inventory_provider='ylt_db', smtp_from_name='YLT Travels' WHERE id=1`); err != nil {
		return fmt.Errorf("migrate: seed settings: %w", err)
	}
	if _, err := db.ExecContext(ctx, "SET FOREIGN_KEY_CHECKS=1"); err != nil {
		return err
	}
	return nil
}

func execSQLFile(ctx context.Context, db *sql.DB, sqlText string) error {
	// Prefer a single multi-statement exec; Hostinger often disables it.
	if _, err := db.ExecContext(ctx, sqlText); err == nil {
		return nil
	}
	for _, stmt := range splitSQL(sqlText) {
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("migrate: sql: %w", err)
		}
	}
	return nil
}

func splitSQL(sqlText string) []string {
	var out []string
	var b strings.Builder
	inStr := false
	esc := false
	for _, r := range sqlText {
		if inStr {
			b.WriteRune(r)
			if esc {
				esc = false
				continue
			}
			if r == '\\' {
				esc = true
				continue
			}
			if r == '\'' {
				inStr = false
			}
			continue
		}
		if r == '\'' {
			inStr = true
			b.WriteRune(r)
			continue
		}
		if r == ';' {
			s := strings.TrimSpace(b.String())
			b.Reset()
			if s != "" && !strings.HasPrefix(s, "--") {
				out = append(out, s)
			}
			continue
		}
		b.WriteRune(r)
	}
	if s := strings.TrimSpace(b.String()); s != "" {
		out = append(out, s)
	}
	return out
}

// EnsureOTPHashColumn widens otp_codes.code so bcrypt / SHA-256 hashes fit on
// existing Hostinger databases that still have VARCHAR(10).
func EnsureOTPHashColumn(ctx context.Context, db *sql.DB) error {
	if db == nil {
		return nil
	}
	_, err := db.ExecContext(ctx, `ALTER TABLE otp_codes MODIFY code VARCHAR(255) NOT NULL`)
	return err
}
