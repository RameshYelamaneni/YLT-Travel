// Package config loads all runtime configuration from environment variables.
// No secrets in the Vite/React bundle — this is Go API (ylt-api) only.
// MYSQL_DSN, JWT_SECRET, CORS_ORIGIN, CORE_ADMIN_USER, CORE_ADMIN_PASS
// override the Hostinger fallbacks below.
package config

import (
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// Fallback credentials for Hostinger MySQL when Go runs on the same machine
// (localhost). VPS env always wins. Do not copy these into frontend env.
const (
	fallbackDBPass        = "Ramesh@538783"
	fallbackJWTSecret     = "ylt-travels-hostinger-secret-change-me-2026"
	fallbackCoreAdminUser = "CoreAdmin"
)

// Config holds every tunable the backend needs. Fields are populated from env
// vars with safe defaults so the server can boot in dev without a full .env.
type Config struct {
	// HTTP
	Port string

	// Database (Hostinger MySQL)
	// Prefer DATABASE_URL, then MYSQL_DSN (Go driver DSN).
	// Shape: USER:PASSWORD@tcp(localhost:3306)/DB_NAME?parseTime=true
	// Encode @ in the password as %40. Then DB_* host fallbacks.
	MySQLDSN     string
	DatabaseURL  string
	DBHost       string
	DBHosts      []string
	DBPort       string
	DBUser       string
	DBPassword   string
	DBName       string
	DBCharset    string
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

	// Core admin / agent fallbacks
	CoreAdminUser string
	CoreAdminPass string
	AgentEmail    string
	AgentPass     string
	OTPDev        bool // OTP_DEV=1 → local/dev JSON hint only; never a fixed production code

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
	dbPass := envFirst(fallbackDBPass, "DB_PASSWORD", "DB_PASS")
	jwtTTL := envDuration("JWT_TTL", 168*time.Hour)
	if h := envInt("JWT_TTL_HOURS", 0); h > 0 {
		jwtTTL = time.Duration(h) * time.Hour
	}
	defaultDSN := hostingerLocalDSN("utf8mb4")

	return Config{
		Port: envOr("PORT", "8080"),

		DatabaseURL: envOr("DATABASE_URL", defaultDSN),
		MySQLDSN:    os.Getenv("MYSQL_DSN"),
		DBHost:      envOr("DB_HOST", "localhost"),
		DBHosts:     splitHosts(envOr("MYSQL_HOSTS", "localhost,127.0.0.1,auth-db1833.hstgr.io")),
		DBPort:      envOr("DB_PORT", "3306"),
		DBUser:      envOr("DB_USER", "u377962510_admin"),
		DBPassword:  dbPass,
		DBName:      envOr("DB_NAME", "u377962510_YLT_Travels"),
		DBCharset:   envOr("DB_CHARSET", "utf8mb4"),

		DBMaxOpenConns:    envInt("DB_MAX_OPEN_CONNS", 80),
		DBMaxIdleConns:    envInt("DB_MAX_IDLE_CONNS", 40),
		DBConnMaxLifetime: envDuration("DB_CONN_MAX_LIFETIME", 10*time.Minute),
		DBConnMaxIdleTime: envDuration("DB_CONN_MAX_IDLE_TIME", 5*time.Minute),

		JWTSecret:  []byte(envOr("JWT_SECRET", fallbackJWTSecret)),
		JWTIssuer:  envOr("JWT_ISSUER", "ylttravels.com"),
		JWTTTL:     jwtTTL,
		RefreshTTL: envDuration("REFRESH_TTL", 30*24*time.Hour),

		CoreAdminUser: envOr("CORE_ADMIN_USER", fallbackCoreAdminUser),
		CoreAdminPass: envOr("CORE_ADMIN_PASS", dbPass),
		AgentEmail:    envOr("AGENT_EMAIL", "agent@ylt.local"),
		AgentPass:     envOr("AGENT_PASS", "agent123"),
		OTPDev:        envBool("OTP_DEV", false),

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

// DSN returns the first MySQL DSN for database/sql.
func (c Config) DSN() string {
	all := c.DSNs()
	if len(all) == 0 {
		return ""
	}
	return all[0]
}

// DSNs returns candidates in Hostinger order: DATABASE_URL, MYSQL_DSN, then
// localhost / 127.0.0.1 / remote host, then the encoded localhost fallback.
// Passwords with @ must be %40 so sql.Open("mysql", dsn) parses them.
func (c Config) DSNs() []string {
	seen := map[string]bool{}
	var out []string
	add := func(dsn string) {
		dsn = strings.TrimSpace(dsn)
		if dsn == "" {
			return
		}
		dsn = ensureDSNParams(toGoMySQLDSN(dsn), c.DBCharset)
		if seen[dsn] {
			return
		}
		seen[dsn] = true
		out = append(out, dsn)
	}

	add(c.DatabaseURL)
	add(c.MySQLDSN)

	charset := c.DBCharset
	if charset == "" {
		charset = "utf8mb4"
	}
	user := url.UserPassword(c.DBUser, c.DBPassword)
	hosts := c.DBHosts
	if len(hosts) == 0 {
		hosts = []string{c.DBHost, "localhost"}
	}
	for _, host := range hosts {
		host = strings.TrimSpace(host)
		if host == "" {
			continue
		}
		add(user.String() + "@tcp(" + host + ":" + c.DBPort + ")/" + c.DBName + "?parseTime=true&multiStatements=true&charset=" + charset)
	}
	add(hostingerLocalDSN(charset))
	return out
}

// hostingerLocalDSN is the official Hostinger Go DSN for this account.
// The password's @ is encoded as %40.
func hostingerLocalDSN(charset string) string {
	if charset == "" {
		charset = "utf8mb4"
	}
	pass := url.QueryEscape(fallbackDBPass)
	return "u377962510_admin:" + pass + "@tcp(localhost:3306)/u377962510_YLT_Travels?parseTime=true&multiStatements=true&charset=" + charset
}

// toGoMySQLDSN accepts either USER:PASS@tcp(host:3306)/db or mysql:// URLs.
func toGoMySQLDSN(dsn string) string {
	if !strings.HasPrefix(dsn, "mysql://") {
		return dsn
	}
	u, err := url.Parse(dsn)
	if err != nil {
		return dsn
	}
	user := ""
	pass := ""
	if u.User != nil {
		user = u.User.Username()
		pass, _ = u.User.Password()
	}
	host := u.Host
	if host == "" {
		host = "localhost:3306"
	} else if !strings.Contains(host, ":") {
		host += ":3306"
	}
	name := strings.TrimPrefix(u.Path, "/")
	out := url.UserPassword(user, pass).String() + "@tcp(" + host + ")/" + name
	if u.RawQuery != "" {
		out += "?" + u.RawQuery
	}
	return out
}

func ensureDSNParams(dsn, charset string) string {
	dsn = encodeDSNPassword(dsn)
	if charset == "" {
		charset = "utf8mb4"
	}
	if !strings.Contains(dsn, "parseTime") {
		if strings.Contains(dsn, "?") {
			dsn += "&parseTime=true&multiStatements=true"
		} else {
			dsn += "?parseTime=true&multiStatements=true"
		}
	}
	if !strings.Contains(dsn, "charset=") {
		if strings.Contains(dsn, "?") {
			dsn += "&charset=" + charset
		} else {
			dsn += "?charset=" + charset
		}
	}
	return dsn
}

// encodeDSNPassword URL-encodes the password in user:pass@tcp(...) so @ becomes %40.
func encodeDSNPassword(dsn string) string {
	atTcp := strings.LastIndex(dsn, "@tcp(")
	if atTcp < 0 {
		return dsn
	}
	creds := dsn[:atTcp]
	rest := dsn[atTcp:]
	colon := strings.Index(creds, ":")
	if colon < 0 {
		return dsn
	}
	user := creds[:colon]
	pass := creds[colon+1:]
	if strings.Contains(pass, "%") {
		return dsn
	}
	if strings.ContainsAny(pass, "@:/ ") {
		return url.UserPassword(user, pass).String() + rest
	}
	return dsn
}

func splitHosts(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envFirst(def string, keys ...string) string {
	for _, key := range keys {
		if v := os.Getenv(key); v != "" {
			return v
		}
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
