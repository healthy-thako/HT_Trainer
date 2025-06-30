import { supabase } from '../client';
import { 
  User, 
  Trainer, 
  TrainerProfile, 
  TrainerBookingWithDetails, 
  ChatConversationWithDetails, 
  ChatMessage,
  TrainerStats,
  TrainerAvailability 
} from '../../../types';

// Export all API modules
export { TrainerAPI } from './trainer';
export { AvailabilityAPI } from './availability';
export { ClientsAPI } from './clients';
export { WorkoutsAPI } from './workouts';
export { NutritionAPI } from './nutrition';
export { AnalyticsAPI } from './analytics';
export { NotificationsAPI } from './notifications';
export { PaymentsAPI } from './payments';
export { SubscriptionsAPI } from './subscriptions';

// Authentication API
export const authApi = {
  signIn: async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error.message);
        throw new Error(error.message);
      }
      
      console.log('✅ Sign in successful');
      return data;
    } catch (error: any) {
      console.error('❌ Sign in failed:', error.message);
      throw error;
    }
  },

  signUp: async (email: string, password: string, trainerData: any) => {
    try {
      console.log('📝 Attempting sign up for:', email);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: trainerData.name,
            user_type: 'trainer'
          }
          // Skip email confirmation if disabled in project settings
        }
      });

      if (authError) {
        console.error('❌ Sign up auth error:', authError.message);
        throw new Error(authError.message);
      }

      // Check if user was created (either confirmed or pending confirmation)
      if (authData.user) {
        console.log('👤 Creating trainer profile for user:', authData.user.id);
        
        // Create trainer profile regardless of email confirmation status
        const { error: trainerError } = await supabase
          .from('trainers')
          .insert({
            user_id: authData.user.id,
            name: trainerData.name,
            bio: trainerData.bio,
            specialty: trainerData.specialty,
            experience: trainerData.experience,
            certifications: trainerData.certifications || [],
            specialties: trainerData.specialties || [],
            pricing: trainerData.pricing || {},
            contact_phone: trainerData.contact_phone,
            contact_email: trainerData.contact_email,
            location: trainerData.location,
            status: 'active',
          });

        if (trainerError) {
          console.error('❌ Trainer profile creation error:', trainerError.message);
          throw new Error(`Failed to create trainer profile: ${trainerError.message}`);
        }
        
        console.log('✅ Trainer profile created successfully');
      }

      // Return success info including confirmation status
      console.log('✅ Sign up successful', {
        needsConfirmation: !authData.session,
        userCreated: !!authData.user
      });
      
      return {
        ...authData,
        needsEmailConfirmation: !authData.session && !!authData.user
      };
    } catch (error: any) {
      console.error('❌ Sign up failed:', error.message);
      throw error;
    }
  },

  signOut: async () => {
    try {
      console.log('🚪 Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error.message);
        throw new Error(error.message);
      }
      console.log('✅ Sign out successful');
    } catch (error: any) {
      console.error('❌ Sign out failed:', error.message);
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('❌ Get current user error:', error.message);
        throw new Error(error.message);
      }
      return user;
    } catch (error: any) {
      console.error('❌ Get current user failed:', error.message);
      throw error;
    }
  },

  // Test connection function
  testConnection: async () => {
    try {
      console.log('🔍 Testing Supabase connection...');
      const { data, error } = await supabase.from('users').select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        console.error('❌ Connection test failed:', error.message);
        return { success: false, error: error.message };
      }
      
      console.log('✅ Supabase connection successful');
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      console.error('❌ Connection test error:', error.message);
      return { success: false, error: error.message };
    }
  },
};

