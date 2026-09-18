package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/ylttravels/transit-os/backend/internal/config"
	"github.com/ylttravels/transit-os/backend/internal/migrate"
	"github.com/ylttravels/transit-os/backend/internal/repositories"
	"github.com/ylttravels/transit-os/backend/internal/services"
	"github.com/ylttravels/transit-os/backend/pkg/auth"
)

// SiteAPI is the React-facing JSON surface at /api (not /api/v1).
type SiteAPI struct {
	cfg       config.Config
	db        *sql.DB
	auth      *services.AuthService
	jwt       *auth.Manager
	bookings  *services.BookingService
	hotels    *services.HotelBookingService
	erp       *services.ErpCrudService
	directors *services.DirectorService
	settings  *repositories.SettingsRepo
	authRepo  *repositories.AuthRepo
}

func NewSiteAPI(
	cfg config.Config,
	db *sql.DB,
	authSvc *services.AuthService,
	jwt *auth.Manager,
	bookings *services.BookingService,
	hotels *services.HotelBookingService,
	erp *services.ErpCrudService,
	directors *services.DirectorService,
	settings *repositories.SettingsRepo,
	authRepo *repositories.AuthRepo,
) *SiteAPI {
	return &SiteAPI{
		cfg: cfg, db: db, auth: authSvc, jwt: jwt,
		bookings: bookings, hotels: hotels, erp: erp, directors: directors,
		settings: settings, authRepo: authRepo,
	}
}

func (h *SiteAPI) Register(rg *gin.RouterGroup) {
	rg.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true, "api": "ylt-go"}) })
	rg.GET("/install", h.install)
	rg.POST("/install", h.install)

	rg.POST("/auth/otp/send", h.otpSend)
	rg.POST("/auth/otp/verify", h.otpVerify)
	rg.POST("/auth/password", h.password)
	rg.POST("/auth/signin", h.signin)
	rg.POST("/auth/signup", h.signup)
	rg.POST("/auth/admin-signin", h.adminSignin)
	rg.POST("/auth/agent-signin", h.agentSignin)
	rg.GET("/auth/me", h.me)
	rg.POST("/auth/me", h.me)

	rg.GET("/auth/partners", h.partnersList)
	rg.POST("/auth/partners", h.partnersCreate)
	rg.PUT("/auth/partners/:id", h.partnersUpdate)
	rg.DELETE("/auth/partners/:id", h.partnersDelete)

	rg.GET("/auth/employees", h.employeesList)
	rg.POST("/auth/employees", h.employeesCreate)
	rg.DELETE("/auth/employees/:id", h.employeesDelete)
	rg.POST("/auth/employees/:id/reset-password", h.employeesReset)

	rg.GET("/bookings", h.bookingsGet)
	rg.POST("/bookings", h.bookingsPost)
	rg.GET("/hotel-bookings", h.hotelBookingsGet)

	rg.GET("/erp", h.erpList)
	rg.POST("/erp", h.erpInsert)
	rg.PUT("/erp", h.erpUpdate)
	rg.DELETE("/erp", h.erpDelete)

	rg.GET("/settings", h.settingsGet)
	rg.POST("/settings", h.settingsPost)
	rg.GET("/admin/platform-settings", h.settingsGet)
	rg.POST("/admin/platform-settings", h.settingsPost)
	rg.POST("/admin/test-email", h.testEmail)
	rg.POST("/payments/create-order", h.paymentsCreateOrder)
	rg.POST("/payments/verify", h.paymentsVerify)

	rg.GET("/directors", h.directorsList)
	rg.POST("/directors", h.directorsUpsert)
	rg.DELETE("/directors", h.directorsDelete)
}

func (h *SiteAPI) install(c *gin.Context) {
	if err := migrate.Run(c.Request.Context(), h.db, h.cfg.CoreAdminUser, h.cfg.CoreAdminPass, h.cfg.AgentEmail, h.cfg.AgentPass); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"ok":      true,
		"message": "Schema installed. Admin CoreAdmin. Email OTP (SMTP). Agent " + h.cfg.AgentEmail,
	})
}

