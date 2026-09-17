// Package email provides a thin SMTP sender + template renderer. Replaces
// the PHP lib/smtp.php + render_email_template helper.
package email

import (
	"crypto/tls"
	"errors"
	"fmt"
	"net/smtp"
	"strings"
)

// SMTPConfig mirrors the per-row SMTP settings stored in app_settings.
type SMTPConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	From     string
	FromName string
	Secure   bool // true = implicit TLS (465), false = STARTTLS/plain
}

// Send delivers an HTML email via SMTP. Mirrors the PHP smtp_send behavior.
func Send(cfg SMTPConfig, to, subject, htmlBody string) error {
	if cfg.Host == "" || cfg.User == "" || cfg.Password == "" {
		return errors.New("email: SMTP not configured")
	}
	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	from := cfg.From
	if from == "" {
		from = cfg.User
	}
	fromName := cfg.FromName
	if fromName == "" {
		fromName = "YLT Travels"
	}

	msg := buildMessage(from, fromName, to, subject, htmlBody)
	auth := smtp.PlainAuth("", cfg.User, cfg.Password, cfg.Host)

	if cfg.Secure {
		// Implicit TLS (port 465) — dial a TLS-wrapped connection.
		tlsCfg := &tls.Config{ServerName: cfg.Host}
		conn, err := tls.Dial("tcp", addr, tlsCfg)
		if err != nil {
			return fmt.Errorf("email: tls dial: %w", err)
		}
		defer conn.Close()
		client, err := smtp.NewClient(conn, cfg.Host)
		if err != nil {
			return fmt.Errorf("email: smtp client: %w", err)
		}
		defer client.Quit()
		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("email: auth: %w", err)
		}
		if err = client.Mail(from); err != nil {
			return fmt.Errorf("email: MAIL FROM: %w", err)
		}
		if err = client.Rcpt(to); err != nil {
			return fmt.Errorf("email: RCPT TO: %w", err)
		}
		w, err := client.Data()
		if err != nil {
			return fmt.Errorf("email: DATA: %w", err)
		}
		if _, err = w.Write([]byte(msg)); err != nil {
			return fmt.Errorf("email: write body: %w", err)
		}
		return w.Close()
	}
	// Plain / STARTTLS — use net/smtp.SendMail.
	return smtp.SendMail(addr, auth, from, []string{to}, []byte(msg))
}

// buildMessage constructs the raw RFC 822 message with MIME HTML part.
func buildMessage(from, fromName, to, subject, html string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "From: %s <%s>\r\n", fromName, from)
	fmt.Fprintf(&b, "To: %s\r\n", to)
	fmt.Fprintf(&b, "Subject: %s\r\n", subject)
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	b.WriteString("\r\n")
	b.WriteString(html)
	return b.String()
}

// RenderTemplate substitutes {{var}} placeholders in subject and body.
// Mirrors the PHP render_email_template helper's {{var}} replacement.
func RenderTemplate(subject, body string, vars map[string]string) (string, string) {
	for k, v := range vars {
		ph := "{{" + k + "}}"
		subject = strings.ReplaceAll(subject, ph, v)
		body = strings.ReplaceAll(body, ph, v)
	}
	return subject, body
}
