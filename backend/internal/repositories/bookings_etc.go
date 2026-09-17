package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/ylttravels/transit-os/backend/internal/models"
)

// --- Bookings repository ---

type BookingRepo struct{ db *sql.DB }

func NewBookingRepo(db *sql.DB) *BookingRepo { return &BookingRepo{db: db} }

func (r *BookingRepo) Create(ctx context.Context, b *models.Booking) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	if b.UserType == "" {
		b.UserType = "customer"
	}
	if b.Status == "" {
		b.Status = "confirmed"
	}
	if b.PaymentStatus == "" {
		b.PaymentStatus = "pending"
	}
	q := `INSERT INTO bookings (id, pnr, bus_id, bus_name, operator, from_city, to_city,
	      travel_date, departure_time, seats, passengers, contact_email, contact_phone,
	      total_amount, status, user_identifier, user_type, boarding_point, dropping_point,
	      payment_status, utr, created_at)
	      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`
	_, err := r.db.ExecContext(ctx, q,
		b.ID, b.PNR, b.BusID, b.BusName, b.Operator, b.FromCity, b.ToCity,
		b.TravelDate, b.DepartureTime, b.Seats, b.Passengers, b.ContactEmail,
		b.ContactPhone, b.TotalAmount, b.Status, b.UserIdentifier, b.UserType,
		b.BoardingPoint, b.DroppingPoint, b.PaymentStatus, b.UTR)
	return err
}

func (r *BookingRepo) GetByPNR(ctx context.Context, pnr string) (*models.Booking, error) {
	var b models.Booking
	err := r.scanBooking(r.db.QueryRowContext(ctx, bookingSelect+` WHERE LOWER(pnr) = LOWER(?) LIMIT 1`, pnr), &b)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &b, err
}

func (r *BookingRepo) ListByUser(ctx context.Context, user string) ([]models.Booking, error) {
	rows, err := r.db.QueryContext(ctx, bookingSelect+` WHERE user_identifier = ? ORDER BY created_at DESC`, user)
	if err != nil {
		return nil, err
	}
	return scanBookings(rows)
}

func (r *BookingRepo) ListAll(ctx context.Context, limit int) ([]models.Booking, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	rows, err := r.db.QueryContext(ctx, bookingSelect+` ORDER BY created_at DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	return scanBookings(rows)
}

func (r *BookingRepo) Lookup(ctx context.Context, term string) ([]models.Booking, error) {
	rows, err := r.db.QueryContext(ctx,
		bookingSelect+` WHERE LOWER(pnr) = LOWER(?) OR contact_phone LIKE ? OR contact_email LIKE ? ORDER BY created_at DESC LIMIT 50`,
		term, "%"+term+"%", "%"+term+"%")
	if err != nil {
		return nil, err
	}
	return scanBookings(rows)
}

func (r *BookingRepo) UpdatePayment(ctx context.Context, pnr, utr, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE bookings SET utr = ?, payment_status = ? WHERE pnr = ?`, utr, status, pnr)
	return err
}

const bookingSelect = `SELECT id, pnr, bus_id, bus_name, operator, from_city, to_city,
       travel_date, departure_time, seats, passengers, contact_email, contact_phone,
       total_amount, status, user_identifier, user_type, boarding_point, dropping_point,
       payment_status, utr, created_at FROM bookings`

func (r *BookingRepo) scanBooking(row *sql.Row, b *models.Booking) error {
	return row.Scan(
		&b.ID, &b.PNR, &b.BusID, &b.BusName, &b.Operator, &b.FromCity, &b.ToCity,
		&b.TravelDate, &b.DepartureTime, &b.Seats, &b.Passengers, &b.ContactEmail,
		&b.ContactPhone, &b.TotalAmount, &b.Status, &b.UserIdentifier, &b.UserType,
		&b.BoardingPoint, &b.DroppingPoint, &b.PaymentStatus, &b.UTR, &b.CreatedAt)
}

