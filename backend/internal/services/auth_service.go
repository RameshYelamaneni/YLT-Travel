// Package services holds the business logic layer. Each service orchestrates
// repository calls, password hashing, email sending, and other cross-cutting
// concerns. Handlers are thin and delegate here.
package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/ylttravels/transit-os/backend/internal/models"
	"github.com/ylttravels/transit-os/backend/internal/repositories"
	"github.com/ylttravels/transit-os/backend/pkg/auth"
	"github.com/ylttravels/transit-os/backend/pkg/email"
)

// --- Auth service ---

type AuthService struct {
	repo     *repositories.AuthRepo
	tmpl     *repositories.EmailTemplateRepo
	jwt      *auth.Manager
	settings *repositories.SettingsRepo
	otpDev   bool
	envSMTP  email.SMTPConfig
}

func NewAuthService(repo *repositories.AuthRepo, tmpl *repositories.EmailTemplateRepo, jwt *auth.Manager, settings *repositories.SettingsRepo, otpDev bool, envSMTP email.SMTPConfig) *AuthService {
	return &AuthService{repo: repo, tmpl: tmpl, jwt: jwt, settings: settings, otpDev: otpDev, envSMTP: envSMTP}
}

// OTPSendResult is returned after generating and (when possible) emailing an OTP.
type OTPSendResult struct {
	DevHint string `json:"hint,omitempty"`
}

// SignupResult is returned by Signup and Signin.
type SignupResult struct {
	AccessToken string `json:"accessToken"`
	Email       string `json:"email"`
	Name        string `json:"name"`
	UserID      string `json:"userId"`
}

func (s *AuthService) Signup(ctx context.Context, emailAddr, password, name string) (*SignupResult, error) {
	emailAddr = strings.ToLower(strings.TrimSpace(emailAddr))
	if !validEmail(emailAddr) {
		return nil, errors.New("invalid email address")
	}
	if len(password) < 6 {
		return nil, errors.New("password must be at least 6 characters")
	}
	existing, err := s.repo.GetUserByEmail(ctx, emailAddr)
	if err != nil {
		return nil, fmt.Errorf("signup: check existing: %w", err)
	}
	if existing != nil {
		return nil, errors.New("an account with this email already exists")
	}
	if name == "" {
		name = strings.Split(emailAddr, "@")[0]
	}
	hash, err := repositories.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("signup: hash: %w", err)
	}
	uid, err := s.repo.CreateUser(ctx, emailAddr, hash, name)
	if err != nil {
		return nil, fmt.Errorf("signup: create: %w", err)
	}
	token, err := s.jwt.IssueAccess(uid, emailAddr, name, "customer", "")
	if err != nil {
		return nil, fmt.Errorf("signup: jwt: %w", err)
	}
	return &SignupResult{AccessToken: token, Email: emailAddr, Name: name, UserID: uid}, nil
}

func (s *AuthService) Signin(ctx context.Context, emailAddr, password string) (*SignupResult, error) {
	emailAddr = strings.ToLower(strings.TrimSpace(emailAddr))
	if !validEmail(emailAddr) {
		return nil, errors.New("invalid email address")
	}
	user, err := s.repo.GetUserByEmail(ctx, emailAddr)
	if err != nil {
		return nil, fmt.Errorf("signin: lookup: %w", err)
	}
	if user == nil || !user.Password.Valid || !repositories.CheckPassword(user.Password.String, password) {
		return nil, errors.New("invalid email or password")
	}
	token, err := s.jwt.IssueAccess(user.ID, user.Email, user.Name, "customer", "")
	if err != nil {
		return nil, fmt.Errorf("signin: jwt: %w", err)
	}
	return &SignupResult{AccessToken: token, Email: user.Email, Name: user.Name, UserID: user.ID}, nil
}

