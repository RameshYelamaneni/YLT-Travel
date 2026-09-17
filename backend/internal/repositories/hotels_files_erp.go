package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/ylttravels/transit-os/backend/internal/models"
)

// --- Hotels repository ---

type HotelRepo struct{ db *sql.DB }

func NewHotelRepo(db *sql.DB) *HotelRepo { return &HotelRepo{db: db} }

func (r *HotelRepo) GetByID(ctx context.Context, id string) (*models.Hotel, error) {
	var h models.Hotel
	err := r.scanHotel(r.db.QueryRowContext(ctx, hotelSelect+` WHERE id = ? LIMIT 1`, id), &h)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &h, err
}

func (r *HotelRepo) ListActive(ctx context.Context, city string) ([]models.Hotel, error) {
	q := hotelSelect + ` WHERE is_active = 1`
	args := []any{}
	if city != "" && city != "all" {
		q += ` AND city = ?`
		args = append(args, city)
	}
	q += ` ORDER BY rating DESC`
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	return scanHotels(rows)
}

func (r *HotelRepo) Upsert(ctx context.Context, h *models.Hotel) error {
	if h.ID == "" {
		h.ID = uuid.NewString()
	}
	q := `INSERT INTO hotels (id, name, city, area, address, star_rating, description,
	      amenities, image_url, gallery_urls, price_per_night, rooms_available,
	      rating, reviews, is_active, created_at)
	      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
	      ON DUPLICATE KEY UPDATE name=VALUES(name), city=VALUES(city), area=VALUES(area),
	      address=VALUES(address), star_rating=VALUES(star_rating), description=VALUES(description),
	      amenities=VALUES(amenities), image_url=VALUES(image_url), gallery_urls=VALUES(gallery_urls),
	      price_per_night=VALUES(price_per_night), rooms_available=VALUES(rooms_available),
	      rating=VALUES(rating), reviews=VALUES(reviews), is_active=1`
	_, err := r.db.ExecContext(ctx, q, h.ID, h.Name, h.City, h.Area, h.Address,
		h.StarRating, h.Description, h.Amenities, h.ImageURL, h.GalleryURLs,
		h.PricePerNight, h.RoomsAvailable, h.Rating, h.Reviews)
	return err
}

func (r *HotelRepo) SoftDelete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE hotels SET is_active = 0 WHERE id = ?`, id)
	return err
}

const hotelSelect = `SELECT id, name, city, area, address, star_rating, description,
       amenities, image_url, gallery_urls, price_per_night, rooms_available,
       rating, reviews, is_active, created_at FROM hotels`

func (r *HotelRepo) scanHotel(row *sql.Row, h *models.Hotel) error {
	return row.Scan(&h.ID, &h.Name, &h.City, &h.Area, &h.Address, &h.StarRating,
		&h.Description, &h.Amenities, &h.ImageURL, &h.GalleryURLs,
		&h.PricePerNight, &h.RoomsAvailable, &h.Rating, &h.Reviews,
		&h.IsActive, &h.CreatedAt)
}

func scanHotels(rows *sql.Rows) ([]models.Hotel, error) {
	defer rows.Close()
	out := make([]models.Hotel, 0)
	for rows.Next() {
		var h models.Hotel
		if err := rows.Scan(&h.ID, &h.Name, &h.City, &h.Area, &h.Address,
			&h.StarRating, &h.Description, &h.Amenities, &h.ImageURL,
			&h.GalleryURLs, &h.PricePerNight, &h.RoomsAvailable, &h.Rating,
			&h.Reviews, &h.IsActive, &h.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	return out, nil
}

// --- Hotel bookings repository ---

type HotelBookingRepo struct{ db *sql.DB }

func NewHotelBookingRepo(db *sql.DB) *HotelBookingRepo { return &HotelBookingRepo{db: db} }

func (r *HotelBookingRepo) Create(ctx context.Context, b *models.HotelBooking) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	if b.Status == "" {
		b.Status = "confirmed"
	}
	q := `INSERT INTO hotel_bookings (id, pnr, hotel_id, hotel_name, city, guest_name,
	      guest_email, guest_phone, check_in, check_out, rooms, guests, room_type,
	      total_amount, status, created_at)
	      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`
	_, err := r.db.ExecContext(ctx, q, b.ID, b.PNR, b.HotelID, b.HotelName, b.City,
		b.GuestName, b.GuestEmail, b.GuestPhone, b.CheckIn, b.CheckOut, b.Rooms,
		b.Guests, b.RoomType, b.TotalAmount, b.Status)
	return err
}

func (r *HotelBookingRepo) GetByPNR(ctx context.Context, pnr string) (*models.HotelBooking, error) {
	var b models.HotelBooking
	err := r.scanHotelBooking(r.db.QueryRowContext(ctx, hotelBookingSelect+` WHERE LOWER(pnr) = LOWER(?) LIMIT 1`, pnr), &b)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &b, err
}

func (r *HotelBookingRepo) ListByGuest(ctx context.Context, email string) ([]models.HotelBooking, error) {
	rows, err := r.db.QueryContext(ctx, hotelBookingSelect+` WHERE guest_email = ? ORDER BY created_at DESC`, email)
	if err != nil {
		return nil, err
	}
	return scanHotelBookings(rows)
}

func (r *HotelBookingRepo) ListAll(ctx context.Context, limit int) ([]models.HotelBooking, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	rows, err := r.db.QueryContext(ctx, hotelBookingSelect+` ORDER BY created_at DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	return scanHotelBookings(rows)
}

