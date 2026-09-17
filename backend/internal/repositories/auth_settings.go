// Package repositories holds the data-access layer. Each repository owns
// the SQL for one module and returns typed models. All queries use
// QueryContext / ExecContext so they honor request deadlines and draw from
// the shared bounded *sql.DB pool. SQL is MySQL-compatible.
package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/ylttravels/transit-os/backend/internal/models"
)

// --- Auth repository ---

type AuthRepo struct{ db *sql.DB }

func NewAuthRepo(db *sql.DB) *AuthRepo { return &AuthRepo{db: db} }

func (r *AuthRepo) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var u models.User
	err := r.db.QueryRowContext(ctx,
		`SELECT id, email, password, name FROM users WHERE email = ?`, email).
		Scan(&u.ID, &u.Email, &u.Password, &u.Name)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("auth: get user: %w", err)
	}
	u.Type = "customer"
	return &u, nil
}

func (r *AuthRepo) CreateUser(ctx context.Context, email, hashedPassword, name string) (string, error) {
	id := uuid.NewString()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)`,
		id, email, hashedPassword, name)
	if err != nil {
		return "", fmt.Errorf("auth: create user: %w", err)
	}
	return id, nil
}

func (r *AuthRepo) UpdatePassword(ctx context.Context, email, hashedPassword string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET password = ? WHERE email = ?`, hashedPassword, email)
	return err
}

// --- OTP repository ---

func (r *AuthRepo) CountRecentOTPs(ctx context.Context, email string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM otp_codes WHERE email = ? AND created_at >= (NOW() - INTERVAL 10 MINUTE)`,
		email).Scan(&count)
	return count, err
}

func (r *AuthRepo) InsertOTP(ctx context.Context, email, code string) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO otp_codes (id, email, code, expires_at, used) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0)`,
		uuid.NewString(), email, code)
	return err
}

func (r *AuthRepo) LatestOTP(ctx context.Context, email string) (*models.OTPCode, error) {
	var o models.OTPCode
	err := r.db.QueryRowContext(ctx,
		`SELECT id, email, code, expires_at, used FROM otp_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1`,
		email).Scan(&o.ID, &o.Email, &o.Code, &o.ExpiresAt, &o.Used)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *AuthRepo) MarkOTPUsed(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE otp_codes SET used = 1 WHERE id = ?`, id)
	return err
}

// --- Employee repository (auth-side) ---

func (r *AuthRepo) GetEmployeeByEmail(ctx context.Context, email string) (*models.Employee, error) {
	var e models.Employee
	err := r.db.QueryRowContext(ctx,
		`SELECT id, email, password_hash, name, role, status FROM employees WHERE email = ?`,
		email).Scan(&e.ID, &e.Email, &e.PasswordHash, &e.Name, &e.Role, &e.Status)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *AuthRepo) ListEmployees(ctx context.Context) ([]models.Employee, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, email, name, role, phone, status, created_at FROM employees ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.Employee, 0)
	for rows.Next() {
		var e models.Employee
		if err := rows.Scan(&e.ID, &e.Email, &e.Name, &e.Role, &e.Phone, &e.Status, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, nil
}

func (r *AuthRepo) CreateEmployee(ctx context.Context, email, hash, name, role, phone string) (string, error) {
	id := uuid.NewString()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO employees (id, email, password_hash, name, role, phone, status) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
		id, email, hash, name, role, phone)
	return id, err
}

func (r *AuthRepo) DeleteEmployee(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM employees WHERE id = ?`, id)
	return err
}

func (r *AuthRepo) ResetEmployeePassword(ctx context.Context, id, hash string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE employees SET password_hash = ? WHERE id = ?`, hash, id)
	return err
}

// --- Partner repository (auth-side) ---

func (r *AuthRepo) GetPartnerByEmail(ctx context.Context, email string) (*models.Partner, error) {
	var p models.Partner
	err := r.db.QueryRowContext(ctx,
		`SELECT id, email, password_hash, name, status FROM partners WHERE email = ?`,
		email).Scan(&p.ID, &p.Email, &p.PasswordHash, &p.Name, &p.Status)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *AuthRepo) ListPartners(ctx context.Context) ([]models.Partner, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, email, name, agency_name, phone, city, status, commission_rate, created_at FROM partners ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.Partner, 0)
	for rows.Next() {
		var p models.Partner
		if err := rows.Scan(&p.ID, &p.Email, &p.Name, &p.AgencyName, &p.Phone,
			&p.City, &p.Status, &p.CommissionRate, &p.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, nil
}

func (r *AuthRepo) CreatePartner(ctx context.Context, email, hash, name, agency, phone, city string, commission float64) (string, error) {
	id := uuid.NewString()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO partners (id, email, password_hash, name, agency_name, phone, city, status, commission_rate) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
		id, email, hash, name, agency, phone, city, commission)
	return id, err
}

func (r *AuthRepo) UpdatePartner(ctx context.Context, id string, fields map[string]any) error {
	if len(fields) == 0 {
		return errors.New("no fields to update")
	}
	setParts := make([]string, 0, len(fields))
	vals := make([]any, 0, len(fields)+1)
	for k, v := range fields {
		setParts = append(setParts, fmt.Sprintf("%s = ?", k))
		vals = append(vals, v)
	}
	vals = append(vals, id)
	q := fmt.Sprintf("UPDATE partners SET %s, updated_at = NOW() WHERE id = ?", strings.Join(setParts, ", "))
	_, err := r.db.ExecContext(ctx, q, vals...)
	return err
}

func (r *AuthRepo) DeletePartner(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM partners WHERE id = ?`, id)
	return err
}

