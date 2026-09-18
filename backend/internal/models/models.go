// Package models holds the domain structs for every module. Each struct maps
// closely to a legacy MySQL table and uses sql.Null* for nullable columns so
// NULL is never silently coerced to a zero value (which would hide data bugs).
package models

import (
	"database/sql"
	"time"
)

// --- Auth / users ---

type User struct {
	ID       string         `json:"id"`
	Email    string         `json:"email"`
	Password sql.NullString `json:"-"` // never serialized
	Name     string         `json:"name"`
	Type     string         `json:"type"` // customer | admin | agent
	Role     sql.NullString `json:"role,omitempty"`
	Status   sql.NullString `json:"status,omitempty"`
}

type Employee struct {
	ID           string         `json:"id"`
	Email        string         `json:"email"`
	PasswordHash sql.NullString `json:"-"`
	Name         string         `json:"name"`
	Role         string         `json:"role"`
	Phone        sql.NullString `json:"phone"`
	Status       string         `json:"status"`
	CreatedAt    time.Time      `json:"createdAt"`
}

type Partner struct {
	ID             string         `json:"id"`
	Email          string         `json:"email"`
	PasswordHash   sql.NullString `json:"-"`
	Name           string         `json:"name"`
	AgencyName     sql.NullString `json:"agencyName"`
	Phone          sql.NullString `json:"phone"`
	City           sql.NullString `json:"city"`
	Status         string         `json:"status"`
	CommissionRate float64        `json:"commissionRate"`
	CreatedAt      time.Time      `json:"createdAt"`
}

type OTPCode struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Code      string    `json:"-"`
	ExpiresAt time.Time `json:"expiresAt"`
	Used      bool      `json:"used"`
}

// --- Bookings ---

type Booking struct {
	ID             string  `json:"id"`
	PNR            string  `json:"pnr"`
	BusID          sql.NullString `json:"busId"`
	BusName        sql.NullString `json:"busName"`
	Operator       sql.NullString `json:"operator"`
	FromCity       string  `json:"fromCity"`
	ToCity         string  `json:"toCity"`
	TravelDate     string  `json:"travelDate"`
	DepartureTime   string  `json:"departureTime"`
	Seats          string  `json:"seats"`         // JSON array stored as string
	Passengers      string  `json:"passengers"`    // JSON array stored as string
	ContactEmail   sql.NullString `json:"contactEmail"`
	ContactPhone   sql.NullString `json:"contactPhone"`
	TotalAmount    float64 `json:"totalAmount"`
	Status         string  `json:"status"`
	UserIdentifier sql.NullString `json:"userIdentifier"`
	UserType       string  `json:"userType"`
	BoardingPoint  sql.NullString `json:"boardingPoint"`
	DroppingPoint  sql.NullString `json:"droppingPoint"`
	PaymentStatus  string  `json:"paymentStatus"`
	UTR            sql.NullString `json:"utr"`
	CreatedAt      time.Time `json:"createdAt"`
}

// --- Hotel bookings ---

type HotelBooking struct {
	ID             string         `json:"id"`
	PNR            string         `json:"pnr"`
	HotelID        sql.NullString `json:"hotel_id"`
	HotelName      string         `json:"hotel_name"`
	City           string         `json:"city"`
	GuestName      string         `json:"guest_name"`
	GuestEmail     string         `json:"guest_email"`
	GuestPhone     sql.NullString `json:"guest_phone"`
	CheckIn        string         `json:"check_in"`
	CheckOut       string         `json:"check_out"`
	Rooms          int            `json:"rooms"`
	Guests         int            `json:"guests"`
	RoomType       string         `json:"room_type"`
	TotalAmount    float64        `json:"total_amount"`
	Status         string         `json:"status"`
	UserIdentifier sql.NullString `json:"user_identifier"`
	PaymentStatus  string         `json:"payment_status"`
	CreatedAt      time.Time      `json:"created_at"`
}

// --- Directors ---

type Director struct {
	ID       string    `json:"id"`
	FullName string    `json:"fullName"`
	Title    string    `json:"title"`
	Bio      sql.NullString `json:"bio"`
	ImageURL sql.NullString `json:"imageUrl"`
	CreatedAt time.Time `json:"createdAt"`
}

// --- Hotels catalog ---

type Hotel struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	City          string    `json:"city"`
	Area          sql.NullString `json:"area"`
	Address       sql.NullString `json:"address"`
	StarRating    int       `json:"starRating"`
	Description   sql.NullString `json:"description"`
	Amenities     string    `json:"amenities"` // JSON array
	ImageURL      sql.NullString `json:"imageUrl"`
	GalleryURLs   string    `json:"galleryUrls"` // JSON array
	PricePerNight float64   `json:"pricePerNight"`
	RoomsAvailable int      `json:"roomsAvailable"`
	Rating        float64   `json:"rating"`
	Reviews       int       `json:"reviews"`
	IsActive      bool      `json:"isActive"`
	CreatedAt     time.Time `json:"createdAt"`
}

