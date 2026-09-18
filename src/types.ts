export type CancellationPolicy = 'free-until-6h' | 'partial' | 'non-refundable';

export interface RouteStop {
  name: string;
  time: string;
}

export interface Bus {
  id: string;
  operator: string;
  bus_type: string;
  service_number: string;
  departure_time: string;
  arrival_time: string;
  duration_mins: number;
  price: number;
  original_price: number;
  rating: number;
  reviews: number;
  is_ac: boolean;
  is_sleeper: boolean;
  is_volvo: boolean;
  live_tracking: boolean;
  sla_verified: boolean;
  women_safety: boolean;
  amenities: string[];
  from: string;
  to: string;
  date: string;
  via: string[];
  seats_total: number;
  seats_available: number;
  single_seats: number;
  ladies_seats: number;
  window_seats: number;
  boarding_points: RouteStop[];
  dropping_points: RouteStop[];
  cancellation: CancellationPolicy;
  rest_stop_rating: number;
  delay_mins: number;
  co2_kg: number;
  hotel_bundle_saving: number;
  punctuality: number;
  meals: boolean;
  accessible: boolean;
  night_crew: boolean;
  delay_guarantee: boolean;
  prime: boolean;
  insurance_available: boolean;
  smart_score: number;
  fleet_bus_id?: string;
  schedule_id?: string;
  seats?: Seat[];
  photo_url?: string;
  listing_source?: 'partner' | 'catalog';
}

export interface Seat {
  id: string;
  label: string;
  type: 'seater' | 'sleeper-lower' | 'sleeper-upper';
  price: number;
  is_booked: boolean;
  deck: 'lower' | 'upper';
  is_ladies?: boolean;
  is_window?: boolean;
  is_single?: boolean;
}

export interface Passenger {
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  seat_id: string;
}

export interface Director {
  id: string;
  name: string;
  role: string;
  bio: string;
  image_url: string | null;
  linkedin_url: string | null;
  order_index: number;
}

export interface AppSettings {
  upi_id: string;
  whatsapp_number: string;
  support_email: string;
  fare_tax_percent: number;
}
