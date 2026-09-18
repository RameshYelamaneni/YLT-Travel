package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ylttravels/transit-os/backend/internal/models"
	"github.com/ylttravels/transit-os/backend/internal/services"
)

// --- Bookings handler ---

type BookingHandler struct {
	svc *services.BookingService
}

func NewBookingHandler(svc *services.BookingService) *BookingHandler {
	return &BookingHandler{svc: svc}
}

func (h *BookingHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/bookings", h.listOrLookup)
	rg.POST("/bookings", h.create)
	rg.GET("/bookings/:pnr", h.getByPNR)
}

func (h *BookingHandler) listOrLookup(c *gin.Context) {
	if term := c.Query("lookup"); term != "" {
		bookings, err := h.svc.Lookup(c.Request.Context(), term)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"bookings": bookings})
		return
	}
	if user := c.Query("user"); user != "" {
		bookings, err := h.svc.ListByUser(c.Request.Context(), user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"bookings": bookings})
		return
	}
	if c.Query("all") != "" {
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "200"))
		bookings, err := h.svc.ListAll(c.Request.Context(), limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"bookings": bookings})
		return
	}
	c.JSON(http.StatusBadRequest, gin.H{"error": "provide ?lookup=, ?user=, or ?all=1"})
}

func (h *BookingHandler) create(c *gin.Context) {
	b, err := bindBooking(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.Create(c.Request.Context(), b); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, b)
}

func (h *BookingHandler) getByPNR(c *gin.Context) {
	pnr := c.Param("pnr")
	b, err := h.svc.GetByPNR(c.Request.Context(), pnr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if b == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
		return
	}
	c.JSON(http.StatusOK, b)
}

// --- Hotel bookings handler ---

type HotelBookingHandler struct {
	svc *services.HotelBookingService
}

func NewHotelBookingHandler(svc *services.HotelBookingService) *HotelBookingHandler {
	return &HotelBookingHandler{svc: svc}
}

func (h *HotelBookingHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/hotel-bookings", h.listOrLookup)
	rg.POST("/hotel-bookings", h.create)
	rg.GET("/hotel-bookings/:pnr", h.getByPNR)
}

func (h *HotelBookingHandler) listOrLookup(c *gin.Context) {
	if term := c.Query("lookup"); term != "" {
		bookings, err := h.svc.Lookup(c.Request.Context(), term)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"bookings": bookings})
		return
	}
	if user := c.Query("user"); user != "" {
		bookings, err := h.svc.ListByGuest(c.Request.Context(), user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"bookings": bookings})
		return
	}
	if c.Query("all") != "" {
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "200"))
		bookings, err := h.svc.ListAll(c.Request.Context(), limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"bookings": bookings})
		return
	}
	c.JSON(http.StatusBadRequest, gin.H{"error": "provide ?lookup=, ?user=, or ?all=1"})
}

func (h *HotelBookingHandler) create(c *gin.Context) {
	var b models.HotelBooking
	if err := c.ShouldBindJSON(&b); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.Create(c.Request.Context(), &b); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, b)
}

func (h *HotelBookingHandler) getByPNR(c *gin.Context) {
	pnr := c.Param("pnr")
	b, err := h.svc.GetByPNR(c.Request.Context(), pnr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if b == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "hotel booking not found"})
		return
	}
	c.JSON(http.StatusOK, b)
}

// --- Directors handler ---

type DirectorHandler struct {
	svc *services.DirectorService
}

func NewDirectorHandler(svc *services.DirectorService) *DirectorHandler {
	return &DirectorHandler{svc: svc}
}

func (h *DirectorHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/directors", h.list)
	rg.POST("/directors", h.upsert)
	rg.DELETE("/directors/:id", h.delete)
}

func (h *DirectorHandler) list(c *gin.Context) {
	directors, err := h.svc.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"directors": directors})
}

func (h *DirectorHandler) upsert(c *gin.Context) {
	var d models.Director
	if err := c.ShouldBindJSON(&d); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.Upsert(c.Request.Context(), &d); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, d)
}

func (h *DirectorHandler) delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// --- Offers handler ---

type OfferHandler struct {
	svc *services.OfferService
}

func NewOfferHandler(svc *services.OfferService) *OfferHandler {
	return &OfferHandler{svc: svc}
}

func (h *OfferHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/offers", h.list)
	rg.POST("/offers", h.upsert)
	rg.DELETE("/offers", h.delete)
	rg.DELETE("/offers/:id", h.delete)
}

func (h *OfferHandler) list(c *gin.Context) {
	all := c.Query("all") != ""
	offers, err := h.svc.List(c.Request.Context(), all)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, offers)
}

