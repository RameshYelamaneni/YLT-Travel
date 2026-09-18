package handlers

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ylttravels/transit-os/backend/internal/models"
	"github.com/ylttravels/transit-os/backend/pkg/email"
)

func (h *SiteAPI) partnersList(c *gin.Context) {
	list, err := h.auth.ListPartners(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	out := make([]gin.H, 0, len(list))
	for _, p := range list {
		out = append(out, gin.H{
			"id": p.ID, "email": p.Email, "name": p.Name,
			"agency_name": ns(p.AgencyName), "phone": ns(p.Phone), "city": ns(p.City),
			"status": p.Status, "commission_rate": p.CommissionRate, "created_at": p.CreatedAt,
		})
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "partners": out})
}

func (h *SiteAPI) partnersCreate(c *gin.Context) {
	var req struct {
		Email          string  `json:"email"`
		Password       string  `json:"password"`
		Name           string  `json:"name"`
		AgencyName     string  `json:"agency_name"`
		Phone          string  `json:"phone"`
		City           string  `json:"city"`
		CommissionRate float64 `json:"commission_rate"`
	}
	_ = c.ShouldBindJSON(&req)
	if req.CommissionRate == 0 {
		req.CommissionRate = 0.08
	}
	id, err := h.auth.CreatePartner(c.Request.Context(), req.Email, req.Password, req.Name, req.AgencyName, req.Phone, req.City, req.CommissionRate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "id": id})
}

func (h *SiteAPI) partnersUpdate(c *gin.Context) {
	var fields map[string]any
	_ = c.ShouldBindJSON(&fields)
	if err := h.auth.UpdatePartner(c.Request.Context(), c.Param("id"), fields); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *SiteAPI) partnersDelete(c *gin.Context) {
	if err := h.auth.DeletePartner(c.Request.Context(), c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *SiteAPI) employeesList(c *gin.Context) {
	list, err := h.auth.ListEmployees(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "employees": list})
}

func (h *SiteAPI) employeesCreate(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
		Role     string `json:"role"`
		Phone    string `json:"phone"`
	}
	_ = c.ShouldBindJSON(&req)
	id, err := h.auth.CreateEmployee(c.Request.Context(), req.Email, req.Password, req.Name, req.Role, req.Phone)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "id": id})
}