func scanBookings(rows *sql.Rows) ([]models.Booking, error) {
	defer rows.Close()
	out := make([]models.Booking, 0)
	for rows.Next() {
		var b models.Booking
		if err := rows.Scan(
			&b.ID, &b.PNR, &b.BusID, &b.BusName, &b.Operator, &b.FromCity, &b.ToCity,
			&b.TravelDate, &b.DepartureTime, &b.Seats, &b.Passengers, &b.ContactEmail,
			&b.ContactPhone, &b.TotalAmount, &b.Status, &b.UserIdentifier, &b.UserType,
			&b.BoardingPoint, &b.DroppingPoint, &b.PaymentStatus, &b.UTR, &b.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, nil
}

// --- Directors repository ---

type DirectorRepo struct{ db *sql.DB }

func NewDirectorRepo(db *sql.DB) *DirectorRepo { return &DirectorRepo{db: db} }

func (r *DirectorRepo) List(ctx context.Context) ([]models.Director, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, full_name, title, bio, image_url, created_at FROM directors ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.Director, 0)
	for rows.Next() {
		var d models.Director
		if err := rows.Scan(&d.ID, &d.FullName, &d.Title, &d.Bio, &d.ImageURL, &d.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, nil
}

func (r *DirectorRepo) Upsert(ctx context.Context, d *models.Director) error {
	if d.ID == "" {
		d.ID = uuid.NewString()
	}
	q := `INSERT INTO directors (id, full_name, title, bio, image_url, created_at)
	      VALUES (?, ?, ?, ?, ?, NOW())
	      ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), title=VALUES(title),
	      bio=VALUES(bio), image_url=VALUES(image_url)`
	_, err := r.db.ExecContext(ctx, q, d.ID, d.FullName, d.Title, d.Bio, d.ImageURL)
	return err
}

func (r *DirectorRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM directors WHERE id = ?`, id)
	return err
}

// --- Offers repository ---

type OfferRepo struct{ db *sql.DB }

func NewOfferRepo(db *sql.DB) *OfferRepo { return &OfferRepo{db: db} }

func (r *OfferRepo) List(ctx context.Context, all bool) ([]models.Offer, error) {
	q := `SELECT id, promo_code, title, description, discount_value, expiry_date, is_active, created_at FROM offers ORDER BY created_at DESC`
	if !all {
		q += ` WHERE is_active = 1`
	}
	rows, err := r.db.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.Offer, 0)
	for rows.Next() {
		var o models.Offer
		if err := rows.Scan(&o.ID, &o.PromoCode, &o.Title, &o.Description,
			&o.DiscountValue, &o.ExpiryDate, &o.IsActive, &o.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, nil
}

func (r *OfferRepo) Upsert(ctx context.Context, o *models.Offer) error {
	if o.ID == "" {
		o.ID = uuid.NewString()
	}
	q := `INSERT INTO offers (id, promo_code, title, description, discount_value, expiry_date, is_active, created_at)
	      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
	      ON DUPLICATE KEY UPDATE promo_code=VALUES(promo_code), title=VALUES(title),
	      description=VALUES(description), discount_value=VALUES(discount_value),
	      expiry_date=VALUES(expiry_date), is_active=VALUES(is_active)`
	_, err := r.db.ExecContext(ctx, q, o.ID, o.PromoCode, o.Title, o.Description,
		o.DiscountValue, o.ExpiryDate, o.IsActive)
	return err
}

func (r *OfferRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM offers WHERE id = ?`, id)
	return err
}

// --- Routes repository ---

type RouteRepo struct{ db *sql.DB }

func NewRouteRepo(db *sql.DB) *RouteRepo { return &RouteRepo{db: db} }

func (r *RouteRepo) List(ctx context.Context, all bool) ([]models.Route, error) {
	q := `SELECT id, from_city, to_city, distance_km, duration, departure_time, base_fare, total_seats, departures_daily, is_active, created_at FROM routes`
	if all {
		q += ` ORDER BY from_city, to_city`
	} else {
		q += ` WHERE is_active = 1 ORDER BY from_city`
	}
	rows, err := r.db.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.Route, 0)
	for rows.Next() {
		var rt models.Route
		if err := rows.Scan(&rt.ID, &rt.FromCity, &rt.ToCity, &rt.DistanceKM,
			&rt.Duration, &rt.DepartureTime, &rt.BaseFare, &rt.TotalSeats,
			&rt.DeparturesDaily, &rt.IsActive, &rt.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, rt)
	}
	return out, nil
}

func (r *RouteRepo) Upsert(ctx context.Context, rt *models.Route) error {
	if rt.ID == "" {
		rt.ID = uuid.NewString()
	}
	q := `INSERT INTO routes (id, from_city, to_city, distance_km, duration, departure_time, base_fare, total_seats, departures_daily, is_active, created_at)
	      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
	      ON DUPLICATE KEY UPDATE from_city=VALUES(from_city), to_city=VALUES(to_city),
	      distance_km=VALUES(distance_km), duration=VALUES(duration), departure_time=VALUES(departure_time),
	      base_fare=VALUES(base_fare), total_seats=VALUES(total_seats),
	      departures_daily=VALUES(departures_daily), is_active=VALUES(is_active)`
	_, err := r.db.ExecContext(ctx, q, rt.ID, rt.FromCity, rt.ToCity, rt.DistanceKM,
		rt.Duration, rt.DepartureTime, rt.BaseFare, rt.TotalSeats,
		rt.DeparturesDaily, rt.IsActive)
	return err
}

func (r *RouteRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM routes WHERE id = ?`, id)
	return err
}

// --- Payments repository ---

type PaymentRepo struct{ db *sql.DB }

func NewPaymentRepo(db *sql.DB) *PaymentRepo { return &PaymentRepo{db: db} }

func (r *PaymentRepo) List(ctx context.Context) ([]models.Payment, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, booking_id, pnr, amount, method, utr, status, submitted_by, note, created_at, verified_at FROM payments ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.Payment, 0)
	for rows.Next() {
		var p models.Payment
		if err := rows.Scan(&p.ID, &p.BookingID, &p.PNR, &p.Amount, &p.Method,
			&p.UTR, &p.Status, &p.SubmittedBy, &p.Note, &p.CreatedAt, &p.VerifiedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, nil
}

func (r *PaymentRepo) Create(ctx context.Context, p *models.Payment) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	if p.Status == "" {
		p.Status = "pending"
	}
	if p.Method == "" {
		p.Method = "upi"
	}
	q := `INSERT INTO payments (id, booking_id, pnr, amount, method, utr, status, submitted_by, note, created_at)
	      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`
	_, err := r.db.ExecContext(ctx, q, p.ID, p.BookingID, p.PNR, p.Amount,
		p.Method, p.UTR, p.Status, p.SubmittedBy, p.Note)
	return err
}

func (r *PaymentRepo) SetStatus(ctx context.Context, id, status string) error {
	if status != "verified" && status != "rejected" {
		return fmt.Errorf("invalid payment status: %s", status)
	}
	_, err := r.db.ExecContext(ctx,
		`UPDATE payments SET status = ?, verified_at = NOW() WHERE id = ?`, status, id)
	return err
}

// --- Newsletter repository ---

type NewsletterRepo struct{ db *sql.DB }

func NewNewsletterRepo(db *sql.DB) *NewsletterRepo { return &NewsletterRepo{db: db} }

func (r *NewsletterRepo) List(ctx context.Context) ([]models.NewsletterSubscriber, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, email, name, source, is_active, created_at FROM newsletter_subscribers ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.NewsletterSubscriber, 0)
	for rows.Next() {
		var n models.NewsletterSubscriber
		if err := rows.Scan(&n.ID, &n.Email, &n.Name, &n.Source, &n.IsActive, &n.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, nil
}

func (r *NewsletterRepo) Subscribe(ctx context.Context, email, name, source string) (string, error) {
	id := uuid.NewString()
	if source == "" {
		source = "footer"
	}
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO newsletter_subscribers (id, email, name, source, is_active, created_at)
		 VALUES (?, ?, ?, ?, 1, NOW())
		 ON DUPLICATE KEY UPDATE is_active = 1, name = VALUES(name)`,
		id, email, name, source)
	return id, err
}

func (r *NewsletterRepo) Unsubscribe(ctx context.Context, email string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE newsletter_subscribers SET is_active = 0 WHERE email = ?`, email)
	return err
}

func (r *NewsletterRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM newsletter_subscribers WHERE id = ?`, id)
	return err
}
