// Package config loads all runtime configuration from environment variables.
// No hardcoded secrets — everything comes from .env / real env. The single
// Load() call returns a Config consumed by main.go and injected downward.
package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds every tunable the backend needs. Fields are populated from env
// vars with safe defaults so the server can boot in dev without a full .env.
type Config struct {
	// HTTP
	Port string

	// Database (MySQL on Hostinger VPS)
	// Either supply DATABASE_URL (full mysql:// connection string) OR individual
	// DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME vars.
	DatabaseURL  string // full mysql:// URL, takes precedence
	DBHost        string
	DBPort        string
	DBUser        string
	DBPassword    string
	DBName        string
	// Pool limits — these are what prevent connection storms when 50+
	// operators open dashboards simultaneously. Every goroutine draws from
	// the same bounded pool instead of opening its own connection.
	DBMaxOpenConns    int
	DBMaxIdleConns    int
	DBConnMaxLifetime time.Duration
	DBConnMaxIdleTime time.Duration

	// JWT auth
	JWTSecret  []byte
	JWTIssuer  string
	JWTTTL     time.Duration // access-token lifetime
	RefreshTTL time.Duration // refresh-token lifetime

	// Core admin (legacy fallback)
	CoreAdminUser string
	CoreAdminPass string

	// GDS supplier API keys
	GDSBitlaKey   string
	GDSMantisKey  string
	GDSAbhiBusKey string

	// File uploads
	FileStoragePath string // local disk path now; S3 bucket later
	MaxUploadBytes  int64

	// CORS
	CORSOrigin string

	// SMTP (for email sending)
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string
	SMTPSecure   bool
}

// Load reads the environment and returns a populated Config.
func Load() Config {
	return Config{
		Port:              envOr("PORT", "8080"),

		DatabaseURL:  os.Getenv("DATABASE_URL"),
		DBHost:        envOr("DB_HOST", "127.0.0.1"),
		DBPort:        envOr("DB_PORT", "3306"),
		DBUser:        envOr("DB_USER", "root"),
		DBPassword:    os.Getenv("DB_PASSWORD"),
		DBName:        envOr("DB_NAME", "u377962510_ylt_travels"),
		DBMaxOpenConns:    envInt("DB_MAX_OPEN_CONNS", 80),
		DBMaxIdleConns:    envInt("DB_MAX_IDLE_CONNS", 40),
		DBConnMaxLifetime: envDuration("DB_CONN_MAX_LIFETIME", 10*time.Minute),
		DBConnMaxIdleTime: envDuration("DB_CONN_MAX_IDLE_TIME", 5*time.Minute),

		JWTSecret:  []byte(envOr("JWT_SECRET", "change-me-in-production")),
		JWTIssuer:  envOr("JWT_ISSUER", "ylttravels.com"),
		JWTTTL:     envDuration("JWT_TTL", 168*time.Hour),
		RefreshTTL: envDuration("REFRESH_TTL", 30*24*time.Hour),

		CoreAdminUser: envOr("CORE_ADMIN_USER", "CoreAdmin"),
		CoreAdminPass: envOr("CORE_ADMIN_PASS", "change-me"),

		GDSBitlaKey:   os.Getenv("GDS_BITLA_KEY"),
		GDSMantisKey:  os.Getenv("GDS_MANTIS_KEY"),
		GDSAbhiBusKey: os.Getenv("GDS_ABHIBUS_KEY"),

		FileStoragePath: envOr("FILE_STORAGE_PATH", "/var/www/uploads"),
		MaxUploadBytes:  int64(envInt("MAX_UPLOAD_BYTES", 8*1024*1024)),

		CORSOrigin: envOr("CORS_ORIGIN", "*"),

		SMTPHost:     envOr("SMTP_HOST", "smtp.hostinger.com"),
		SMTPPort:     envInt("SMTP_PORT", 465),
		SMTPUser:     os.Getenv("SMTP_USER"),
		SMTPPassword: os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:     envOr("SMTP_FROM_EMAIL", "noreply@ylttravels.com"),
		SMTPSecure:   envBool("SMTP_SECURE", true),
	}
}

// DSN returns the MySQL DSN for database/sql.
// If DATABASE_URL is set (mysql://user:pass@host:port/db), it takes precedence.
// Otherwise builds from individual DB_* env vars.
func (c Config) DSN() string {
	if c.DatabaseURL != "" {
		return c.DatabaseURL
	}
	return c.DBUser + ":" + c.DBPassword + "@tcp(" + c.DBHost + ":" + c.DBPort + ")/" + c.DBName + "?parseTime=true&multiStatements=true"
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return def
}
func envDuration(key string, def time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d > 0 {
			return d
		}
	}
	return def
}
func envBool(key string, def bool) bool {
	if v := os.Getenv(key); v != "" {
		return strings.EqualFold(v, "true") || v == "1"
	}
	return def
}
