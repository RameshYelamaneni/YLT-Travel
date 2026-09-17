export const MOCK_CITIES = [
  'Hyderabad', 'Bengaluru', 'Chennai', 'Tirupati', 'Vijayawada',
  'Visakhapatnam', 'Coimbatore', 'Kochi', 'Mysuru', 'Madurai',
];

export const MOCK_PLACES: Record<string, string[]> = {
  Hyderabad: ['Rajiv Gandhi Intl Airport (HYD)', 'Hitech City', 'Gachibowli', 'Miyapur Depot', 'Banjara Hills', 'LB Nagar', 'Kukatpally', 'Secunderabad Jn'],
  Bengaluru: ['Kempegowda Intl Airport (BLR)', 'MG Road', 'Whitefield', 'Electronic City', 'Koramangala', 'Indiranagar', 'Majestic Bus Stand'],
  Chennai: ['Chennai Intl Airport (MAA)', 'T Nagar', 'Anna Nagar', 'Guindy', 'Koyambedu CMBT', 'Adyar', 'Velachery'],
  Tirupati: ['Tirupati Bus Stand', 'Renigunta Jn', 'Alipiri', 'Tirumala', 'Airport (TIR)'],
  Vijayawada: ['Vijayawada Jn', 'Gannavaram Airport', 'Benz Circle', 'PNB Centre', 'Bandar Road'],
  Visakhapatnam: ['Visakhapatnam Airport', 'RTC Complex', 'Dwaraka Nagar', 'Rushikonda', 'Gajuwaka'],
  Coimbatore: ['Coimbatore Airport', 'RS Puram', 'Gandhipuram', 'Avinashi Road', 'Ukkadam'],
};

export function mockDistanceForAddresses(pickup: string, dropoff: string): { km: number; mins: number } {
  if (!pickup || !dropoff) return { km: 0, mins: 0 };
  const base = Math.abs(pickup.length - dropoff.length);
  const hash = (pickup + dropoff).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const km = Math.max(4, (hash % 45) + base + 5);
  return { km, mins: Math.round(km * 2.2) };
}

export type CarRentalType = 'Sedan' | 'SUV' | 'Hatchback' | 'Luxury';
export type CarRentalMode = 'self-drive' | 'chauffeured';
export type CarRentalService =
  | 'self-drive' | 'chauffeured' | 'car-pool'
  | 'hourly' | 'outstation' | 'airport' | 'terminal' | 'subscription';

export interface CarRentalOption {
  id: string;
  model: string;
  type: CarRentalType;
  mode: CarRentalMode;
  service: CarRentalService;
  rate_per_km: number;
  base_fare: number;
  hourly_rate: number;
  eta_mins: number;
  rating: number;
  reviews: number;
  operator: string;
  image_url: string;
  features: string[];
  sla_verified: boolean;
  seats: number;
  fuel: string;
  transmission: 'Automatic' | 'Manual';
  city: string;
}

export interface CarPoolListing {
  id: string;
  driver_name: string;
  driver_rating: number;
  car_model: string;
  car_type: CarRentalType;
  from_city: string;
  to_city: string;
  departure_time: string;
  duration_mins: number;
  total_seats: number;
  available_seats: number;
  price_per_seat: number;
  image_url: string;
  features: string[];
  sla_verified: boolean;
}

export interface AddressInput {
  pickup_address: string;
  dropoff_address: string;
  distance_km: number;
  estimated_mins: number;
}

export function calculateCarFare(
  car: Pick<CarRentalOption, 'base_fare' | 'rate_per_km' | 'hourly_rate'>,
  distanceKm: number,
  service: CarRentalService,
  hours = 0,
): number {
  switch (service) {
    case 'hourly': return car.base_fare + car.hourly_rate * Math.max(1, hours);
    case 'subscription': return car.base_fare * 30;
    case 'car-pool': return car.base_fare;
    default: return car.base_fare + car.rate_per_km * Math.max(1, Math.round(distanceKm));
  }
}