func (r *HotelBookingRepo) Lookup(ctx context.Context, term string) ([]models.HotelBooking, error) {
	rows, err := r.db.QueryContext(ctx,
		hotelBookingSelect+` WHERE LOWER(pnr) = LOWER(?) OR guest_email LIKE ? OR guest_phone LIKE ? ORDER BY created_at DESC LIMIT 50`,
		term, "%"+term+"%", "%"+term+"%")
	if err != nil {
		return nil, err
	}
	return scanHotelBookings(rows)
}

const hotelBookingSelect = `SELECT id, pnr, hotel_id, hotel_name, city, guest_name,
       guest_email, guest_phone, check_in, check_out, rooms, guests, room_type,
       total_amount, status, created_at FROM hotel_bookings`

func (r *HotelBookingRepo) scanHotelBooking(row *sql.Row, b *models.HotelBooking) error {
	return row.Scan(&b.ID, &b.PNR, &b.HotelID, &b.HotelName, &b.City, &b.GuestName,
		&b.GuestEmail, &b.GuestPhone, &b.CheckIn, &b.CheckOut, &b.Rooms, &b.Guests,
		&b.RoomType, &b.TotalAmount, &b.Status, &b.CreatedAt)
}

func scanHotelBookings(rows *sql.Rows) ([]models.HotelBooking, error) {
	defer rows.Close()
	out := make([]models.HotelBooking, 0)
	for rows.Next() {
		var b models.HotelBooking
		if err := rows.Scan(&b.ID, &b.PNR, &b.HotelID, &b.HotelName, &b.City,
			&b.GuestName, &b.GuestEmail, &b.GuestPhone, &b.CheckIn, &b.CheckOut,
			&b.Rooms, &b.Guests, &b.RoomType, &b.TotalAmount, &b.Status, &b.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, nil
}

// --- Employee files repository ---

type EmployeeFileRepo struct{ db *sql.DB }

func NewEmployeeFileRepo(db *sql.DB) *EmployeeFileRepo { return &EmployeeFileRepo{db: db} }

func (r *EmployeeFileRepo) List(ctx context.Context, folder string) ([]models.EmployeeFile, error) {
	var rows *sql.Rows
	var err error
	if folder != "" {
		rows, err = r.db.QueryContext(ctx,
			`SELECT id, uploaded_by_email, uploaded_by_name, filename, mime_type, size_bytes, folder, description, created_at FROM employee_files WHERE folder = ? ORDER BY created_at DESC`, folder)
	} else {
		rows, err = r.db.QueryContext(ctx,
			`SELECT id, uploaded_by_email, uploaded_by_name, filename, mime_type, size_bytes, folder, description, created_at FROM employee_files ORDER BY created_at DESC`)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.EmployeeFile, 0)
	for rows.Next() {
		var f models.EmployeeFile
		if err := rows.Scan(&f.ID, &f.UploadedByEmail, &f.UploadedByName,
			&f.Filename, &f.MimeType, &f.SizeBytes, &f.Folder, &f.Description,
			&f.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, nil
}

func (r *EmployeeFileRepo) Folders(ctx context.Context) ([]map[string]any, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT folder, COUNT(*) as count, COALESCE(SUM(size_bytes),0) as size FROM employee_files GROUP BY folder ORDER BY folder ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]map[string]any, 0)
	for rows.Next() {
		var folder string
		var count, size int64
		if err := rows.Scan(&folder, &count, &size); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{"folder": folder, "count": count, "size": size})
	}
	return out, nil
}

func (r *EmployeeFileRepo) Create(ctx context.Context, f *models.EmployeeFile) (string, error) {
	if f.ID == "" {
		f.ID = uuid.NewString()
	}
	q := `INSERT INTO employee_files (id, uploaded_by_email, uploaded_by_name, filename, mime_type, size_bytes, folder, description, file_data)
	      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, q, f.ID, f.UploadedByEmail, f.UploadedByName,
		f.Filename, f.MimeType, f.SizeBytes, f.Folder, f.Description, "")
	return f.ID, err
}

func (r *EmployeeFileRepo) GetFileMeta(ctx context.Context, id string) (*models.EmployeeFile, error) {
	var f models.EmployeeFile
	err := r.db.QueryRowContext(ctx,
		`SELECT id, uploaded_by_email, uploaded_by_name, filename, mime_type, size_bytes, folder, description, created_at FROM employee_files WHERE id = ?`,
		id).Scan(&f.ID, &f.UploadedByEmail, &f.UploadedByName, &f.Filename,
		&f.MimeType, &f.SizeBytes, &f.Folder, &f.Description, &f.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &f, err
}

func (r *EmployeeFileRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM employee_files WHERE id = ?`, id)
	return err
}

