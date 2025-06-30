export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Trainer {
  id: string;
  user_id: string;
  name: string;
  bio?: string;
  specialty?: string;
  experience?: number;
  image_url?: string;
  rating?: number;
  total_reviews?: number;
  gym_id?: string;
  hourly_rate?: number;
  is_available: boolean;
  certification?: string;
  specialties?: string[];
  contact_info?: any;
  created_at: string;
  updated_at: string;
}

export interface TrainerProfile extends Trainer {
  user: User;
  gym?: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
}

export interface ChatConversation {
  id: string;
  user_id: string;
  trainer_id: string;
  booking_id?: string;
  status: 'active' | 'closed' | 'archived';
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'user' | 'trainer';
  message_text: string;
  message_type: 'text' | 'image' | 'file' | 'booking_update';
  attachment_url?: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatConversationWithDetails extends ChatConversation {
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
  };
  trainer: {
    id: string;
    name: string;
    image_url?: string;
    user_id: string;
  };
  booking?: {
    id: string;
    session_date: string;
    session_time: string;
    status: string;
  };
  last_message?: ChatMessage;
  unread_count: number;
}

export interface TrainerBooking {
  id: string;
  user_id: string;
  trainer_id: string;
  session_date: string;
  session_time: string;
  duration_minutes: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  created_at: string;
  updated_at: string;
}

export interface TrainerBookingWithDetails extends TrainerBooking {
  user: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string;
    avatar_url?: string;
  };
  trainer: {
    id: string;
    name: string;
    image_url?: string;
    hourly_rate: number;
  };
}

export interface TrainerStats {
  total_bookings: number;
  completed_sessions: number;
  total_earnings: number;
  average_rating: number;
  total_reviews: number;
  upcoming_sessions: number;
  response_rate: number;
  active_conversations: number;
}

export interface TrainerAvailability {
  id: string;
  trainer_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  trainer: Trainer | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, trainerData: any) => Promise<void>;
  signOut: () => Promise<void>;
  updateTrainerProfile: (updates: Partial<Trainer>) => Promise<void>;
}

export interface NavigationParamList {
  '(tabs)': undefined;
  auth: undefined;
  'auth/login': undefined;
  'auth/register': undefined;
  'chat/[id]': { id: string };
  'chat/index': undefined;
  'bookings/[id]': { id: string };
  dashboard: undefined;
  profile: undefined;
}

export type TabParamList = {
  dashboard: undefined;
  bookings: undefined;
  chat: undefined;
  profile: undefined;
}; 