export const mockCarRentals: CarRentalOption[] = [
  { id: 'CR-001', model: 'Maruti Suzuki Dzire', type: 'Sedan', mode: 'chauffeured', service: 'chauffeured', rate_per_km: 14, base_fare: 149, hourly_rate: 250, eta_mins: 8, rating: 4.7, reviews: 1280, operator: 'YLT Last-Mile', image_url: 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=600', features: ['AC', '4 seats', 'Professional driver', 'GPS tracking'], sla_verified: true, seats: 4, fuel: 'CNG', transmission: 'Manual', city: 'Hyderabad' },
  { id: 'CR-002', model: 'Toyota Innova Crysta', type: 'SUV', mode: 'chauffeured', service: 'outstation', rate_per_km: 22, base_fare: 299, hourly_rate: 450, eta_mins: 12, rating: 4.8, reviews: 2100, operator: 'YLT Premium', image_url: 'https://images.pexels.com/photos/244297/pexels-photo-244297.jpeg?auto=compress&cs=tinysrgb&w=600', features: ['AC', '7 seats', 'Premium interior', 'WiFi onboard'], sla_verified: true, seats: 7, fuel: 'Diesel', transmission: 'Automatic', city: 'Hyderabad' },
  { id: 'CR-003', model: 'Maruti Swift', type: 'Hatchback', mode: 'self-drive', service: 'self-drive', rate_per_km: 11, base_fare: 99, hourly_rate: 180, eta_mins: 5, rating: 4.5, reviews: 890, operator: 'YLT Self-Drive', image_url: 'https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg?auto=compress&cs=tinysrgb&w=600', features: ['AC', '5 seats', 'Self-drive', 'Fuel included'], sla_verified: true, seats: 5, fuel: 'Petrol', transmission: 'Manual', city: 'Chennai' },
  { id: 'CR-004', model: 'Hyundai Creta', type: 'SUV', mode: 'self-drive', service: 'self-drive', rate_per_km: 18, base_fare: 199, hourly_rate: 320, eta_mins: 7, rating: 4.6, reviews: 540, operator: 'YLT Self-Drive', image_url: 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=600', features: ['AC', '5 seats', 'Automatic', 'Sunroof'], sla_verified: true, seats: 5, fuel: 'Diesel', transmission: 'Automatic', city: 'Bengaluru' },
  { id: 'CR-005', model: 'Honda City', type: 'Sedan', mode: 'chauffeured', service: 'airport', rate_per_km: 16, base_fare: 199, hourly_rate: 300, eta_mins: 10, rating: 4.7, reviews: 750, operator: 'YLT Airport', image_url: 'https://images.pexels.com/photos/358499/pexels-photo-358499.jpeg?auto=compress&cs=tinysrgb&w=600', features: ['AC', '5 seats', 'Airport pickup', 'Flight tracking'], sla_verified: true, seats: 5, fuel: 'Petrol', transmission: 'Automatic', city: 'Hyderabad' },
  { id: 'CR-006', model: 'Mercedes-Benz E-Class', type: 'Luxury', mode: 'chauffeured', service: 'chauffeured', rate_per_km: 35, base_fare: 599, hourly_rate: 800, eta_mins: 15, rating: 4.9, reviews: 320, operator: 'YLT Signature', image_url: 'https://images.pexels.com/photos/372946/pexels-photo-372946.jpeg?auto=compress&cs=tinysrgb&w=600', features: ['AC', '5 seats', 'Leather interior', 'Complimentary water'], sla_verified: true, seats: 5, fuel: 'Diesel', transmission: 'Automatic', city: 'Bengaluru' },
  { id: 'CR-007', model: 'Maruti Ertiga', type: 'SUV', mode: 'chauffeured', service: 'hourly', rate_per_km: 15, base_fare: 249, hourly_rate: 280, eta_mins: 9, rating: 4.4, reviews: 410, operator: 'YLT City', image_url: 'https://images.pexels.com/photos/159238/pexels-photo-159238.jpeg?auto=compress&cs=tinysrgb&w=600', features: ['AC', '7 seats', 'Hourly rental', 'Flexible stops'], sla_verified: false, seats: 7, fuel: 'CNG', transmission: 'Manual', city: 'Chennai' },
  { id: 'CR-008', model: 'Tata Nexon EV', type: 'SUV', mode: 'self-drive', service: 'subscription', rate_per_km: 14, base_fare: 3999, hourly_rate: 250, eta_mins: 6, rating: 4.8, reviews: 180, operator: 'YLT Green', image_url: 'https://images.pexels.com/photos/12861656/pexels-photo-12861656.jpeg?auto=compress&cs=tinysrgb&w=600', features: ['Electric', '5 seats', 'Weekly subscription', 'Free charging'], sla_verified: true, seats: 5, fuel: 'Electric', transmission: 'Automatic', city: 'Bengaluru' },
];

export const mockCarPoolListings: CarPoolListing[] = [
  { id: 'CP-001', driver_name: 'S. Anil Kumar', driver_rating: 4.8, car_model: 'Maruti Swift', car_type: 'Hatchback', from_city: 'Hyderabad', to_city: 'Bengaluru', departure_time: '07:30', duration_mins: 510, total_seats: 4, available_seats: 2, price_per_seat: 450, image_url: 'https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg?auto=compress&cs=tinysrgb&w=400', features: ['AC', 'Music', 'No smoking'], sla_verified: true },
  { id: 'CP-002', driver_name: 'R. Srinivasulu', driver_rating: 4.6, car_model: 'Honda City', car_type: 'Sedan', from_city: 'Chennai', to_city: 'Tirupati', departure_time: '06:00', duration_mins: 225, total_seats: 4, available_seats: 3, price_per_seat: 350, image_url: 'https://images.pexels.com/photos/358499/pexels-photo-358499.jpeg?auto=compress&cs=tinysrgb&w=400', features: ['AC', 'Comfortable', 'Experienced driver'], sla_verified: true },
  { id: 'CP-003', driver_name: 'K. Venkatesh', driver_rating: 4.5, car_model: 'Toyota Innova', car_type: 'SUV', from_city: 'Bengaluru', to_city: 'Coimbatore', departure_time: '14:00', duration_mins: 420, total_seats: 6, available_seats: 4, price_per_seat: 550, image_url: 'https://images.pexels.com/photos/244297/pexels-photo-244297.jpeg?auto=compress&cs=tinysrgb&w=400', features: ['AC', 'Spacious', 'Highway ride'], sla_verified: false },
  { id: 'CP-004', driver_name: 'M. Krishna Rao', driver_rating: 4.9, car_model: 'Hyundai Creta', car_type: 'SUV', from_city: 'Hyderabad', to_city: 'Vijayawada', departure_time: '09:00', duration_mins: 270, total_seats: 5, available_seats: 2, price_per_seat: 400, image_url: 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=400', features: ['AC', 'Automatic', 'Premium'], sla_verified: true },
];

export interface LastMileCar {
  id: string;
  model: string;
  type: string;
  mode: 'self-drive' | 'chauffeured';
  rate_per_km: number;
  base_fare: number;
  eta_mins: number;
  image_url: string;
}

export const mockLastMileCars: LastMileCar[] = [
  { id: 'LM-1', model: 'Maruti Dzire', type: 'Sedan', mode: 'chauffeured', rate_per_km: 14, base_fare: 149, eta_mins: 8, image_url: 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: 'LM-2', model: 'Honda City', type: 'Sedan', mode: 'chauffeured', rate_per_km: 16, base_fare: 199, eta_mins: 10, image_url: 'https://images.pexels.com/photos/358499/pexels-photo-358499.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: 'LM-3', model: 'Maruti Swift', type: 'Hatchback', mode: 'self-drive', rate_per_km: 11, base_fare: 99, eta_mins: 5, image_url: 'https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg?auto=compress&cs=tinysrgb&w=400' },
];