func (s *AuthService) AgentSignin(ctx context.Context, emailAddr, password string) (*SignupResult, error) {
	emailAddr = strings.ToLower(strings.TrimSpace(emailAddr))
	partner, err := s.repo.GetPartnerByEmail(ctx, emailAddr)
	if err != nil || partner == nil || !repositories.CheckPassword(partner.PasswordHash.String, password) {
		return nil, errors.New("invalid agent credentials")
	}
	if partner.Status != "active" {
		return nil, fmt.Errorf("your agent account is %s", partner.Status)
	}
	token, err := s.jwt.IssueAccess(partner.ID, emailAddr, partner.Name, "agent", "")
	if err != nil {
		return nil, err
	}
	return &SignupResult{AccessToken: token, Email: emailAddr, Name: partner.Name, UserID: partner.ID}, nil
}

// AdminSignin tries core admin first, then the employees table.
func (s *AuthService) AdminSignin(ctx context.Context, username, password, coreAdminUser, coreAdminPass string) (*SignupResult, error) {
	if username == coreAdminUser && password == coreAdminPass {
		token, err := s.jwt.IssueAccess("core-admin", coreAdminUser, "Core Admin", "admin", "")
		if err != nil {
			return nil, err
		}
		return &SignupResult{AccessToken: token, Email: coreAdminUser, Name: "Core Admin", UserID: "core-admin"}, nil
	}
	emailAddr := strings.ToLower(username)
	emp, err := s.repo.GetEmployeeByEmail(ctx, emailAddr)
	if err != nil || emp == nil || !repositories.CheckPassword(emp.PasswordHash.String, password) {
		return nil, errors.New("invalid admin credentials")
	}
	if emp.Status != "active" {
		return nil, fmt.Errorf("your employee account is %s", emp.Status)
	}
	token, err := s.jwt.IssueAccess(emp.ID, emailAddr, emp.Name, "admin", emp.Role)
	if err != nil {
		return nil, err
	}
	return &SignupResult{AccessToken: token, Email: emailAddr, Name: emp.Name, UserID: emp.ID}, nil
}

// SendOTP generates a cryptographically random 6-digit code, stores a hash,
// and emails the plaintext via SMTP. There is no fixed production OTP.
func (s *AuthService) SendOTP(ctx context.Context, emailAddr string) (*OTPSendResult, error) {
	emailAddr = strings.ToLower(strings.TrimSpace(emailAddr))
	if !validEmail(emailAddr) {
		return nil, errors.New("invalid email address")
	}
	count, err := s.repo.CountRecentOTPs(ctx, emailAddr)
	if err != nil {
		return nil, fmt.Errorf("otp: rate limit check: %w", err)
	}
	if count >= 3 {
		return nil, errors.New("too many OTP requests, please wait a few minutes")
	}

	smtpCfg, smtpReady := s.smtpFromSettings(ctx)
	if !smtpReady && !s.otpDev {
		return nil, errors.New("Email OTP is not configured. Add SMTP in Admin → Email.")
	}

	code := genOTP()
	if err := s.repo.InsertOTP(ctx, emailAddr, hashOTP(emailAddr, code)); err != nil {
		return nil, fmt.Errorf("otp: insert: %w", err)
	}

	if smtpReady {
		tmpl, _ := s.tmpl.GetByKey(ctx, "otp_login")
		var subject, body string
		if tmpl != nil {
			subject, body = email.RenderTemplate(tmpl.Subject, tmpl.BodyHTML, map[string]string{"code": code, "email": emailAddr})
		} else {
			subject = "Your YLT Travels login code"
			body = fmt.Sprintf(`<div style="font-family:sans-serif;max-width:420px"><p>Your YLT Travels login code is</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0b1f3a">%s</div><p style="color:#666;font-size:13px">Expires in 10 minutes. If you did not request this, ignore this email.</p></div>`, code)
		}
		if err := email.Send(smtpCfg, emailAddr, subject, body); err != nil && !s.otpDev {
			return nil, fmt.Errorf("could not send OTP email: %w", err)
		}
	}

	out := &OTPSendResult{}
	if s.otpDev {
		out.DevHint = code
	}
	return out, nil
}