// --- Generic ERP CRUD repository ---

var erpTableWhitelist = map[string]bool{
	"erp_buses": true, "erp_bus_health": true, "erp_bus_expenses": true,
	"erp_crew": true, "erp_crew_documents": true, "erp_shifts": true,
	"erp_sla_scores": true, "erp_seat_inventory": true, "erp_seat_locks": true,
	"erp_channel_sales": true, "erp_routes": true, "erp_schedules": true,
	"erp_live_trips": true, "erp_earnings": true, "erp_settlements": true,
	"erp_payouts": true, "erp_maintenance_logs": true, "erp_part_replacements": true,
	"erp_compliance": true, "erp_insights": true, "erp_expenses": true,
	"erp_pl_reports": true, "erp_partner_profile": true, "erp_roles": true,
	"erp_audit_logs": true, "erp_api_keys": true,
}

type ErpCrudRepo struct{ db *sql.DB }

func NewErpCrudRepo(db *sql.DB) *ErpCrudRepo { return &ErpCrudRepo{db: db} }

func (r *ErpCrudRepo) isAllowed(table string) bool { return erpTableWhitelist[table] }

func (r *ErpCrudRepo) List(ctx context.Context, table string) ([]map[string]any, error) {
	if !r.isAllowed(table) {
		return nil, fmt.Errorf("erp: table %q is not whitelisted", table)
	}
	rows, err := r.db.QueryContext(ctx, fmt.Sprintf("SELECT * FROM %s ORDER BY created_at DESC LIMIT 500", table))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return rowsToMaps(rows)
}

func (r *ErpCrudRepo) Get(ctx context.Context, table, id string) (map[string]any, error) {
	if !r.isAllowed(table) {
		return nil, fmt.Errorf("erp: table %q is not whitelisted", table)
	}
	rows, err := r.db.QueryContext(ctx, fmt.Sprintf("SELECT * FROM %s WHERE id = ? LIMIT 1", table), id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	maps, err := rowsToMaps(rows)
	if err != nil {
		return nil, err
	}
	if len(maps) == 0 {
		return nil, nil
	}
	return maps[0], nil
}

func (r *ErpCrudRepo) Insert(ctx context.Context, table string, fields map[string]any) error {
	if !r.isAllowed(table) {
		return fmt.Errorf("erp: table %q is not whitelisted", table)
	}
	if _, ok := fields["id"]; !ok {
		fields["id"] = uuid.NewString()
	}
	cols := make([]string, 0, len(fields))
	phs := make([]string, 0, len(fields))
	vals := make([]any, 0, len(fields))
	for k, v := range fields {
		cols = append(cols, quoteIdent(k))
		phs = append(phs, "?")
		vals = append(vals, v)
	}
	q := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", table, strings.Join(cols, ", "), strings.Join(phs, ", "))
	_, err := r.db.ExecContext(ctx, q, vals...)
	return err
}

func (r *ErpCrudRepo) Update(ctx context.Context, table, id string, fields map[string]any) error {
	if !r.isAllowed(table) {
		return fmt.Errorf("erp: table %q is not whitelisted", table)
	}
	delete(fields, "id")
	delete(fields, "created_at")
	if len(fields) == 0 {
		return fmt.Errorf("erp: no fields to update")
	}
	setParts := make([]string, 0, len(fields))
	vals := make([]any, 0, len(fields)+1)
	for k, v := range fields {
		setParts = append(setParts, fmt.Sprintf("%s = ?", quoteIdent(k)))
		vals = append(vals, v)
	}
	vals = append(vals, id)
	q := fmt.Sprintf("UPDATE %s SET %s WHERE id = ?", table, strings.Join(setParts, ", "))
	_, err := r.db.ExecContext(ctx, q, vals...)
	return err
}

func (r *ErpCrudRepo) Delete(ctx context.Context, table, id string) error {
	if !r.isAllowed(table) {
		return fmt.Errorf("erp: table %q is not whitelisted", table)
	}
	_, err := r.db.ExecContext(ctx, fmt.Sprintf("DELETE FROM %s WHERE id = ?", table), id)
	return err
}

// --- helpers ---

func rowsToMaps(rows *sql.Rows) ([]map[string]any, error) {
	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0)
	for rows.Next() {
		vals := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		row := make(map[string]any, len(cols))
		for i, c := range cols {
			row[c] = vals[i]
		}
		out = append(out, row)
	}
	return out, nil
}

// quoteIdent wraps reserved-word identifiers in backticks for MySQL.
func quoteIdent(name string) string {
	switch name {
	case "key", "order", "group", "user", "check", "primary", "default":
		return "`" + name + "`"
	default:
		return name
	}
}
