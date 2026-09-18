// Package main is the entry point for the transit-os backend. It initializes
// the DB pool, JWT auth, GDS aggregator, seat lock manager, upload manager,
// and all service+handler layers, then starts the Gin server.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/ylttravels/transit-os/backend/internal/config"
	"github.com/ylttravels/transit-os/backend/internal/handlers"
	"github.com/ylttravels/transit-os/backend/internal/migrate"
	"github.com/ylttravels/transit-os/backend/internal/repositories"
	"github.com/ylttravels/transit-os/backend/internal/services"
	"github.com/ylttravels/transit-os/backend/pkg/auth"
	"github.com/ylttravels/transit-os/backend/pkg/db"
	"github.com/ylttravels/transit-os/backend/pkg/email"
	"github.com/ylttravels/transit-os/backend/pkg/gds"
	"github.com/ylttravels/transit-os/backend/pkg/seatlock"
	"github.com/ylttravels/transit-os/backend/pkg/upload"
)

func main() {
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}
	// Load .env from cwd or backend/ (silently ignored if not present)
	_ = godotenv.Load()
	_ = godotenv.Load("backend/.env")
	cfg := config.Load()

	// 1. DB pool.
	rootCtx, rootCancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer rootCancel()
	if err := db.Init(rootCtx, cfg); err != nil {
		log.Fatalf("db init failed: %v", err)
	}
	defer db.Close()

	pool, _ := db.Pool()

	// 2. JWT auth manager.
	jwtMgr := auth.NewManager(cfg)

	// 3. Upload manager.
	uploadMgr, err := upload.NewManager(cfg.FileStoragePath, cfg.MaxUploadBytes)
	if err != nil {
		log.Fatalf("upload manager init failed: %v", err)
	}

	// 4. Seat lock manager.
	locks := seatlock.NewManager(seatlock.DefaultTTL)
	defer locks.Close()

	// 5. GDS aggregator.
	agg := gds.DefaultAggregator()

	// 6. Repositories.
	authRepo := repositories.NewAuthRepo(pool)
	settingsRepo := repositories.NewSettingsRepo(pool)
	emailTmplRepo := repositories.NewEmailTemplateRepo(pool)
	bookingRepo := repositories.NewBookingRepo(pool)
	hotelBookingRepo := repositories.NewHotelBookingRepo(pool)
	directorRepo := repositories.NewDirectorRepo(pool)
	offerRepo := repositories.NewOfferRepo(pool)
	routeRepo := repositories.NewRouteRepo(pool)
	paymentRepo := repositories.NewPaymentRepo(pool)
	newsletterRepo := repositories.NewNewsletterRepo(pool)
	hotelRepo := repositories.NewHotelRepo(pool)
	empFileRepo := repositories.NewEmployeeFileRepo(pool)
	erpCrudRepo := repositories.NewErpCrudRepo(pool)

	// 7. Services.
	authSvc := services.NewAuthService(authRepo, emailTmplRepo, jwtMgr, settingsRepo, cfg.OTPDev, email.SMTPConfig{
		Host:     cfg.SMTPHost,
		Port:     cfg.SMTPPort,
		User:     cfg.SMTPUser,
		Password: cfg.SMTPPassword,
		From:     cfg.SMTPFrom,
		FromName: "YLT Travels",
		Secure:   cfg.SMTPSecure,
	})
	_ = migrate.EnsureOTPHashColumn(context.Background(), pool)
	bookingSvc := services.NewBookingService(bookingRepo)
	hotelBookingSvc := services.NewHotelBookingService(hotelBookingRepo)
	directorSvc := services.NewDirectorService(directorRepo)
	offerSvc := services.NewOfferService(offerRepo)
	routeSvc := services.NewRouteService(routeRepo)
	paymentSvc := services.NewPaymentService(paymentRepo, bookingRepo)
	newsletterSvc := services.NewNewsletterService(newsletterRepo)
	settingsSvc := services.NewSettingsService(settingsRepo)
	emailTmplSvc := services.NewEmailTemplateService(emailTmplRepo)
	hotelSvc := services.NewHotelService(hotelRepo)
	empFileSvc := services.NewEmployeeFileService(empFileRepo)
	erpCrudSvc := services.NewErpCrudService(erpCrudRepo)

	// 8. Gin engine + CORS.
	e := gin.New()
	e.Use(gin.Recovery())
	e.Use(corsMiddleware(cfg.CORSOrigin))

	// 9. Register all handlers under /api/v1.
	v1 := e.Group("/api/v1")

	authH := handlers.NewAuthHandler(authSvc, jwtMgr, cfg.CoreAdminUser, cfg.CoreAdminPass)
	authH.Register(v1)
	authH.RegisterEmployeeAdmin(v1)
	authH.RegisterPartnerAdmin(v1)

	handlers.NewBookingHandler(bookingSvc).Register(v1)
	handlers.NewHotelBookingHandler(hotelBookingSvc).Register(v1)
	handlers.NewDirectorHandler(directorSvc).Register(v1)
	handlers.NewOfferHandler(offerSvc).Register(v1)
	handlers.NewRouteHandler(routeSvc).Register(v1)
	handlers.NewPaymentHandler(paymentSvc).Register(v1)
	handlers.NewNewsletterHandler(newsletterSvc).Register(v1)
	handlers.NewSettingsHandler(settingsSvc).Register(v1)
	handlers.NewEmailTemplateHandler(emailTmplSvc).Register(v1)
	handlers.NewHotelHandler(hotelSvc).Register(v1)
	handlers.NewEmployeeFileHandler(empFileSvc, uploadMgr).Register(v1)
	handlers.NewErpCrudHandler(erpCrudSvc).Register(v1)
	handlers.NewBusSearchHandler(agg).Register(v1)
	handlers.NewSeatLockHandler(locks).Register(v1)
	handlers.NewDashboardHandler().Register(v1)

	site := handlers.NewSiteAPI(cfg, pool, authSvc, jwtMgr, bookingSvc, hotelBookingSvc, erpCrudSvc, directorSvc, settingsRepo, authRepo)
	api := e.Group("/api")
	site.Register(api)
	handlers.NewOfferHandler(offerSvc).Register(api)
	handlers.NewHotelHandler(hotelSvc).Register(api)
	handlers.NewNewsletterHandler(newsletterSvc).Register(api)
	handlers.NewPaymentHandler(paymentSvc).Register(api)
	handlers.NewEmailTemplateHandler(emailTmplSvc).Register(api)
	handlers.NewEmployeeFileHandler(empFileSvc, uploadMgr).Register(api)

	// 10. Graceful shutdown.
	srv := &http.Server{
		Addr:              "0.0.0.0:" + cfg.Port,
		Handler:           e,
		ReadHeaderTimeout: 10 * time.Second,
	}
	go func() {
		log.Printf("ylt-api listening on 0.0.0.0:%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutdown signal received, draining...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
	log.Println("backend stopped")
}

// corsMiddleware allows ylttravels.com, localhost, and any CORS_ORIGIN list.
func corsMiddleware(origin string) gin.HandlerFunc {
	allowed := strings.Split(origin, ",")
	return func(c *gin.Context) {
		reqOrigin := c.GetHeader("Origin")
		allow := "*"
		if corsOriginOK(reqOrigin, allowed) {
			if reqOrigin != "" {
				allow = reqOrigin
			}
		} else if strings.TrimSpace(origin) != "*" && len(allowed) > 0 {
			allow = strings.TrimSpace(allowed[0])
		}
		c.Header("Vary", "Origin")
		c.Header("Access-Control-Allow-Origin", allow)
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Client-Info, Apikey")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func corsOriginOK(reqOrigin string, configured []string) bool {
	if reqOrigin == "" {
		return true
	}
	lower := strings.ToLower(reqOrigin)
	if strings.HasPrefix(lower, "http://localhost:") || strings.HasPrefix(lower, "http://127.0.0.1:") {
		return true
	}
	if lower == "https://ylttravels.com" || lower == "https://www.ylttravels.com" ||
		lower == "http://ylttravels.com" || lower == "http://www.ylttravels.com" {
		return true
	}
	for _, a := range configured {
		a = strings.TrimSpace(a)
		if a == "*" || (a != "" && a == reqOrigin) {
			return true
		}
	}
	return false
}