func (s *AuthService) smtpFromSettings(ctx context.Context) (email.SMTPConfig, bool) {
	if s.settings != nil {
		settings, err := s.settings.Get(ctx)
		if err == nil && settings != nil && settings.EmailEnabled {
			cfg := email.SMTPConfig{
				Host:     settings.SMTPHost.String,
				Port:     settings.SMTPPort,
				User:     settings.SMTPUser.String,
				Password: settings.SMTPPassword.String,
				From:     settings.SMTPFromEmail.String,
				FromName: settings.SMTPFromName.String,
				Secure:   settings.SMTPSecure,
			}
			if cfg.Host != "" && cfg.User != "" && cfg.Password != "" {
				return cfg, true
			}
		}
	}
	cfg := s.envSMTP
	if cfg.Host == "" {
		cfg.Host = "smtp.hostinger.com"
	}
	if cfg.Port == 0 {
		cfg.Port = 465
	}
	if cfg.From == "" {
		cfg.From = cfg.User
	}
	if cfg.FromName == "" {
		cfg.FromName = "YLT Travels"
	}
	if cfg.User != "" && cfg.Password != "" {
		return cfg, true
	}
	return email.SMTPConfig{}, false
}

// VerifyOTP validates the code and issues a JWT. Creates the user if new.
func (s *AuthService) VerifyOTP(ctx context.Context, emailAddr, code string) (*SignupResult, error) {
	emailAddr = strings.ToLower(strings.TrimSpace(emailAddr))
	code = strings.TrimSpace(code)
	if len(code) != 6 {
		return nil, errors.New("email and 6-digit code are required")
	}
	otp, err := s.repo.LatestOTP(ctx, emailAddr)
	if err != nil {
		return nil, fmt.Errorf("verify otp: %w", err)
	}
	if otp == nil {
		return nil, errors.New("no OTP was requested")
	}
	if otp.Used {
		return nil, errors.New("this code was already used")
	}
	if otp.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("this code has expired")
	}
	want := hashOTP(emailAddr, code)
	if subtle.ConstantTimeCompare([]byte(otp.Code), []byte(want)) != 1 {
		return nil, errors.New("incorrect code")
	}
	_ = s.repo.MarkOTPUsed(ctx, otp.ID)
	// Find or create user.
	user, err := s.repo.GetUserByEmail(ctx, emailAddr)
	if err != nil {
		return nil, fmt.Errorf("verify otp: lookup: %w", err)
	}
	if user == nil {
		name := strings.Split(emailAddr, "@")[0]
		uid, err := s.repo.CreateUser(ctx, emailAddr, "", name)
		if err != nil {
			return nil, fmt.Errorf("verify otp: create user: %w", err)
		}
		token, err := s.jwt.IssueAccess(uid, emailAddr, name, "customer", "")
		if err != nil {
			return nil, err
		}
		return &SignupResult{AccessToken: token, Email: emailAddr, Name: name, UserID: uid}, nil
	}
	token, err := s.jwt.IssueAccess(user.ID, user.Email, user.Name, "customer", "")
	if err != nil {
		return nil, err
	}
	return &SignupResult{AccessToken: token, Email: emailAddr, Name: user.Name, UserID: user.ID}, nil
}

// ForgotPasswordSend generates a reset code and emails it (if user exists).
func (s *AuthService) ForgotPasswordSend(ctx context.Context, emailAddr string) error {
	emailAddr = strings.ToLower(strings.TrimSpace(emailAddr))
	user, _ := s.repo.GetUserByEmail(ctx, emailAddr)
	if user == nil {
		return nil // don't leak existence
	}
	count, _ := s.repo.CountRecentOTPs(ctx, emailAddr)
	if count >= 3 {
		return errors.New("too many reset requests")
	}
	code := genOTP()
	_ = s.repo.InsertOTP(ctx, emailAddr, hashOTP(emailAddr, code))
	smtpCfg, smtpReady := s.smtpFromSettings(ctx)
	if smtpReady {
		subject := "Your YLT Travels password reset code"
		body := fmt.Sprintf(`<div style="font-family:sans-serif"><p>Reset code:</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0b1f3a">%s</div></div>`, code)
		_ = email.Send(smtpCfg, emailAddr, subject, body)
	}
	return nil
}