func (h *SiteAPI) employeesDelete(c *gin.Context) {
	_ = h.auth.DeleteEmployee(c.Request.Context(), c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *SiteAPI) employeesReset(c *gin.Context) {
	var req struct {
		Password string `json:"password"`
	}
	_ = c.ShouldBindJSON(&req)
	if err := h.auth.ResetEmployeePassword(c.Request.Context(), c.Param("id"), req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *SiteAPI) bookingsGet(c *gin.Context) {
	ctx := c.Request.Context()
	user := c.Query("user")
	out := make([]gin.H, 0)
	var bus []models.Booking
	var err error
	if user != "" {
		bus, err = h.bookings.ListByUser(ctx, user)
	} else {
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "200"))
		bus, err = h.bookings.ListAll(ctx, limit)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, b := range bus {
		out = append(out, gin.H{
			"pnr": b.PNR, "type": "bus", "operator": ns(b.Operator),
			"from_city": b.FromCity, "to_city": b.ToCity, "route": b.FromCity + " → " + b.ToCity,
			"travel_date": b.TravelDate, "date": b.TravelDate, "departure_time": b.DepartureTime,
			"seats": b.Seats, "total_amount": b.TotalAmount, "total": b.TotalAmount, "created_at": b.CreatedAt,
		})
	}
	var hotels []models.HotelBooking
	if user != "" {
		hotels, err = h.hotels.ListByGuest(ctx, user)
	} else {
		hotels, err = h.hotels.ListAll(ctx, 200)
	}
	if err == nil {
		for _, hb := range hotels {
			out = append(out, gin.H{
				"pnr": hb.PNR, "type": "hotel", "operator": hb.HotelName,
				"from_city": hb.City, "to_city": hb.HotelName, "route": hb.City,
				"travel_date": hb.CheckIn, "date": hb.CheckIn, "departure_time": "Check-in",
				"seats": hb.RoomType, "total_amount": hb.TotalAmount, "total": hb.TotalAmount, "created_at": hb.CreatedAt,
			})
		}
	}
	c.JSON(http.StatusOK, out)
}

func (h *SiteAPI) hotelBookingsGet(c *gin.Context) {
	user := c.Query("user")
	var list []models.HotelBooking
	var err error
	if user != "" {
		list, err = h.hotels.ListByGuest(c.Request.Context(), user)
	} else {
		list, err = h.hotels.ListAll(c.Request.Context(), 200)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *SiteAPI) bookingsPost(c *gin.Context) {
	var p map[string]any
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if str(p["type"]) == "hotel" {
		hb := &models.HotelBooking{
			PNR:            str(p["pnr"]),
			HotelID:        nullStr(p["hotel_id"]),
			HotelName:      str(p["hotel_name"]),
			City:           str(p["city"]),
			GuestName:      str(p["guest_name"]),
			GuestEmail:     str(p["guest_email"]),
			GuestPhone:     nullStr(p["guest_phone"]),
			CheckIn:        str(p["check_in"]),
			CheckOut:       str(p["check_out"]),
			Rooms:          intVal(p["rooms"], 1),
			Guests:         intVal(p["guests"], 1),
			RoomType:       str(p["room_type"]),
			TotalAmount:    floatVal(p["total_amount"]),
			Status:         "confirmed",
			UserIdentifier: nullStrFirst(p["user_identifier"], p["guest_email"]),
			PaymentStatus:  "paid",
		}
		if err := h.hotels.Create(c.Request.Context(), hb); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true, "pnr": hb.PNR, "id": hb.ID})
		return
	}
	b := &models.Booking{
		PNR:            str(p["pnr"]),
		BusID:          nullStr(p["bus_id"]),
		BusName:        nullStr(p["bus_name"]),
		Operator:       nullStr(p["operator"]),
		FromCity:       orDefault(str(p["from_city"]), "-"),
		ToCity:         orDefault(str(p["to_city"]), "-"),
		TravelDate:     orDefault(str(p["travel_date"]), "-"),
		DepartureTime:  orDefault(str(p["departure_time"]), "-"),
		Seats:          jsonOrString(p["seats"]),
		Passengers:     jsonOrString(p["passengers"]),
		ContactEmail:   nullStr(p["contact_email"]),
		ContactPhone:   nullStr(p["contact_phone"]),
		TotalAmount:    floatVal(p["total_amount"]),
		Status:         "confirmed",
		UserIdentifier: nullStrFirst(p["user_identifier"], p["contact_email"]),
		UserType:       orDefault(str(p["user_type"]), "customer"),
		BoardingPoint:  nullStr(p["boarding_point"]),
		DroppingPoint:  nullStr(p["dropping_point"]),
		PaymentStatus:  "paid",
	}
	if err := h.bookings.Create(c.Request.Context(), b); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "pnr": b.PNR, "id": b.ID})
}

func (h *SiteAPI) erpList(c *gin.Context) {
	table := c.Query("table")
	rows, err := h.erp.List(c.Request.Context(), table)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rows)
}

func (h *SiteAPI) erpInsert(c *gin.Context) {
	table := c.Query("table")
	var fields map[string]any
	if err := c.ShouldBindJSON(&fields); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if str(fields["id"]) == "" {
		fields["id"] = uuid.NewString()
	}
	if err := h.erp.Insert(c.Request.Context(), table, fields); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, fields)
}

func (h *SiteAPI) erpUpdate(c *gin.Context) {
	table := c.Query("table")
	id := c.Query("id")
	var fields map[string]any
	_ = c.ShouldBindJSON(&fields)
	if err := h.erp.Update(c.Request.Context(), table, id, fields); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "id": id})
}