func (h *OfferHandler) upsert(c *gin.Context) {
	var raw map[string]any
	if err := c.ShouldBindJSON(&raw); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	o := models.Offer{
		ID:            str(raw["id"]),
		PromoCode:     strings.ToUpper(strFirst(raw["promo_code"], raw["promoCode"])),
		Title:         str(raw["title"]),
		Description:   str(raw["description"]),
		DiscountValue: strFirst(raw["discount_value"], raw["discountValue"]),
		ExpiryDate:    orDefault(strFirst(raw["expiry_date"], raw["expiryDate"]), "2026-12-31"),
		Tag:           orDefault(str(raw["tag"]), "Bus"),
		Tone:          orDefault(str(raw["tone"]), "from-navy-800 to-navy-600"),
		IsActive:      true,
	}
	if v, ok := raw["is_active"]; ok {
		o.IsActive = truthy(v)
	} else if v, ok := raw["isActive"]; ok {
		o.IsActive = truthy(v)
	}
	if o.PromoCode == "" || o.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "promo_code and title required."})
		return
	}
	if err := h.svc.Upsert(c.Request.Context(), &o); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, o)
}

func (h *OfferHandler) delete(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		id = c.Query("id")
	}
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id required"})
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// --- Routes handler ---

type RouteHandler struct {
	svc *services.RouteService
}

func NewRouteHandler(svc *services.RouteService) *RouteHandler {
	return &RouteHandler{svc: svc}
}

func (h *RouteHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/routes", h.list)
	rg.POST("/routes", h.upsert)
	rg.DELETE("/routes/:id", h.delete)
}

func (h *RouteHandler) list(c *gin.Context) {
	all := c.Query("all") != ""
	routes, err := h.svc.List(c.Request.Context(), all)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"routes": routes})
}

func (h *RouteHandler) upsert(c *gin.Context) {
	var rt models.Route
	if err := c.ShouldBindJSON(&rt); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.Upsert(c.Request.Context(), &rt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rt)
}

func (h *RouteHandler) delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// --- Payments handler ---

type PaymentHandler struct {
	svc *services.PaymentService
}

func NewPaymentHandler(svc *services.PaymentService) *PaymentHandler {
	return &PaymentHandler{svc: svc}
}

func (h *PaymentHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/payments", h.list)
	rg.POST("/payments/submit", h.submit)
	rg.POST("/payments/set-status", h.setStatus)
}

func (h *PaymentHandler) list(c *gin.Context) {
	payments, err := h.svc.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"payments": payments})
}

func (h *PaymentHandler) submit(c *gin.Context) {
	var p models.Payment
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.Submit(c.Request.Context(), &p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, p)
}

func (h *PaymentHandler) setStatus(c *gin.Context) {
	var req struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.SetStatus(c.Request.Context(), req.ID, req.Status); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// --- Newsletter handler ---

type NewsletterHandler struct {
	svc *services.NewsletterService
}

func NewNewsletterHandler(svc *services.NewsletterService) *NewsletterHandler {
	return &NewsletterHandler{svc: svc}
}

func (h *NewsletterHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/newsletter", h.list)
	rg.POST("/newsletter/subscribe", h.subscribe)
	rg.DELETE("/newsletter/unsubscribe", h.unsubscribe)
	rg.DELETE("/newsletter/:id", h.delete)
}

func (h *NewsletterHandler) list(c *gin.Context) {
	subs, err := h.svc.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"subscribers": subs})
}

