package handlers

import (
	"database/sql"

	"github.com/ylttravels/transit-os/backend/pkg/upload"
)

// uploadManager is a thin alias so handlers can reference the upload.Manager
// without importing the package directly in every handler signature.
type uploadManager = upload.Manager

// nullString converts a string to sql.NullString (empty → NULL).
func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