func (h *SiteAPI) erpDelete(c *gin.Context) {
	table := c.Query("table")
	id := c.Query("id")
	if err := h.erp.Delete(c.Request.Context(), table, id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *SiteAPI) settingsGet(c *gin.Context) {
	row, err := h.settingsMap(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	smtpSet := strMap(row, "smtp_password") != ""
	rzpSet := strMap(row, "razorpay_secret") != ""
	delete(row, "smtp_password")
	delete(row, "razorpay_secret")
	delete(row, "bitla_api_key")
	row["bitla_api_key"] = ""
	row["ok"] = true
	row["smtp_password_set"] = smtpSet
	row["razorpay_secret_set"] = rzpSet
	if strMap(row, "inventory_provider") == "" {
		row["inventory_provider"] = "ylt_db"
	}
	c.JSON(http.StatusOK, row)
}
func (h *SiteAPI) settingsPost(c *gin.Context) {
	var p map[string]any
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cols, err := h.tableCols("app_settings")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	allow := map[string]bool{
		"inventory_provider": true, "bitla_api_url": true, "bitla_api_key": true, "bitla_operator_id": true,
		"razorpay_key_id": true, "razorpay_secret": true, "payment_provider": true, "payments_enabled": true,
		"smtp_host": true, "smtp_port": true, "smtp_user": true, "smtp_password": true,
		"smtp_from_email": true, "smtp_from_name": true, "smtp_secure": true, "email_enabled": true,
		"upi_id": true, "upi_name": true, "whatsapp_number": true, "support_email": true,
	}
	var sets []string
	var vals []any
	for k, v := range p {
		if !allow[k] || !cols[k] {
			continue
		}
		if k == "smtp_password" && (fmt.Sprint(v) == "********" || fmt.Sprint(v) == "") {
			continue
		}
		if k == "razorpay_secret" && fmt.Sprint(v) == "" {
			continue
		}
		if b, ok := v.(bool); ok {
			if b {
				v = 1
			} else {
				v = 0
			}
		}
		sets = append(sets, "`"+k+"`=?")
		vals = append(vals, v)
	}
	if len(sets) > 0 {
		if _, err := h.db.ExecContext(c.Request.Context(), "UPDATE app_settings SET "+strings.Join(sets, ",")+" WHERE id=1", vals...); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *SiteAPI) settingsMap(c *gin.Context) (map[string]any, error) {
	rows, err := h.db.QueryContext(c.Request.Context(), "SELECT * FROM app_settings WHERE id=1")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	maps, err := rowsToAny(rows)
	if err != nil {
		return nil, err
	}
	if len(maps) == 0 {
		return map[string]any{"inventory_provider": "ylt_db"}, nil
	}
	return maps[0], nil
}

func (h *SiteAPI) tableCols(table string) (map[string]bool, error) {
	rows, err := h.db.Query("SHOW COLUMNS FROM `" + table + "`")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]bool{}
	for rows.Next() {
		cols, _ := rows.Columns()
		raw := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range raw {
			ptrs[i] = &raw[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			continue
		}
		if b, ok := raw[0].([]byte); ok {
			out[string(b)] = true
		} else if s, ok := raw[0].(string); ok {
			out[s] = true
		}
	}
	return out, nil
}

func (h *SiteAPI) directorsList(c *gin.Context) {
	list, err := h.directors.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	out := make([]gin.H, 0, len(list))
	for _, d := range list {
		out = append(out, gin.H{
			"id": d.ID, "full_name": d.FullName, "title": d.Title,
			"bio": ns(d.Bio), "image_url": ns(d.ImageURL),
		})
	}
	c.JSON(http.StatusOK, out)
}

func (h *SiteAPI) directorsUpsert(c *gin.Context) {
	var p map[string]any
	_ = c.ShouldBindJSON(&p)
	d := &models.Director{
		ID:       str(p["id"]),
		FullName: str(p["full_name"]),
		Title:    str(p["title"]),
		Bio:      nullStr(p["bio"]),
		ImageURL: nullStr(p["image_url"]),
	}
	if d.FullName == "" {
		d.FullName = str(p["name"])
	}
	if d.Title == "" {
		d.Title = str(p["title"])
		if d.Title == "" {
			d.Title = str(p["role"])
		}
	}
	if err := h.directors.Upsert(c.Request.Context(), d); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "id": d.ID})
}

func (h *SiteAPI) directorsDelete(c *gin.Context) {
	id := c.Query("id")
	if err := h.directors.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func strFirst(a, b any) string {
	if s := str(a); s != "" {
		return s
	}
	return str(b)
}

func truthy(v any) bool {
	switch t := v.(type) {
	case bool:
		return t
	case float64:
		return t != 0
	case int:
		return t != 0
	case string:
		s := strings.ToLower(strings.TrimSpace(t))
		return s == "1" || s == "true" || s == "yes"
	}
	return false
}

func str(v any) string {
	if v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	default:
		s := fmt.Sprint(t)
		if s == "<nil>" {
			return ""
		}
		return s
	}
}

func ns(s sql.NullString) string {
	if s.Valid {
		return s.String
	}
	return ""
}

func nullStr(v any) sql.NullString {
	s := str(v)
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}

func nullStrFirst(a, b any) sql.NullString {
	if s := str(a); s != "" {
		return sql.NullString{String: s, Valid: true}
	}
	return nullStr(b)
}

func floatVal(v any) float64 {
	switch t := v.(type) {
	case float64:
		return t
	case int:
		return float64(t)
	case json.Number:
		f, _ := t.Float64()
		return f
	case string:
		f, _ := strconv.ParseFloat(t, 64)
		return f
	}
	return 0
}

func intVal(v any, def int) int {
	if v == nil {
		return def
	}
	switch t := v.(type) {
	case float64:
		return int(t)
	case int:
		return t
	case string:
		n, err := strconv.Atoi(t)
		if err != nil {
			return def
		}
		return n
	}
	return def
}

func jsonOrString(v any) string {
	if v == nil {
		return "[]"
	}
	switch t := v.(type) {
	case string:
		if t == "" {
			return "[]"
		}
		return t
	default:
		b, err := json.Marshal(t)
		if err != nil {
			return "[]"
		}
		return string(b)
	}
}

func orDefault(v, d string) string {
	if v == "" {
		return d
	}
	return v
}

func rowsToAny(rows *sql.Rows) ([]map[string]any, error) {
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
			switch t := vals[i].(type) {
			case []byte:
				row[c] = string(t)
			default:
				row[c] = t
			}
		}
		out = append(out, row)
	}
	return out, nil
}