// --- Offers ---

type Offer struct {
	ID            string    `json:"id"`
	PromoCode     string    `json:"promo_code"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	DiscountValue string    `json:"discount_value"`
	ExpiryDate    string    `json:"expiry_date"`
	IsActive      bool      `json:"is_active"`
	Tag           string    `json:"tag"`
	Tone          string    `json:"tone"`
	CreatedAt     time.Time `json:"created_at"`
}

// --- Routes ---

type Route struct {
	ID             string    `json:"id"`
	FromCity       string    `json:"fromCity"`
	ToCity         string    `json:"toCity"`
	DistanceKM     int       `json:"distanceKm"`
	Duration       sql.NullString `json:"duration"`
	DepartureTime  string    `json:"departureTime"`
	BaseFare       float64   `json:"baseFare"`
	TotalSeats     int       `json:"totalSeats"`
	DeparturesDaily int      `json:"departuresDaily"`
	IsActive       bool      `json:"isActive"`
	CreatedAt      time.Time `json:"createdAt"`
}

// --- Payments ---

type Payment struct {
	ID          string    `json:"id"`
	BookingID   sql.NullString `json:"bookingId"`
	PNR         string    `json:"pnr"`
	Amount      float64   `json:"amount"`
	Method      string    `json:"method"`
	UTR         string    `json:"utr"`
	Status      string    `json:"status"`
	SubmittedBy sql.NullString `json:"submittedBy"`
	Note        sql.NullString `json:"note"`
	CreatedAt   time.Time `json:"createdAt"`
	VerifiedAt  sql.NullTime `json:"verifiedAt"`
}

// --- Newsletter ---

type NewsletterSubscriber struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      sql.NullString `json:"name"`
	Source    string    `json:"source"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
}

// --- App settings (single row, id=1) ---

