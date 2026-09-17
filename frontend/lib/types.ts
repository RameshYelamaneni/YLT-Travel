// lib/types.ts
//
// TypeScript interfaces that mirror the Go backend structs in
// backend/pkg/gds/types.go and backend/pkg/erp/structs.go. Keeping these in
// sync by hand is intentional for the initial scaffold; in a larger codebase
// you'd generate them from the Go source or an OpenAPI schema.

// --- GDS / search types (mirror pkg/gds/types.go) ---

export interface SearchRequest {
  source: string;
  destination: string;
  date: string; // YYYY-MM-DD
  passengers: number;
}

export interface SeatInfo {
  id: string;
  label: string;
  row: number;
  col: number;
  deck: "lower" | "upper";
  price: number;
  currency: string;
  status: "available" | "locked" | "booked";
  type: string; // "seater" | "sleeper" | "semi-sleeper"
}

export interface OperatorInfo {
  id: number;
  name: string;
  logo?: string;
  rating: number;
}

export interface TripOption {
  tripId: string;
  operator: OperatorInfo;
  source: string;
  destination: string;
  departureAt: string; // ISO 8601
  arrivalAt: string;
  durationMins: number;
  busType: string;
  totalSeats: number;
  availableSeats: number;
  minPrice: number;
  maxPrice: number;
  currency: string;
  seats: SeatInfo[];
  gds: string;
}

export interface SearchResponse {
  trips: TripOption[];
  errors?: Record<string, string>;
  elapsedMs: number;
}

// --- Seat lock types (mirror pkg/seatlock/manager.go) ---

export interface LockMeta {
  tripId: string;
  seatId: string;
  lockedBy: string;
  acquiredAt: string;
  expiresAt: string;
}

export interface LockSeatRequest {
  tripId: string;
  seatIds: string[];
  lockedBy: string;
}

export interface LockSeatResponse {
  acquired: LockMeta[];
  ttlSeconds: number;
}

// --- ERP types (mirror pkg/erp/structs.go) ---

export type ModuleStatus = "ok" | "degraded" | "empty";

export interface ErpBus {
  id: number;
  operatorId: number;
  registration: string;
  model: string;
  busType: string;
  capacity: number;
  amenities: string | null;
  status: string;
  lastServiceAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ErpSeatInventory {
  id: number;
  tripId: string;
  busId: number;
  seatId: string;
  status: "available" | "locked" | "booked";
  lockedBy: string | null;
  lockedUntil: string | null;
  bookedAt: string | null;
  updatedAt: string;
}

export interface ErpSeatLock {
  id: number;
  tripId: string;
  seatId: string;
  lockedBy: string;
  acquiredAt: string;
  expiresAt: string;
  releasedAt: string | null;
  reason: string | null;
}

export interface ErpLiveTrip {
  id: number;
  tripId: string;
  operatorId: number;
  busId: number;
  source: string;
  destination: string;
  departureAt: string;
  seatsTotal: number;
  seatsSold: number;
  seatsLocked: number;
  grossRevenue: number;
  status: "scheduled" | "boarding" | "in_transit" | "completed";
  updatedAt: string;
}

export interface ErpEmployee {
  id: number;
  operatorId: number;
  name: string;
  role: "driver" | "conductor" | "mechanic" | string;
  phone: string | null;
  active: boolean;
}

export interface ErpExpense {
  id: number;
  operatorId: number;
  category: "fuel" | "maintenance" | "salary" | "toll" | string;
  amount: number;
  currency: string;
  incurredAt: string;
  status: "pending" | "approved" | "paid";
}

// The single unified payload returned by GET /api/v1/erp/dashboard/sync.
// This replaces 26 separate API calls with one round-trip.
export interface DashboardPayload {
  operatorId: number;
  buses: ErpBus[];
  seatInventory: ErpSeatInventory[];
  seatLocks: ErpSeatLock[];
  liveTrips: ErpLiveTrip[];
  employees: ErpEmployee[];
  expenses: ErpExpense[];
  moduleStatus: Record<string, ModuleStatus>;
  generatedAt: string;
  elapsedMs: number;
}

// --- Auth types (mirror internal/models/models.go) ---

export interface AuthResult {
  accessToken: string;
  email: string;
  name: string;
  userId: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  type: "customer" | "admin" | "agent";
  role?: string;
}

export interface Employee {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  status: string;
  createdAt: string;
}

export interface Partner {
  id: string;
  email: string;
  name: string;
  agencyName: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  commissionRate: number;
  createdAt: string;
}

// --- Booking types ---

export interface Booking {
  id: string;
  pnr: string;
  busId: string | null;
  busName: string | null;
  operator: string | null;
  fromCity: string;
  toCity: string;
  travelDate: string;
  departureTime: string;
  seats: string;
  passengers: string;
  contactEmail: string | null;
  contactPhone: string | null;
  totalAmount: number;
  status: string;
  userIdentifier: string | null;
  userType: string;
  boardingPoint: string | null;
  droppingPoint: string | null;
  paymentStatus: string;
  utr: string | null;
  createdAt: string;
}

// --- Director types ---

export interface Director {
  id: string;
  fullName: string;
  title: string;
  bio: string | null;
  imageUrl: string | null;
  createdAt: string;
}

// --- Offer types ---

export interface Offer {
  id: string;
  promoCode: string;
  title: string;
  description: string | null;
  discountValue: number;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
}

// --- Route types ---

export interface Route {
  id: string;
  fromCity: string;
  toCity: string;
  distanceKm: number;
  duration: string | null;
  departureTime: string;
  baseFare: number;
  totalSeats: number;
  departuresDaily: number;
  isActive: boolean;
  createdAt: string;
}

// --- Payment types ---

export interface Payment {
  id: string;
  bookingId: string | null;
  pnr: string;
  amount: number;
  method: string;
  utr: string;
  status: string;
  submittedBy: string | null;
  note: string | null;
  createdAt: string;
  verifiedAt: string | null;
}

// --- Newsletter types ---

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name: string | null;
  source: string;
  isActive: boolean;
  createdAt: string;
}

// --- Settings types ---

export interface AppSettings {
  id: number;
  upiId: string | null;
  upiName: string | null;
  upiQrUrl: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  branch: string | null;
  smtpHost: string | null;
  smtpPort: number;
  smtpUser: string | null;
  smtpPassword?: string | null;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  smtpSecure: boolean;
  emailEnabled: boolean;
  updatedAt: string;
}

// --- Email template types ---

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  subject: string;
  bodyHtml: string;
  availableVariables: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Hotel types ---

export interface Hotel {
  id: string;
  name: string;
  city: string;
  area: string | null;
  address: string | null;
  starRating: number;
  description: string | null;
  amenities: string;
  imageUrl: string | null;
  galleryUrls: string;
  pricePerNight: number;
  roomsAvailable: number;
  rating: number;
  reviews: number;
  isActive: boolean;
  createdAt: string;
}

export interface HotelBooking {
  id: string;
  pnr: string;
  hotelId: string | null;
  hotelName: string;
  city: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
  roomType: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

// --- Employee file types ---

export interface EmployeeFile {
  id: string;
  uploadedByEmail: string | null;
  uploadedByName: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  folder: string;
  description: string | null;
  createdAt: string;
}