func strMap(m map[string]any, key string) string {
	if m == nil {
		return ""
	}
	v, ok := m[key]
	if !ok || v == nil {
		return ""
	}
	s := strings.TrimSpace(fmt.Sprint(v))
	if s == "<nil>" {
		return ""
	}
	return s
}

func (h *SiteAPI) paymentsCreateOrder(c *gin.Context) {
	var req struct {
		Amount  float64 `json:"amount"`
		Receipt string  `json:"receipt"`
	}
	_ = c.ShouldBindJSON(&req)
	row, _ := h.settingsMap(c)
	key := strMap(row, "razorpay_key_id")
	secret := strMap(row, "razorpay_secret")
	amountPaise := int(req.Amount * 100)
	if amountPaise < 100 {
		amountPaise = int(req.Amount)
	}
	if key != "" && secret != "" && amountPaise >= 100 {
		body, _ := json.Marshal(map[string]any{
			"amount":   amountPaise,
			"currency": "INR",
			"receipt":  req.Receipt,
		})
		httpReq, err := http.NewRequest(http.MethodPost, "https://api.razorpay.com/v1/orders", bytes.NewReader(body))
		if err == nil {
			httpReq.Header.Set("Content-Type", "application/json")
			httpReq.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(key+":"+secret)))
			client := &http.Client{Timeout: 20 * time.Second}
			resp, err := client.Do(httpReq)
			if err == nil {
				defer resp.Body.Close()
				raw, _ := io.ReadAll(resp.Body)
				var order map[string]any
				_ = json.Unmarshal(raw, &order)
				if resp.StatusCode >= 200 && resp.StatusCode < 300 && order["id"] != nil {
					c.JSON(http.StatusOK, gin.H{"success": true, "key_id": key, "order": order})
					return
				}
			}
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "key_id": key, "order": nil})
}

func (h *SiteAPI) paymentsVerify(c *gin.Context) {
	var req struct {
		OrderID   string `json:"razorpay_order_id"`
		PaymentID string `json:"razorpay_payment_id"`
		Signature string `json:"razorpay_signature"`
	}
	_ = c.ShouldBindJSON(&req)
	row, _ := h.settingsMap(c)
	secret := strMap(row, "razorpay_secret")
	if secret == "" || req.Signature == "" {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(req.OrderID + "|" + req.PaymentID))
	expect := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expect), []byte(req.Signature)) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Payment signature mismatch."})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *SiteAPI) testEmail(c *gin.Context) {
	var req struct {
		To string `json:"to"`
	}
	_ = c.ShouldBindJSON(&req)
	row, _ := h.settingsMap(c)
	to := strings.TrimSpace(req.To)
	if to == "" {
		to = strMap(row, "smtp_user")
	}
	if !strings.Contains(to, "@") {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "Enter a destination email."})
		return
	}
	port := 465
	if v := strMap(row, "smtp_port"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			port = n
		}
	}
	cfg := email.SMTPConfig{
		Host:     strMap(row, "smtp_host"),
		Port:     port,
		User:     strMap(row, "smtp_user"),
		Password: strMap(row, "smtp_password"),
		From:     strMap(row, "smtp_from_email"),
		FromName: strMap(row, "smtp_from_name"),
		Secure:   strMap(row, "smtp_secure") != "0" && strMap(row, "smtp_secure") != "false",
	}
	if cfg.Host == "" {
		cfg.Host = h.cfg.SMTPHost
		cfg.Port = h.cfg.SMTPPort
		cfg.User = h.cfg.SMTPUser
		cfg.Password = h.cfg.SMTPPassword
		cfg.From = h.cfg.SMTPFrom
	}
	if err := email.Send(cfg, to, "YLT Travels SMTP test", "<p>Your YLT Travels SMTP settings work.</p>"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
