export interface HotelRoom {
  id: string;
  room_type: string;
  bed_type: string;
  max_guests: number;
  price_per_night: number;
  amenities: string[];
  photo: string;
  available: boolean;
}

export interface HotelReview {
  id: string;
  guest_name: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  address: string;
  stars: number;
  avg_rating: number;
  review_count: number;
  description: string;
  photos: string[];
  amenities: string[];
  rooms: HotelRoom[];
  reviews: HotelReview[];
  sla_verified: boolean;
  cancellation_policy: string;
  contact_phone: string;
  contact_email: string;
  base_price: number;
}

export interface HotelSearchFilters {
  city: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  priceMin: number;
  priceMax: number;
  starRatings: number[];
  amenities: string[];
  slaOnly: boolean;
  sortBy: 'price-low' | 'price-high' | 'rating' | 'stars';
}

export interface HotelBooking {
  id: string;
  pnr: string;
  hotel_id: string;
  hotel_name: string;
  hotel_city: string;
  hotel_stars: number;
  hotel_photo: string;
  room_id: string;
  room_type: string;
  bed_type: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  guests: number;
  nights: number;
  rate_per_night: number;
  subtotal: number;
  gst: number;
  total: number;
  special_requests: string;
  payment_method: string;
  status: 'confirmed' | 'cancelled' | 'pending' | 'checked-in' | 'checked-out';
  created_at: string;
}

export interface BookingPricing {
  rate_per_night: number;
  nights: number;
  subtotal: number;
  gst_rate: number;
  gst: number;
  total: number;
}
