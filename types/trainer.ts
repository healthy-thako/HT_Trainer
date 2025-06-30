export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  avatar_url?: string;
  user_type: 'user' | 'trainer' | 'gym_owner' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface TrainerProfile {
  id: string;
  user_id: string;
  gym_id?: string;
  name: string;
  image_url?: string;
  specialty?: string;
  experience?: string;
  rating: number;
  reviews: number;
  description?: string;
  certifications?: string[];
  specialties?: string[];
  availability?: TrainerAvailability;
  contact_phone?: string;
  contact_email?: string;
  location?: string;
  pricing?: TrainerPricing;
  status: 'active' | 'inactive' | 'pending';
  total_earnings: number;
  average_rating: number;
  total_reviews: number;
  monthly_bookings: number;
  client_count: number;
  created_at: string;
  updated_at: string;
}

export interface TrainerAvailability {
  [day: string]: {
    available: boolean;
    start_time?: string;
    end_time?: string;
    break_start?: string;
    break_end?: string;
  };
}

export interface TrainerPricing {
  personal_training?: number;
  group_session?: number;
  consultation?: number;
  package_deals?: {
    sessions: number;
    price: number;
    discount_percentage: number;
  }[];
}

export interface TrainerSettings {
  id: string;
  trainer_id: string;
  advance_booking_days: number;
  buffer_time_minutes: number;
  auto_accept_bookings: boolean;
  allow_same_day_booking: boolean;
  cancellation_policy_hours: number;
  notification_preferences: {
    new_booking?: boolean;
    booking_reminder?: boolean;
    payment_received?: boolean;
    client_message?: boolean;
    review_received?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface TrainerBooking {
  id: string;
  user_id: string;
  trainer_id: string;
  session_date: string;
  session_time: string;
  duration_minutes: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'pending' | 'paid' | 'refunded';
  session_type: 'Personal Training' | 'Group Session' | 'Consultation';
  notes?: string;
  trainer_notes?: string;
  rating?: number;
  client_feedback?: string;
  reminder_sent: boolean;
  no_show: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainerEarnings {
  id: string;
  trainer_id: string;
  booking_id?: string;
  amount: number;
  commission_rate: number;
  platform_fee: number;
  net_amount: number;
  status: 'pending' | 'paid' | 'processing';
  payment_method?: string;
  paid_at?: string;
  created_at: string;
}

export interface TrainerReview {
  id: string;
  trainer_id: string;
  user_id: string;
  booking_id?: string;
  rating: number;
  comment?: string;
  session_type?: string;
  would_recommend: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainerDashboardData {
  trainer: TrainerProfile;
  todayBookings: TrainerBooking[];
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalClients: number;
  averageRating: number;
  totalReviews: number;
  pendingBookings: number;
  completedSessions: number;
  recentReviews: TrainerReview[];
}

export interface AuthenticatedTrainer {
  user: User;
  trainer: TrainerProfile;
  settings: TrainerSettings;
} 