// Trainer Profile API
export const trainerApi = {
  getTrainerProfile: async (userId: string): Promise<TrainerProfile | null> => {
    const { data, error } = await supabase
      .from('trainers')
      .select(`
        *,
        user:user_id (
          id,
          email,
          full_name,
          phone_number,
          avatar_url,
          created_at,
          updated_at
        ),
        gym:gym_id (
          id,
          name,
          address,
          phone
        )
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  },

  updateTrainerProfile: async (trainerId: string, updates: Partial<Trainer>) => {
    const { data, error } = await supabase
      .from('trainers')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', trainerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getTrainerStats: async (trainerId: string): Promise<TrainerStats | null> => {
    try {
      const { data, error } = await supabase
        .from('trainer_dashboard_analytics')
        .select('*')
        .eq('trainer_id', trainerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found, return default stats
          return {
            total_earnings: 0,
            total_bookings: 0,
            average_rating: 0,
            total_reviews: 0,
            completed_sessions: 0,
            upcoming_sessions: 0,
            response_rate: 95,
            active_conversations: 0,
          };
        }
        throw error;
      }

      return {
        total_earnings: Number(data.total_earnings) || 0,
        total_bookings: Number(data.total_bookings) || 0,
        average_rating: Number(data.average_rating) || 0,
        total_reviews: Number(data.total_reviews) || 0,
        completed_sessions: Number(data.completed_sessions) || 0,
        upcoming_sessions: Number(data.upcoming_sessions) || 0,
        response_rate: 95, // Default response rate - could be calculated from response times
        active_conversations: Number(data.active_conversations) || 0,
      };
    } catch (error) {
      console.error('Error fetching trainer stats:', error);
      return {
        total_earnings: 0,
        total_bookings: 0,
        average_rating: 0,
        total_reviews: 0,
        completed_sessions: 0,
        upcoming_sessions: 0,
        response_rate: 95,
        active_conversations: 0,
      };
    }
  },
};

// Bookings API
export const bookingsApi = {
  getTrainerBookings: async (
    trainerId: string, 
    filters: {
      status?: string;
      from_date?: string;
      to_date?: string;
    } = {}
  ): Promise<TrainerBookingWithDetails[]> => {
    try {
      let query = supabase
        .from('trainer_bookings')
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            email,
            phone_number,
            avatar_url
          ),
          trainer:trainer_id (
            id,
            name,
            image_url,
            pricing
          )
        `)
        .eq('trainer_id', trainerId);

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.from_date) {
        query = query.gte('session_date', filters.from_date);
      }
      if (filters.to_date) {
        query = query.lte('session_date', filters.to_date);
      }

      const { data, error } = await query.order('session_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trainer bookings:', error);
      throw error;
    }
  },

  updateBookingStatus: async (bookingId: string, status: string, notes?: string) => {
    const { data, error } = await supabase
      .from('trainer_bookings')
      .update({
        status,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getBookingById: async (bookingId: string): Promise<TrainerBookingWithDetails> => {
    const { data, error } = await supabase
      .from('trainer_bookings')
      .select(`
        *,
        user:user_id (
          id,
          full_name,
          email,
          phone_number,
          avatar_url
        ),
        trainer:trainer_id (
          id,
          name,
          image_url,
          pricing
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error) throw error;
    return data;
  },

  createBooking: async (bookingData: {
    user_id: string;
    trainer_id: string;
    session_date: string;
    session_time: string;
    duration_minutes: number;
    total_amount: number;
    session_type?: string;
    notes?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('trainer_bookings')
        .insert({
          ...bookingData,
          status: 'pending',
          payment_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },
};

// Chat API
export const chatApi = {
  getTrainerConversations: async (trainerId: string): Promise<ChatConversationWithDetails[]> => {
    try {
      const { data: conversations, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            avatar_url,
            email
          ),
          trainer:trainer_id (
            id,
            name,
            image_url,
            user_id
          ),
          booking:booking_id (
            id,
            session_date,
            session_time,
            status
          )
        `)
        .eq('trainer_id', trainerId)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get unread counts and last messages for each conversation
      const conversationsWithDetails = await Promise.all(
        (conversations || []).map(async (conversation) => {
          // Get unread count
          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversation.id)
            .eq('sender_type', 'user')
            .is('read_at', null);

          // Get last message
          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...conversation,
            unread_count: unreadCount || 0,
            last_message: lastMessage,
          };
        })
      );

      return conversationsWithDetails;
    } catch (error) {
      console.error('Error fetching trainer conversations:', error);
      throw error;
    }
  },

  getConversationMessages: async (conversationId: string): Promise<ChatMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      throw error;
    }
  },

  getConversationById: async (conversationId: string): Promise<ChatConversationWithDetails | null> => {
    try {
      const { data: conversation, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            avatar_url,
            email
          ),
          trainer:trainer_id (
            id,
            name,
            image_url,
            user_id
          ),
          booking:booking_id (
            id,
            session_date,
            session_time,
            status
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      // Get unread count and last message
      const { count: unreadCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'user')
        .is('read_at', null);

      const { data: lastMessage } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        ...conversation,
        unread_count: unreadCount || 0,
        last_message: lastMessage,
      } as ChatConversationWithDetails;
    } catch (error) {
      console.error('Error fetching conversation by ID:', error);
      throw error;
    }
  },

  sendMessage: async (
    conversationId: string,
    senderId: string,
    senderType: 'trainer' | 'user',
    messageText: string,
    messageType: string = 'text',
    attachmentUrl?: string
  ): Promise<ChatMessage> => {
    try {
      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          sender_type: senderType,
          message_text: messageText,
          message_type: messageType,
          attachment_url: attachmentUrl,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from('chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  markMessagesAsRead: async (conversationId: string, userId: string): Promise<void> => {
    try {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  },

  getConversationByBooking: async (bookingId: string): Promise<ChatConversationWithDetails | null> => {
    try {
      const { data: conversation, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            avatar_url,
            email
          ),
          trainer:trainer_id (
            id,
            name,
            image_url,
            user_id
          ),
          booking:booking_id (
            id,
            session_date,
            session_time,
            status
          )
        `)
        .eq('booking_id', bookingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return conversation as ChatConversationWithDetails;
    } catch (error) {
      console.error('Error fetching conversation by booking:', error);
      throw error;
    }
  },

  createConversation: async (
    bookingId: string,
    userId: string,
    trainerId: string
  ): Promise<ChatConversationWithDetails> => {
    try {
      const { data: conversation, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: userId,
          trainer_id: trainerId,
          booking_id: bookingId,
          status: 'active',
          last_message_at: new Date().toISOString(),
        })
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            avatar_url,
            email
          ),
          trainer:trainer_id (
            id,
            name,
            image_url,
            user_id
          ),
          booking:booking_id (
            id,
            session_date,
            session_time,
            status
          )
        `)
        .single();

      if (error) throw error;

      return {
        ...conversation,
        unread_count: 0,
      } as ChatConversationWithDetails;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  getOrCreateConversationForClient: async (clientId: string) => {
    try {
      // Get current trainer
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!trainer) throw new Error('Trainer not found');

      // First try to find existing conversation
      const { data: existingConversation } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('trainer_id', trainer.id)
        .eq('user_id', clientId)
        .eq('status', 'active')
        .single();

      if (existingConversation) {
        return existingConversation;
      }

      // Create new conversation
      const { data: conversation, error } = await supabase
        .from('chat_conversations')
        .insert({
          trainer_id: trainer.id,
          user_id: clientId,
          status: 'active',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return conversation;
    } catch (error) {
      console.error('Error getting/creating conversation for client:', error);
      throw error;
    }
  },
};

// Navigation API for cross-feature integration
export const navigationApi = {
  getBookingFromConversation: async (conversationId: string) => {
    try {
      const { data: conversation, error } = await supabase
        .from('chat_conversations')
        .select('booking_id')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return conversation?.booking_id;
    } catch (error) {
      console.error('Error getting booking from conversation:', error);
      return null;
    }
  },

  getConversationFromBooking: async (bookingId: string) => {
    try {
      const { data: conversation, error } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('booking_id', bookingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return conversation?.id;
    } catch (error) {
      console.error('Error getting conversation from booking:', error);
      return null;
    }
  },
};

// Availability API
export const availabilityApi = {
  getTrainerAvailability: async (trainerId: string): Promise<TrainerAvailability[]> => {
    const { data, error } = await supabase
      .from('trainer_availability')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('day_of_week');

    if (error) throw error;
    return data || [];
  },

  updateAvailability: async (trainerId: string, availability: Partial<TrainerAvailability>[]) => {
    // Delete existing availability
    await supabase
      .from('trainer_availability')
      .delete()
      .eq('trainer_id', trainerId);

    // Insert new availability
    const { data, error } = await supabase
      .from('trainer_availability')
      .insert(
        availability.map(slot => ({
          trainer_id: trainerId,
          ...slot,
        }))
      )
      .select();

    if (error) throw error;
    return data;
  },

  getAvailableTimeSlots: async (trainerId: string, date: string): Promise<string[]> => {
    try {
      const dayOfWeek = new Date(date).getDay();
      
      // Get trainer availability for the day
      const { data: availability, error } = await supabase
        .from('trainer_availability')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true)
        .single();

      if (error || !availability) return [];

      // Get existing bookings for the date
      const { data: bookings } = await supabase
        .from('trainer_bookings')
        .select('session_time, duration_minutes')
        .eq('trainer_id', trainerId)
        .eq('session_date', date)
        .in('status', ['confirmed', 'pending']);

      // Generate available time slots
      const slots: string[] = [];
      const startTime = new Date(`2000-01-01T${availability.start_time}`);
      const endTime = new Date(`2000-01-01T${availability.end_time}`);
      const sessionDuration = 60; // Default 60 minutes

      for (let time = new Date(startTime); time < endTime; time.setMinutes(time.getMinutes() + sessionDuration)) {
        const timeString = time.toTimeString().slice(0, 5);
        
        // Check if this slot conflicts with existing bookings
        const hasConflict = bookings?.some(booking => {
          const bookingStart = new Date(`2000-01-01T${booking.session_time}`);
          const bookingEnd = new Date(bookingStart.getTime() + (booking.duration_minutes * 60000));
          const slotStart = new Date(time);
          const slotEnd = new Date(time.getTime() + (sessionDuration * 60000));
          
          return (slotStart < bookingEnd && slotEnd > bookingStart);
        });

        if (!hasConflict) {
          slots.push(timeString);
        }
      }

      return slots;
    } catch (error) {
      console.error('Error getting available time slots:', error);
      return [];
    }
  },
};

// Client Management API
export const clientApi = {
  getTrainerClients: async (trainerId: string): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from('trainer_client_relationships')
        .select(`
          *,
          user:client_user_id (
            id,
            full_name,
            email,
            avatar_url,
            phone_number
          )
        `)
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trainer clients:', error);
      throw error;
    }
  },

  addClientToTrainer: async (trainerId: string, clientUserId: string, notes?: string) => {
    try {
      const { data, error } = await supabase
        .from('trainer_client_relationships')
        .insert({
          trainer_id: trainerId,
          client_user_id: clientUserId,
          notes: notes,
          onboarding_completed: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding client to trainer:', error);
      throw error;
    }
  },

  updateClientNotes: async (relationshipId: string, notes: string) => {
    try {
      const { data, error } = await supabase
        .from('trainer_client_relationships')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', relationshipId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating client notes:', error);
      throw error;
    }
  },
};

// Cross-Platform API for Main HT App Integration
export const crossPlatformApi = {
  // Get all active trainers for the main app
  getAllTrainers: async (filters?: {
    specialty?: string;
    location?: string;
    min_rating?: number;
    max_price?: number;
    limit?: number;
    offset?: number;
  }) => {
    try {
      let query = supabase
        .from('trainers')
        .select(`
          id,
          name,
          image_url,
          specialty,
          specialties,
          experience,
          average_rating,
          total_reviews,
          description,
          location,
          pricing,
          certifications,
          bio,
          user:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('status', 'active');

      // Apply filters
      if (filters?.specialty) {
        query = query.contains('specialties', [filters.specialty]);
      }
      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters?.min_rating) {
        query = query.gte('average_rating', filters.min_rating);
      }
      if (filters?.max_price) {
        query = query.lte('pricing->hourly_rate', filters.max_price);
      }

      query = query
        .order('average_rating', { ascending: false })
        .limit(filters?.limit || 20);

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching trainers for main app:', error);
      throw error;
    }
  },

  // Get trainer details for booking
  getTrainerDetails: async (trainerId: string) => {
    try {
      const { data: trainer, error } = await supabase
        .from('trainers')
        .select(`
          *,
          user:user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('id', trainerId)
        .eq('status', 'active')
        .single();

      if (error) throw error;

      // Get trainer availability for next 30 days
      const { data: availability } = await supabase
        .from('trainer_availability')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('is_available', true)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(30);

      return {
        ...trainer,
        availability: availability || [],
      };
    } catch (error) {
      console.error('Error fetching trainer details:', error);
      throw error;
    }
  },

  // Book a session (called from main HT app)
  bookTrainerSession: async (bookingData: {
    user_id: string;
    trainer_id: string;
    session_date: string;
    session_time: string;
    duration_minutes: number;
    total_amount: number;
    payment_method: string;
    payment_token?: string;
    notes?: string;
  }) => {
    try {
      // Use the payment processing function
      const result = await PaymentsAPI.processBookingPayment(bookingData);
      return result;
    } catch (error) {
      console.error('Error booking trainer session:', error);
      throw error;
    }
  },

  // Get user's bookings (for main HT app)
  getUserBookings: async (userId: string, status?: string) => {
    try {
      let query = supabase
        .from('trainer_bookings')
        .select(`
          *,
          trainer:trainer_id (
            id,
            name,
            image_url,
            specialty,
            location,
            user:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', userId);

      if (status) {
        query = query.eq('status', status);
      }

      query = query.order('session_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  },

  // Get or create chat conversation (for main HT app)
  getOrCreateConversation: async (userId: string, trainerId: string, bookingId?: string) => {
    try {
      // First, try to find existing conversation
      let { data: conversation, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          trainer:trainer_id (
            id,
            name,
            image_url,
            user:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', userId)
        .eq('trainer_id', trainerId)
        .eq('status', 'active');

      if (bookingId) {
        conversation = conversation?.filter(c => c.booking_id === bookingId) || [];
      }

      if (error) throw error;

      // If conversation exists, return it
      if (conversation && conversation.length > 0) {
        return conversation[0];
      }

      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: userId,
          trainer_id: trainerId,
          booking_id: bookingId,
          status: 'active',
          last_message_at: new Date().toISOString(),
        })
        .select(`
          *,
          trainer:trainer_id (
            id,
            name,
            image_url,
            user:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .single();

      if (createError) throw createError;

      return newConversation;
    } catch (error) {
      console.error('Error getting or creating conversation:', error);
      throw error;
    }
  },

  // Send message (for main HT app)
  sendMessage: async (conversationId: string, senderId: string, messageText: string, senderType: 'user' | 'trainer' = 'user') => {
    try {
      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          sender_type: senderType,
          message_text: messageText,
          message_type: 'text',
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation last message time
      await supabase
        .from('chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Get conversation messages (for main HT app)
  getConversationMessages: async (conversationId: string, limit: number = 50, offset: number = 0) => {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return messages?.reverse() || [];
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      throw error;
    }
  },
}; 