func (h *NewsletterHandler) subscribe(c *gin.Context) {
	var req struct {
		Email  string `json:"email"`
		Name   string `json:"name"`
		Source string `json:"source"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id, err := h.svc.Subscribe(c.Request.Context(), req.Email, req.Name, req.Source)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"ok": true, "id": id})
}

func (h *NewsletterHandler) unsubscribe(c *gin.Context) {
	email := c.Query("email")
	if err := h.svc.Unsubscribe(c.Request.Context(), email); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *NewsletterHandler) delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// --- Settings handler ---

type SettingsHandler struct {
	svc *services.SettingsService
}

func NewSettingsHandler(svc *services.SettingsService) *SettingsHandler {
	return &SettingsHandler{svc: svc}
}

func (h *SettingsHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/settings", h.get)
	rg.POST("/settings", h.update)
}

func (h *SettingsHandler) get(c *gin.Context) {
	s, err := h.svc.Get(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, s)
}

func (h *SettingsHandler) update(c *gin.Context) {
	var s models.AppSettings
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.Update(c.Request.Context(), &s); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// --- Email templates handler ---

type EmailTemplateHandler struct {
	svc *services.EmailTemplateService
}

func NewEmailTemplateHandler(svc *services.EmailTemplateService) *EmailTemplateHandler {
	return &EmailTemplateHandler{svc: svc}
}

func (h *EmailTemplateHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/email-templates", h.list)
	rg.POST("/email-templates", h.update)
}

func (h *EmailTemplateHandler) list(c *gin.Context) {
	templates, err := h.svc.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"templates": templates})
}

func (h *EmailTemplateHandler) update(c *gin.Context) {
	var t models.EmailTemplate
	if err := c.ShouldBindJSON(&t); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.Update(c.Request.Context(), &t); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// --- Hotels handler ---

type HotelHandler struct {
	svc *services.HotelService
}

func NewHotelHandler(svc *services.HotelService) *HotelHandler {
	return &HotelHandler{svc: svc}
}

func (h *HotelHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/hotels", h.listOrGet)
	rg.POST("/hotels", h.upsert)
	rg.DELETE("/hotels/:id", h.softDelete)
}

func (h *HotelHandler) listOrGet(c *gin.Context) {
	if id := c.Query("id"); id != "" {
		hotel, err := h.svc.GetByID(c.Request.Context(), id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if hotel == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "hotel not found"})
			return
		}
		c.JSON(http.StatusOK, hotel)
		return
	}
	city := c.Query("city")
	hotels, err := h.svc.ListActive(c.Request.Context(), city)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"hotels": hotels})
}

func (h *HotelHandler) upsert(c *gin.Context) {
	var hotel models.Hotel
	if err := c.ShouldBindJSON(&hotel); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.Upsert(c.Request.Context(), &hotel); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, hotel)
}

func (h *HotelHandler) softDelete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.SoftDelete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// --- Employee files handler ---

type EmployeeFileHandler struct {
	svc      *services.EmployeeFileService
	uploadMgr *uploadManager
}

func NewEmployeeFileHandler(svc *services.EmployeeFileService, um *uploadManager) *EmployeeFileHandler {
	return &EmployeeFileHandler{svc: svc, uploadMgr: um}
}

func (h *EmployeeFileHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/employees/files", h.list)
	rg.GET("/employees/files/folders", h.folders)
	rg.POST("/employees/files", h.upload)
	rg.GET("/employees/files/:id", h.getFile)
	rg.DELETE("/employees/files/:id", h.delete)
}

func (h *EmployeeFileHandler) list(c *gin.Context) {
	folder := c.Query("folder")
	files, err := h.svc.List(c.Request.Context(), folder)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"files": files})
}

func (h *EmployeeFileHandler) folders(c *gin.Context) {
	folders, err := h.svc.Folders(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"folders": folders})
}

func (h *EmployeeFileHandler) upload(c *gin.Context) {
	// multipart file upload — streams to disk, stores metadata in DB.
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	defer file.Close()

	storedName, _, err := h.uploadMgr.SaveFile(header)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	folder := c.DefaultPostForm("folder", "General")
	description := c.PostForm("description")
	byEmail := c.PostForm("uploaded_by_email")
	byName := c.PostForm("uploaded_by_name")

	empFile := &models.EmployeeFile{
		UploadedByEmail: nullString(byEmail),
		UploadedByName: nullString(byName),
		Filename:       storedName,
		MimeType:       header.Header.Get("Content-Type"),
		SizeBytes:      header.Size,
		Folder:         folder,
		Description:    nullString(description),
	}
	id, err := h.svc.Create(c.Request.Context(), empFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"ok": true, "id": id, "filename": storedName})
}

func (h *EmployeeFileHandler) getFile(c *gin.Context) {
	id := c.Param("id")
	meta, err := h.svc.GetFileMeta(c.Request.Context(), id)
	if err != nil || meta == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}
	// Serve the file from disk.
	c.FileAttachment(h.uploadMgr.FilePath(meta.Filename), meta.Filename)
}

func (h *EmployeeFileHandler) delete(c *gin.Context) {
	id := c.Param("id")
	meta, err := h.svc.GetFileMeta(c.Request.Context(), id)
	if err == nil && meta != nil {
		_ = h.uploadMgr.Delete(meta.Filename)
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// --- ERP CRUD handler ---

type ErpCrudHandler struct {
	svc *services.ErpCrudService
}

func NewErpCrudHandler(svc *services.ErpCrudService) *ErpCrudHandler {
	return &ErpCrudHandler{svc: svc}
}

func (h *ErpCrudHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/erp/table/:table", h.list)
	rg.GET("/erp/table/:table/:id", h.get)
	rg.POST("/erp/table/:table", h.insert)
	rg.PUT("/erp/table/:table/:id", h.update)
	rg.DELETE("/erp/table/:table/:id", h.delete)
}

func (h *ErpCrudHandler) list(c *gin.Context) {
	table := c.Param("table")
	rows, err := h.svc.List(c.Request.Context(), table)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"rows": rows})
}

func (h *ErpCrudHandler) get(c *gin.Context) {
	table := c.Param("table")
	id := c.Param("id")
	row, err := h.svc.Get(c.Request.Context(), table, id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, row)
}

func (h *ErpCrudHandler) insert(c *gin.Context) {
	table := c.Param("table")
	var fields map[string]any
	if err := c.ShouldBindJSON(&fields); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.Insert(c.Request.Context(), table, fields); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"ok": true})
}

func (h *ErpCrudHandler) update(c *gin.Context) {
	table := c.Param("table")
	id := c.Param("id")
	var fields map[string]any
	if err := c.ShouldBindJSON(&fields); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.Update(c.Request.Context(), table, id, fields); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *ErpCrudHandler) delete(c *gin.Context) {
	table := c.Param("table")
	id := c.Param("id")
	if err := h.svc.Delete(c.Request.Context(), table, id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