func sessionJSON(res *services.SignupResult) gin.H {
	if res == nil {
		return gin.H{"error": "auth failed"}
	}
	return gin.H{
		"ok":           true,
		"access_token": res.AccessToken,
		"accessToken":  res.AccessToken,
		"user_email":   res.Email,
		"email":        res.Email,
		"name":         res.Name,
		"user_id":      res.UserID,
		"userId":       res.UserID,
	}
}

func (h *SiteAPI) otpSend(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || !strings.Contains(req.Email, "@") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Enter a valid email."})
		return
	}
	res, err := h.auth.SendOTP(c.Request.Context(), req.Email)
	if err != nil {
		status := http.StatusBadRequest
		if strings.Contains(strings.ToLower(err.Error()), "not configured") {
			status = http.StatusServiceUnavailable
		}
		if strings.Contains(strings.ToLower(err.Error()), "too many") {
			status = http.StatusTooManyRequests
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	out := gin.H{"ok": true, "message": "OTP sent. Check your inbox (and spam folder)."}
	if res != nil && res.DevHint != "" {
		out["hint"] = res.DevHint
	}
	c.JSON(http.StatusOK, out)
}

func (h *SiteAPI) otpVerify(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and code required."})
		return
	}
	res, err := h.auth.VerifyOTP(c.Request.Context(), req.Email, req.Code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sessionJSON(res))
}

func (h *SiteAPI) password(c *gin.Context) {
	var req struct {
		Action   string `json:"action"`
		Mode     string `json:"mode"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Action == "signup" || req.Mode == "signup" {
		h.doSignup(c, req.Email, req.Password, req.Name)
		return
	}
	h.doSignin(c, req.Email, req.Password)
}

func (h *SiteAPI) signin(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	_ = c.ShouldBindJSON(&req)
	h.doSignin(c, req.Email, req.Password)
}

func (h *SiteAPI) signup(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
	}
	_ = c.ShouldBindJSON(&req)
	h.doSignup(c, req.Email, req.Password, req.Name)
}

func (h *SiteAPI) doSignin(c *gin.Context, email, password string) {
	res, err := h.auth.Signin(c.Request.Context(), email, password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sessionJSON(res))
}

func (h *SiteAPI) doSignup(c *gin.Context, email, password, name string) {
	res, err := h.auth.Signup(c.Request.Context(), email, password, name)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sessionJSON(res))
}

func (h *SiteAPI) adminSignin(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	_ = c.ShouldBindJSON(&req)
	user := strings.TrimSpace(req.Username)
	if user == "" {
		user = req.Email
	}
	res, err := h.auth.AdminSignin(c.Request.Context(), user, req.Password, h.cfg.CoreAdminUser, h.cfg.CoreAdminPass)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	out := sessionJSON(res)
	out["role"] = "admin"
	c.JSON(http.StatusOK, out)
}

func (h *SiteAPI) agentSignin(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	_ = c.ShouldBindJSON(&req)
	res, err := h.auth.AgentSignin(c.Request.Context(), req.Email, req.Password)
	if err != nil && strings.EqualFold(req.Email, h.cfg.AgentEmail) && req.Password == h.cfg.AgentPass {
		tok, terr := h.jwt.IssueAccess("agent", h.cfg.AgentEmail, "YLT Agent", "agent", "")
		if terr == nil {
			c.JSON(http.StatusOK, sessionJSON(&services.SignupResult{
				AccessToken: tok, Email: h.cfg.AgentEmail, Name: "YLT Agent", UserID: "agent",
			}))
			return
		}
	}
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sessionJSON(res))
}

func (h *SiteAPI) me(c *gin.Context) {
	hdr := c.GetHeader("Authorization")
	tok := strings.TrimPrefix(hdr, "Bearer ")
	if tok == "" {
		c.JSON(http.StatusOK, gin.H{"ok": true, "cached": true})
		return
	}
	claims, err := h.jwt.Verify(tok)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"ok": false})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "user": claims})
}
