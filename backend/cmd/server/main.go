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
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/ylttravels/transit-os/backend/internal/config"
	"github.com/ylttravels/transit-os/backend/internal/handlers"
	"github.com/ylttravels/transit-os/backend/internal/repositories"
	"github.com/ylttravels/transit-os/backend/internal/services"
	"github.com/ylttravels/transit-os/backend/pkg/auth"
	"github.com/ylttravels/transit-os/backend/pkg/db"
	"github.com/ylttravels/transit-os/backend/pkg/gds"
	"github.com/ylttravels/transit-os/backend/pkg/seatlock"
	"github.com/ylttravels/transit-os/backend/pkg/upload"
)

func main() {
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}
	// Load .env file for local development (silently ignored if not present)
	_ = godotenv.Load()
	cfg := config.Load()

	// 1. DB pool.
	rootCtx, rootCancel := context.WithTimeout(context.Background(), 10*time.Second)
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
	authSvc := services.NewAuthService(authRepo, emailTmplRepo, jwtMgr, settingsRepo)
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

	// 10. Graceful shutdown.
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           e,
		ReadHeaderTimeout: 10 * time.Second,
	}
	go func() {
		log.Printf("transit-os backend listening on :%s", cfg.Port)
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

// corsMiddleware sets permissive CORS headers. Tighten origins before production.
func corsMiddleware(origin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Client-Info, Apikey")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
