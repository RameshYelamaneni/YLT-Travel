// Package auth implements JWT issuance, verification, and Gin middleware
// for role-based access control. Replaces PHP sessions with stateless JWT
// (HS256) access tokens + long-lived refresh tokens.
package auth

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/ylttravels/transit-os/backend/internal/config"
)

// Claims is the JWT payload. `Type` drives role-based middleware; `Role` is
// the employee role for admin-type tokens (operator/sales/support/etc.).
type Claims struct {
	Email string `json:"email"`
	Name  string `json:"name"`
	Type  string `json:"type"` // customer | admin | agent
	Role  string `json:"role,omitempty"`
	Idle  int    `json:"idle,omitempty"`
	jwt.RegisteredClaims
}

// Manager issues and verifies tokens. It holds the signing secret + issuer.
type Manager struct {
	secret    []byte
	issuer    string
	accessTTL time.Duration
	refreshTTL time.Duration
}

// NewManager builds a Manager from config.
func NewManager(cfg config.Config) *Manager {
	return &Manager{
		secret:    cfg.JWTSecret,
		issuer:    cfg.JWTIssuer,
		accessTTL: cfg.JWTTTL,
		refreshTTL: cfg.RefreshTTL,
	}
}

// IssueAccess creates a signed access token for the given user identity.
func (m *Manager) IssueAccess(userID, email, name, userType, role string) (string, error) {
	return m.issue(userID, email, name, userType, role, m.accessTTL)
}

// IssueRefresh creates a longer-lived refresh token. The frontend stores this
// in an httpOnly cookie and uses it to obtain new access tokens.
func (m *Manager) IssueRefresh(userID, email, name, userType, role string) (string, error) {
	return m.issue(userID, email, name, userType, role, m.refreshTTL)
}

func (m *Manager) issue(userID, email, name, userType, role string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		Email: email,
		Name:  name,
		Type:  userType,
		Role:  role,
		Idle:  1800,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			Issuer:    m.issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(m.secret)
}

// Verify parses and validates a token string, returning the claims.
func (m *Manager) Verify(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	tok, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return m.secret, nil
	})
	if err != nil {
		return nil, err
	}
	if !tok.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

// BearerToken extracts the raw token from the Authorization header.
func BearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if h == "" {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
}

// Middleware builds a Gin middleware that requires a valid access token.
// Optionally restricts to one or more user types (e.g. "admin").
func (m *Manager) Middleware(allowedTypes ...string) gin.HandlerFunc {
	allow := func(claimsType string) bool {
		if len(allowedTypes) == 0 {
			return true
		}
		for _, t := range allowedTypes {
			if t == claimsType {
				return true
			}
		}
		return false
	}
	return func(c *gin.Context) {
		raw := BearerToken(c.Request)
		if raw == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}
		claims, err := m.Verify(raw)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}
		if !allow(claims.Type) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}
		// Stash claims for downstream handlers.
		c.Set("claims", claims)
		c.Next()
	}
}

// ClaimsFromContext retrieves the verified claims set by Middleware.
func ClaimsFromContext(c *gin.Context) (*Claims, bool) {
	v, ok := c.Get("claims")
	if !ok {
		return nil, false
	}
	claims, ok := v.(*Claims)
	return claims, ok
}
