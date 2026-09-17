package services

import (
	"context"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/ylttravels/transit-os/backend/internal/models"
	"github.com/ylttravels/transit-os/backend/internal/repositories"
)

// --- Booking service ---

type BookingService struct {
	repo *repositories.BookingRepo
}

func NewBookingService(repo *repositories.BookingRepo) *BookingService {
	return &BookingService{repo: repo}
}

func (s *BookingService) Create(ctx context.Context, b *models.Booking) error {
	if b.PNR == "" {
		b.PNR = genPNR("YLT")
	}
	return s.repo.Create(ctx, b)
}

func (s *BookingService) GetByPNR(ctx context.Context, pnr string) (*models.Booking, error) {
	return s.repo.GetByPNR(ctx, pnr)
}

func (s *BookingService) ListByUser(ctx context.Context, user string) ([]models.Booking, error) {
	return s.repo.ListByUser(ctx, user)
}

func (s *BookingService) ListAll(ctx context.Context, limit int) ([]models.Booking, error) {
	return s.repo.ListAll(ctx, limit)
}

func (s *BookingService) Lookup(ctx context.Context, term string) ([]models.Booking, error) {
	return s.repo.Lookup(ctx, term)
}

func (s *BookingService) UpdatePayment(ctx context.Context, pnr, utr, status string) error {
	return s.repo.UpdatePayment(ctx, pnr, utr, status)
}

// genPNR generates a PNR with the given prefix: PREFIX + 4 letters + 3 digits.
func genPNR(prefix string) string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	letters := "ABCDEFGHJKLMNPQRSTUVWXYZ"
	var b strings.Builder
	b.WriteString(prefix)
	for i := 0; i < 4; i++ {
		b.WriteByte(letters[r.Intn(len(letters))])
	}
	for i := 0; i < 3; i++ {
		b.WriteByte(byte('0' + r.Intn(10)))
	}
	return b.String()
}

// --- Hotel booking service ---

type HotelBookingService struct {
	repo *repositories.HotelBookingRepo
}

func NewHotelBookingService(repo *repositories.HotelBookingRepo) *HotelBookingService {
	return &HotelBookingService{repo: repo}
}

func (s *HotelBookingService) Create(ctx context.Context, b *models.HotelBooking) error {
	if b.PNR == "" {
		b.PNR = genPNR("YLH")
	}
	if b.CheckIn == "" {
		b.CheckIn = time.Now().Format("2006-01-02")
	}
	if b.CheckOut == "" {
		b.CheckOut = time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	}
	if b.Rooms == 0 {
		b.Rooms = 1
	}
	if b.Guests == 0 {
		b.Guests = 1
	}
	return s.repo.Create(ctx, b)
}

func (s *HotelBookingService) GetByPNR(ctx context.Context, pnr string) (*models.HotelBooking, error) {
	return s.repo.GetByPNR(ctx, pnr)
}

func (s *HotelBookingService) ListByGuest(ctx context.Context, email string) ([]models.HotelBooking, error) {
	return s.repo.ListByGuest(ctx, email)
}

func (s *HotelBookingService) ListAll(ctx context.Context, limit int) ([]models.HotelBooking, error) {
	return s.repo.ListAll(ctx, limit)
}

func (s *HotelBookingService) Lookup(ctx context.Context, term string) ([]models.HotelBooking, error) {
	return s.repo.Lookup(ctx, term)
}

// --- Director service ---

type DirectorService struct {
	repo *repositories.DirectorRepo
}

func NewDirectorService(repo *repositories.DirectorRepo) *DirectorService {
	return &DirectorService{repo: repo}
}

func (s *DirectorService) List(ctx context.Context) ([]models.Director, error) {
	return s.repo.List(ctx)
}

func (s *DirectorService) Upsert(ctx context.Context, d *models.Director) error {
	return s.repo.Upsert(ctx, d)
}