func (s *AuthService) ForgotPasswordReset(ctx context.Context, emailAddr, code, password string) error {
	emailAddr = strings.ToLower(strings.TrimSpace(emailAddr))
	if len(code) != 6 {
		return errors.New("enter the 6-digit code")
	}
	if len(password) < 6 {
		return errors.New("password must be at least 6 characters")
	}
	otp, err := s.repo.LatestOTP(ctx, emailAddr)
	if err != nil || otp == nil {
		return errors.New("no reset code was requested")
	}
	want := hashOTP(emailAddr, code)
	if otp.Used || otp.ExpiresAt.Before(time.Now()) || subtle.ConstantTimeCompare([]byte(otp.Code), []byte(want)) != 1 {
		return errors.New("invalid or expired code")
	}
	_ = s.repo.MarkOTPUsed(ctx, otp.ID)
	hash, err := repositories.HashPassword(password)
	if err != nil {
		return err
	}
	return s.repo.UpdatePassword(ctx, emailAddr, hash)
}

// --- Employee management (admin) ---

func (s *AuthService) ListEmployees(ctx context.Context) ([]models.Employee, error) {
	return s.repo.ListEmployees(ctx)
}

func (s *AuthService) CreateEmployee(ctx context.Context, emailAddr, password, name, role, phone string) (string, error) {
	emailAddr = strings.ToLower(strings.TrimSpace(emailAddr))
	if !validEmail(emailAddr) {
		return "", errors.New("invalid email")
	}
	if len(password) < 6 {
		return "", errors.New("password must be at least 6 characters")
	}
	if name == "" {
		return "", errors.New("name is required")
	}
	if !validRole(role) {
		return "", errors.New("invalid role")
	}
	hash, err := repositories.HashPassword(password)
	if err != nil {
		return "", err
	}
	return s.repo.CreateEmployee(ctx, emailAddr, hash, name, role, phone)
}

func (s *AuthService) DeleteEmployee(ctx context.Context, id string) error {
	return s.repo.DeleteEmployee(ctx, id)
}

func (s *AuthService) ResetEmployeePassword(ctx context.Context, id, password string) error {
	if len(password) < 6 {
		return errors.New("password must be at least 6 characters")
	}
	hash, err := repositories.HashPassword(password)
	if err != nil {
		return err
	}
	return s.repo.ResetEmployeePassword(ctx, id, hash)
}

// --- Partner management (admin) ---

func (s *AuthService) ListPartners(ctx context.Context) ([]models.Partner, error) {
	return s.repo.ListPartners(ctx)
}

func (s *AuthService) CreatePartner(ctx context.Context, emailAddr, password, name, agency, phone, city string, commission float64) (string, error) {
	emailAddr = strings.ToLower(strings.TrimSpace(emailAddr))
	if !validEmail(emailAddr) {
		return "", errors.New("invalid email")
	}
	if len(password) < 6 {
		return "", errors.New("password must be at least 6 characters")
	}
	if name == "" {
		return "", errors.New("name is required")
	}
	hash, err := repositories.HashPassword(password)
	if err != nil {
		return "", err
	}
	return s.repo.CreatePartner(ctx, emailAddr, hash, name, agency, phone, city, commission)
}

func (s *AuthService) UpdatePartner(ctx context.Context, id string, fields map[string]any) error {
	return s.repo.UpdatePartner(ctx, id, fields)
}

func (s *AuthService) DeletePartner(ctx context.Context, id string) error {
	return s.repo.DeletePartner(ctx, id)
}

// --- helpers ---

func validEmail(e string) bool {
	return strings.Contains(e, "@") && strings.Contains(e, ".")
}

func validRole(r string) bool {
	switch r {
	case "admin", "sales", "support", "marketing", "operator", "manager":
		return true
	}
	return false
}

func genOTP() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(1000000))
	return fmt.Sprintf("%06d", n.Int64())
}

func hashOTP(emailAddr, code string) string {
	sum := sha256.Sum256([]byte("ylt-otp|" + emailAddr + "|" + code))
	return hex.EncodeToString(sum[:])
}