// --- App settings repository ---

type SettingsRepo struct{ db *sql.DB }

func NewSettingsRepo(db *sql.DB) *SettingsRepo { return &SettingsRepo{db: db} }

func (r *SettingsRepo) Get(ctx context.Context) (*models.AppSettings, error) {
	var s models.AppSettings
	q := `SELECT id, upi_id, upi_name, upi_qr_url, bank_name, account_name,
	             account_number, ifsc, branch, smtp_host, smtp_port, smtp_user,
	             smtp_password, smtp_from_email, smtp_from_name, smtp_secure,
	             email_enabled, updated_at
	      FROM app_settings WHERE id = 1`
	err := r.db.QueryRowContext(ctx, q).Scan(
		&s.ID, &s.UPIID, &s.UPIName, &s.UPIQRURL, &s.BankName, &s.AccountName,
		&s.AccountNumber, &s.IFSC, &s.Branch, &s.SMTPHost, &s.SMTPPort,
		&s.SMTPUser, &s.SMTPPassword, &s.SMTPFromEmail, &s.SMTPFromName,
		&s.SMTPSecure, &s.EmailEnabled, &s.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		_, _ = r.db.ExecContext(ctx, `INSERT IGNORE INTO app_settings (id) VALUES (1)`)
		return r.Get(ctx)
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *SettingsRepo) Update(ctx context.Context, s models.AppSettings) error {
	q := `UPDATE app_settings SET
	        upi_id=?, upi_name=?, upi_qr_url=?, bank_name=?, account_name=?,
	        account_number=?, ifsc=?, branch=?, smtp_host=?, smtp_port=?,
	        smtp_user=?, smtp_password=?, smtp_from_email=?, smtp_from_name=?,
	        smtp_secure=?, email_enabled=?, updated_at=NOW()
	      WHERE id = 1`
	_, err := r.db.ExecContext(ctx, q,
		s.UPIID, s.UPIName, s.UPIQRURL, s.BankName, s.AccountName,
		s.AccountNumber, s.IFSC, s.Branch, s.SMTPHost, s.SMTPPort,
		s.SMTPUser, s.SMTPPassword, s.SMTPFromEmail, s.SMTPFromName,
		s.SMTPSecure, s.EmailEnabled)
	return err
}

// --- Email template repository ---

type EmailTemplateRepo struct{ db *sql.DB }

func NewEmailTemplateRepo(db *sql.DB) *EmailTemplateRepo { return &EmailTemplateRepo{db: db} }

func (r *EmailTemplateRepo) List(ctx context.Context) ([]models.EmailTemplate, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, ` + "`key`" + `, name, description, subject, body_html, available_variables, is_active, created_at, updated_at FROM email_templates ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.EmailTemplate, 0)
	for rows.Next() {
		var t models.EmailTemplate
		if err := rows.Scan(&t.ID, &t.Key, &t.Name, &t.Description, &t.Subject,
			&t.BodyHTML, &t.AvailableVariables, &t.IsActive, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, nil
}

func (r *EmailTemplateRepo) GetByKey(ctx context.Context, key string) (*models.EmailTemplate, error) {
	var t models.EmailTemplate
	err := r.db.QueryRowContext(ctx,
		`SELECT id, `+"`key`"+`, name, description, subject, body_html, available_variables, is_active, created_at, updated_at FROM email_templates WHERE `+"`key`"+` = ? AND is_active = 1`,
		key).Scan(&t.ID, &t.Key, &t.Name, &t.Description, &t.Subject,
		&t.BodyHTML, &t.AvailableVariables, &t.IsActive, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &t, err
}

func (r *EmailTemplateRepo) Update(ctx context.Context, t models.EmailTemplate) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE email_templates SET subject=?, body_html=?, name=?, description=?, is_active=?, updated_at=NOW() WHERE id=?`,
		t.Subject, t.BodyHTML, t.Name, t.Description, t.IsActive, t.ID)
	return err
}

// HashPassword and CheckPassword are shared helpers used by auth + employee/partner repos.
func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	return string(b), err
}

func CheckPassword(hashed, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashed), []byte(plain)) == nil
}
