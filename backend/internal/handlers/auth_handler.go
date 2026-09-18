// Package handlers contains all Gin HTTP handlers. Each handler is thin:
// it validates input, calls the relevant service, and writes a unified JSON
// response. All concurrency lives in the service/pkg layers.
package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ylttravels/transit-os/backend/internal/models"
	"github.com/ylttravels/transit-os/backend/internal/services"
	"github.com/ylttravels/transit-os/backend/pkg/auth"
)

// AuthHandler holds auth-related dependencies.
type AuthHandler struct {
	svc          *services.AuthService
	jwt          *auth.Manager
	coreAdminUser string
	coreAdminPass string
}

func NewAuthHandler(svc *services.AuthService, jwt *auth.Manager, coreAdminUser, coreAdminPass string) *AuthHandler {
	return &AuthHandler{svc: svc, jwt: jwt, coreAdminUser: coreAdminUser, coreAdminPass: coreAdminPass}
}

// Register attaches auth routes to the given router group.
func (h *AuthHandler) Register(rg *gin.RouterGroup) {
	rg.POST("/auth/signup", h.signup)
	rg.POST("/auth/signin", h.signin)
	rg.POST("/auth/agent-signin", h.agentSignin)
	rg.POST("/auth/admin-signin", h.adminSignin)
	rg.POST("/auth/send-otp", h.sendOTP)
	rg.POST("/auth/verify-otp", h.verifyOTP)
	rg.POST("/auth/otp/send", h.sendOTP)
	rg.POST("/auth/otp/verify", h.verifyOTP)
	rg.POST("/auth/forgot-password/send", h.forgotPasswordSend)
	rg.POST("/auth/forgot-password/reset", h.forgotPasswordReset)
	rg.GET("/auth/me", h.jwt.Middleware(), h.me)
	rg.POST("/auth/logout", h.logout)
}

func (h *AuthHandler) signup(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	res, err := h.svc.Signup(c.Request.Context(), req.Email, req.Password, req.Name)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

func (h *AuthHandler) signin(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	res, err := h.svc.Signin(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *AuthHandler) agentSignin(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	res, err := h.svc.AgentSignin(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *AuthHandler) adminSignin(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	res, err := h.svc.AdminSignin(c.Request.Context(), req.Username, req.Password, h.coreAdminUser, h.coreAdminPass)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *AuthHandler) sendOTP(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	res, err := h.svc.SendOTP(c.Request.Context(), req.Email)
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "rate limit") || strings.Contains(err.Error(), "too many") {
			status = http.StatusTooManyRequests
		} else if strings.Contains(err.Error(), "not configured") {
			status = http.StatusServiceUnavailable
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	out := gin.H{"ok": true, "message": "OTP sent. Check your inbox."}
	if res != nil && res.DevHint != "" {
		out["hint"] = res.DevHint
	}
	c.JSON(http.StatusOK, out)
}

func (h *AuthHandler) verifyOTP(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	res, err := h.svc.VerifyOTP(c.Request.Context(), req.Email, req.Code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *AuthHandler) forgotPasswordSend(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_ = h.svc.ForgotPasswordSend(c.Request.Context(), req.Email)
	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "If an account exists, a reset code has been sent."})
}

func (h *AuthHandler) forgotPasswordReset(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.ForgotPasswordReset(c.Request.Context(), req.Email, req.Code, req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "Password updated. You can now sign in."})
}

func (h *AuthHandler) me(c *gin.Context) {
	claims, ok := auth.ClaimsFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "user": claims})
}

func (h *AuthHandler) logout(c *gin.Context) {
	// Stateless JWT — client discards the token.
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// --- Employee management (admin) ---

func (h *AuthHandler) RegisterEmployeeAdmin(rg *gin.RouterGroup) {
	admin := rg.Group("", h.jwt.Middleware("admin"))
	admin.GET("/auth/employees", h.listEmployees)
	admin.POST("/auth/employees", h.createEmployee)
	admin.DELETE("/auth/employees/:id", h.deleteEmployee)
	admin.POST("/auth/employees/:id/reset-password", h.resetEmployeePassword)
}

func (h *AuthHandler) listEmployees(c *gin.Context) {
	emps, err := h.svc.ListEmployees(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "employees": emps})
}

func (h *AuthHandler) createEmployee(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
		Role     string `json:"role"`
		Phone    string `json:"phone"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id, err := h.svc.CreateEmployee(c.Request.Context(), req.Email, req.Password, req.Name, req.Role, req.Phone)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"ok": true, "id": id})
}

func (h *AuthHandler) deleteEmployee(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.DeleteEmployee(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *AuthHandler) resetEmployeePassword(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.ResetEmployeePassword(c.Request.Context(), id, req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// --- Partner management (admin) ---

func (h *AuthHandler) RegisterPartnerAdmin(rg *gin.RouterGroup) {
	admin := rg.Group("", h.jwt.Middleware("admin"))
	admin.GET("/auth/partners", h.listPartners)
	admin.POST("/auth/partners", h.createPartner)
	admin.PUT("/auth/partners/:id", h.updatePartner)
	admin.DELETE("/auth/partners/:id", h.deletePartner)
}

func (h *AuthHandler) listPartners(c *gin.Context) {
	partners, err := h.svc.ListPartners(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "partners": partners})
}

func (h *AuthHandler) createPartner(c *gin.Context) {
	var req struct {
		Email          string  `json:"email"`
		Password       string  `json:"password"`
		Name           string  `json:"name"`
		AgencyName     string  `json:"agencyName"`
		Phone          string  `json:"phone"`
		City           string  `json:"city"`
		CommissionRate float64 `json:"commissionRate"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.CommissionRate == 0 {
		req.CommissionRate = 0.08
	}
	id, err := h.svc.CreatePartner(c.Request.Context(), req.Email, req.Password, req.Name, req.AgencyName, req.Phone, req.City, req.CommissionRate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"ok": true, "id": id})
}

func (h *AuthHandler) updatePartner(c *gin.Context) {
	id := c.Param("id")
	var req map[string]any
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Filter to allowed fields.
	allowed := map[string]bool{"name": true, "agency_name": true, "phone": true, "city": true, "status": true, "commission_rate": true}
	fields := make(map[string]any)
	for k, v := range req {
		if allowed[k] {
			fields[k] = v
		}
	}
	if err := h.svc.UpdatePartner(c.Request.Context(), id, fields); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *AuthHandler) deletePartner(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.DeletePartner(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// helper to bind a booking from the request body (shared by booking handler).
func bindBooking(c *gin.Context) (*models.Booking, error) {
	var b models.Booking
	if err := c.ShouldBindJSON(&b); err != nil {
		return nil, err
	}
	return &b, nil
}

// validEmail is a tiny validator reused across handlers.
func validEmail(e string) bool {
	return strings.Contains(e, "@") && strings.Contains(e, ".")
}