func (s *DirectorService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// --- Offer service ---

type OfferService struct {
	repo *repositories.OfferRepo
}

func NewOfferService(repo *repositories.OfferRepo) *OfferService {
	return &OfferService{repo: repo}
}

func (s *OfferService) List(ctx context.Context, all bool) ([]models.Offer, error) {
	return s.repo.List(ctx, all)
}

func (s *OfferService) Upsert(ctx context.Context, o *models.Offer) error {
	if o.ExpiryDate == "" {
		o.ExpiryDate = "2026-12-31"
	}
	return s.repo.Upsert(ctx, o)
}

func (s *OfferService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// --- Route service ---

type RouteService struct {
	repo *repositories.RouteRepo
}

func NewRouteService(repo *repositories.RouteRepo) *RouteService {
	return &RouteService{repo: repo}
}

func (s *RouteService) List(ctx context.Context, all bool) ([]models.Route, error) {
	return s.repo.List(ctx, all)
}

func (s *RouteService) Upsert(ctx context.Context, rt *models.Route) error {
	if rt.DepartureTime == "" {
		rt.DepartureTime = "21:00"
	}
	if rt.BaseFare == 0 {
		rt.BaseFare = 800
	}
	if rt.TotalSeats == 0 {
		rt.TotalSeats = 36
	}
	if rt.DeparturesDaily == 0 {
		rt.DeparturesDaily = 1
	}
	return s.repo.Upsert(ctx, rt)
}

func (s *RouteService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// --- Payment service ---

type PaymentService struct {
	repo    *repositories.PaymentRepo
	booking *repositories.BookingRepo
}

func NewPaymentService(repo *repositories.PaymentRepo, booking *repositories.BookingRepo) *PaymentService {
	return &PaymentService{repo: repo, booking: booking}
}

func (s *PaymentService) List(ctx context.Context) ([]models.Payment, error) {
	return s.repo.List(ctx)
}

func (s *PaymentService) Submit(ctx context.Context, p *models.Payment) error {
	if len(p.UTR) < 6 {
		return fmt.Errorf("UTR must be at least 6 characters")
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return err
	}
	// Stamp the booking with the UTR.
	return s.booking.UpdatePayment(ctx, p.PNR, p.UTR, "pending")
}

func (s *PaymentService) SetStatus(ctx context.Context, id, status string) error {
	if err := s.repo.SetStatus(ctx, id, status); err != nil {
		return err
	}
	if status == "verified" {
		// Find the payment to get the PNR, then update booking payment_status.
		payments, err := s.repo.List(ctx)
		if err != nil {
			return err
		}
		for _, p := range payments {
			if p.ID == id {
				return s.booking.UpdatePayment(ctx, p.PNR, p.UTR, "paid")
			}
		}
	}
	return nil
}

// --- Newsletter service ---

type NewsletterService struct {
	repo *repositories.NewsletterRepo
}

func NewNewsletterService(repo *repositories.NewsletterRepo) *NewsletterService {
	return &NewsletterService{repo: repo}
}

func (s *NewsletterService) List(ctx context.Context) ([]models.NewsletterSubscriber, error) {
	return s.repo.List(ctx)
}

func (s *NewsletterService) Subscribe(ctx context.Context, email, name, source string) (string, error) {
	if !validEmail(email) {
		return "", fmt.Errorf("invalid email")
	}
	return s.repo.Subscribe(ctx, email, name, source)
}

func (s *NewsletterService) Unsubscribe(ctx context.Context, email string) error {
	return s.repo.Unsubscribe(ctx, email)
}

func (s *NewsletterService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// --- Settings service ---

type SettingsService struct {
	repo *repositories.SettingsRepo
}

func NewSettingsService(repo *repositories.SettingsRepo) *SettingsService {
	return &SettingsService{repo: repo}
}

func (s *SettingsService) Get(ctx context.Context) (*models.AppSettings, error) {
	return s.repo.Get(ctx)
}

func (s *SettingsService) Update(ctx context.Context, settings *models.AppSettings) error {
	return s.repo.Update(ctx, *settings)
}

// --- Email template service ---

type EmailTemplateService struct {
	repo *repositories.EmailTemplateRepo
}

func NewEmailTemplateService(repo *repositories.EmailTemplateRepo) *EmailTemplateService {
	return &EmailTemplateService{repo: repo}
}

func (s *EmailTemplateService) List(ctx context.Context) ([]models.EmailTemplate, error) {
	return s.repo.List(ctx)
}

func (s *EmailTemplateService) Update(ctx context.Context, t *models.EmailTemplate) error {
	return s.repo.Update(ctx, *t)
}

// --- Hotel service ---

type HotelService struct {
	repo *repositories.HotelRepo
}

func NewHotelService(repo *repositories.HotelRepo) *HotelService {
	return &HotelService{repo: repo}
}

func (s *HotelService) GetByID(ctx context.Context, id string) (*models.Hotel, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *HotelService) ListActive(ctx context.Context, city string) ([]models.Hotel, error) {
	return s.repo.ListActive(ctx, city)
}

func (s *HotelService) Upsert(ctx context.Context, h *models.Hotel) error {
	if h.StarRating == 0 {
		h.StarRating = 3
	}
	if h.Rating == 0 {
		h.Rating = 4.0
	}
	if h.RoomsAvailable == 0 {
		h.RoomsAvailable = 5
	}
	return s.repo.Upsert(ctx, h)
}

func (s *HotelService) SoftDelete(ctx context.Context, id string) error {
	return s.repo.SoftDelete(ctx, id)
}

// --- Employee file service ---

type EmployeeFileService struct {
	repo *repositories.EmployeeFileRepo
}

func NewEmployeeFileService(repo *repositories.EmployeeFileRepo) *EmployeeFileService {
	return &EmployeeFileService{repo: repo}
}

func (s *EmployeeFileService) List(ctx context.Context, folder string) ([]models.EmployeeFile, error) {
	return s.repo.List(ctx, folder)
}

func (s *EmployeeFileService) Folders(ctx context.Context) ([]map[string]any, error) {
	return s.repo.Folders(ctx)
}

func (s *EmployeeFileService) Create(ctx context.Context, f *models.EmployeeFile) (string, error) {
	return s.repo.Create(ctx, f)
}

func (s *EmployeeFileService) GetFileMeta(ctx context.Context, id string) (*models.EmployeeFile, error) {
	return s.repo.GetFileMeta(ctx, id)
}

func (s *EmployeeFileService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// --- ERP CRUD service ---

type ErpCrudService struct {
	repo *repositories.ErpCrudRepo
}

func NewErpCrudService(repo *repositories.ErpCrudRepo) *ErpCrudService {
	return &ErpCrudService{repo: repo}
}

func (s *ErpCrudService) List(ctx context.Context, table string) ([]map[string]any, error) {
	return s.repo.List(ctx, table)
}

func (s *ErpCrudService) Get(ctx context.Context, table, id string) (map[string]any, error) {
	return s.repo.Get(ctx, table, id)
}

func (s *ErpCrudService) Insert(ctx context.Context, table string, fields map[string]any) error {
	return s.repo.Insert(ctx, table, fields)
}

func (s *ErpCrudService) Update(ctx context.Context, table, id string, fields map[string]any) error {
	return s.repo.Update(ctx, table, id, fields)
}

func (s *ErpCrudService) Delete(ctx context.Context, table, id string) error {
	return s.repo.Delete(ctx, table, id)
}