type AppSettings struct {
	ID            int    `json:"id"`
	UPIID         sql.NullString `json:"upiId"`
	UPIName       sql.NullString `json:"upiName"`
	UPIQRURL      sql.NullString `json:"upiQrUrl"`
	BankName      sql.NullString `json:"bankName"`
	AccountName   sql.NullString `json:"accountName"`
	AccountNumber sql.NullString `json:"accountNumber"`
	IFSC          sql.NullString `json:"ifsc"`
	Branch        sql.NullString `json:"branch"`
	SMTPHost      sql.NullString `json:"smtpHost"`
	SMTPPort      int    `json:"smtpPort"`
	SMTPUser      sql.NullString `json:"smtpUser"`
	SMTPPassword  sql.NullString `json:"smtpPassword,omitempty"`
	SMTPFromEmail sql.NullString `json:"smtpFromEmail"`
	SMTPFromName  sql.NullString `json:"smtpFromName"`
	SMTPSecure    bool   `json:"smtpSecure"`
	EmailEnabled  bool   `json:"emailEnabled"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// --- Email templates ---

type EmailTemplate struct {
	ID                 string    `json:"id"`
	Key                string    `json:"key"`
	Name               string    `json:"name"`
	Description        sql.NullString `json:"description"`
	Subject            string    `json:"subject"`
	BodyHTML           string    `json:"bodyHtml"`
	AvailableVariables string    `json:"availableVariables"` // JSON array
	IsActive           bool      `json:"isActive"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

// --- Employee files ---

type EmployeeFile struct {
	ID             string    `json:"id"`
	UploadedByEmail sql.NullString `json:"uploadedByEmail"`
	UploadedByName sql.NullString `json:"uploadedByName"`
	Filename       string    `json:"filename"`
	MimeType       string    `json:"mimeType"`
	SizeBytes      int64     `json:"sizeBytes"`
	Folder         string    `json:"folder"`
	Description    sql.NullString `json:"description"`
	CreatedAt      time.Time `json:"createdAt"`
}

// --- ERP module structs (mirror the 26 erp_* tables) ---

type ErpBus struct {
	ID            int64          `json:"id"`
	OperatorID    int64          `json:"operatorId"`
	Registration  string         `json:"registration"`
	Model         string         `json:"model"`
	BusType       string         `json:"busType"`
	Capacity      int            `json:"capacity"`
	Amenities     sql.NullString `json:"amenities"`
	Status        string         `json:"status"`
	LastServiceAt sql.NullTime   `json:"lastServiceAt"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
}

type ErpSeatInventory struct {
	ID          int64          `json:"id"`
	TripID      string         `json:"tripId"`
	BusID       int64          `json:"busId"`
	SeatID      string         `json:"seatId"`
	Status      string         `json:"status"`
	LockedBy    sql.NullString `json:"lockedBy"`
	LockedUntil sql.NullTime   `json:"lockedUntil"`
	BookedAt    sql.NullTime   `json:"bookedAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
}

type ErpSeatLock struct {
	ID         int64          `json:"id"`
	TripID     string         `json:"tripId"`
	SeatID     string         `json:"seatId"`
	LockedBy   string         `json:"lockedBy"`
	AcquiredAt time.Time      `json:"acquiredAt"`
	ExpiresAt  time.Time      `json:"expiresAt"`
	ReleasedAt sql.NullTime   `json:"releasedAt"`
	Reason     sql.NullString  `json:"reason"`
}

type ErpLiveTrip struct {
	ID           int64     `json:"id"`
	TripID       string    `json:"tripId"`
	OperatorID   int64     `json:"operatorId"`
	BusID        int64     `json:"busId"`
	Source       string    `json:"source"`
	Destination  string    `json:"destination"`
	DepartureAt  time.Time `json:"departureAt"`
	SeatsTotal   int       `json:"seatsTotal"`
	SeatsSold    int       `json:"seatsSold"`
	SeatsLocked  int       `json:"seatsLocked"`
	GrossRevenue float64   `json:"grossRevenue"`
	Status       string    `json:"status"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type ErpEmployee struct {
	ID         int64          `json:"id"`
	OperatorID int64          `json:"operatorId"`
	Name       string         `json:"name"`
	Role       string         `json:"role"`
	Phone      sql.NullString `json:"phone"`
	Active     bool           `json:"active"`
}

type ErpExpense struct {
	ID         int64     `json:"id"`
	OperatorID int64     `json:"operatorId"`
	Category   string    `json:"category"`
	Amount     float64   `json:"amount"`
	Currency   string    `json:"currency"`
	IncurredAt time.Time `json:"incurredAt"`
	Status     string    `json:"status"`
}

// --- GDS types ---

type SearchRequest struct {
	Source      string    `json:"source"`
	Destination string    `json:"destination"`
	Date        time.Time `json:"date"`
	Passengers  int       `json:"passengers"`
}

type SeatInfo struct {
	ID       string  `json:"id"`
	Label    string  `json:"label"`
	Row      int     `json:"row"`
	Col      int     `json:"col"`
	Deck     string  `json:"deck"`
	Price    float64 `json:"price"`
	Currency string  `json:"currency"`
	Status   string  `json:"status"`
	Type     string  `json:"type"`
}

type OperatorInfo struct {
	ID     int64   `json:"id"`
	Name   string  `json:"name"`
	Logo   string  `json:"logo"`
	Rating float64 `json:"rating"`
}

type TripOption struct {
	TripID         string       `json:"tripId"`
	Operator       OperatorInfo `json:"operator"`
	Source         string       `json:"source"`
	Destination    string       `json:"destination"`
	DepartureAt    time.Time    `json:"departureAt"`
	ArrivalAt      time.Time    `json:"arrivalAt"`
	DurationMins   int          `json:"durationMins"`
	BusType        string       `json:"busType"`
	TotalSeats     int          `json:"totalSeats"`
	AvailableSeats int          `json:"availableSeats"`
	MinPrice       float64      `json:"minPrice"`
	MaxPrice       float64      `json:"maxPrice"`
	Currency       string       `json:"currency"`
	Seats          []SeatInfo   `json:"seats"`
	GDS            string       `json:"gds"`
}

// --- Dashboard unified payload ---

type ModuleStatus string

const (
	StatusOK       ModuleStatus = "ok"
	StatusDegraded ModuleStatus = "degraded"
	StatusEmpty    ModuleStatus = "empty"
)

type DashboardPayload struct {
	OperatorID   int64                    `json:"operatorId"`
	Buses        []ErpBus                 `json:"buses"`
	SeatInventory []ErpSeatInventory      `json:"seatInventory"`
	SeatLocks    []ErpSeatLock            `json:"seatLocks"`
	LiveTrips    []ErpLiveTrip            `json:"liveTrips"`
	Employees    []ErpEmployee            `json:"employees"`
	Expenses     []ErpExpense             `json:"expenses"`
	ModuleStatus map[string]ModuleStatus  `json:"moduleStatus"`
	GeneratedAt  time.Time                `json:"generatedAt"`
	ElapsedMs    int64                    `json:"elapsedMs"`
}
