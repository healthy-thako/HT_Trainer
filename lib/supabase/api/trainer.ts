import { supabase } from '../client';
import type { 
  User, 
  TrainerProfile, 
  TrainerSettings, 
  TrainerBooking, 
  TrainerEarnings, 
  TrainerReview,
  TrainerDashboardData,
  AuthenticatedTrainer 
} from '../../../types/trainer';

export class TrainerAPI {
  /**
   * Get trainer profile by user ID
   */
  static async getTrainerByUserId(userId: string): Promise<TrainerProfile | null> {
    try {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching trainer profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getTrainerByUserId:', error);
      return null;
    }
  }

  /**
   * Get complete authenticated trainer data (user + trainer + settings)
   */
  static async getAuthenticatedTrainer(userId: string): Promise<AuthenticatedTrainer | null> {
    try {
      // Get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('user_type', 'trainer')
        .single();

      if (userError || !userData) {
        console.error('Error fetching user data:', userError);
        return null;
      }

      // Get trainer profile
      const trainerProfile = await this.getTrainerByUserId(userId);
      if (!trainerProfile) {
        console.error('No trainer profile found for user:', userId);
        return null;
      }

      // Get trainer settings
      const settings = await this.getTrainerSettings(trainerProfile.id);

      return {
        user: userData as User,
        trainer: trainerProfile,
        settings: settings || await this.createDefaultTrainerSettings(trainerProfile.id)
      };
    } catch (error) {
      console.error('Error in getAuthenticatedTrainer:', error);
      return null;
    }
  }

  /**
   * Get trainer settings
   */
  static async getTrainerSettings(trainerId: string): Promise<TrainerSettings | null> {
    try {
      const { data, error } = await supabase
        .from('trainer_settings')
        .select('*')
        .eq('trainer_id', trainerId)
        .single();

      if (error) {
        console.error('Error fetching trainer settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getTrainerSettings:', error);
      return null;
    }
  }

  /**
   * Create default trainer settings
   */
  static async createDefaultTrainerSettings(trainerId: string): Promise<TrainerSettings> {
    const defaultSettings = {
      trainer_id: trainerId,
      advance_booking_days: 30,
      buffer_time_minutes: 15,
      auto_accept_bookings: true,
      allow_same_day_booking: false,
      cancellation_policy_hours: 24,
      notification_preferences: {
        new_booking: true,
        booking_reminder: true,
        payment_received: true,
        client_message: true,
        review_received: true
      }
    };

    const { data, error } = await supabase
      .from('trainer_settings')
      .insert(defaultSettings)
      .select()
      .single();

    if (error) {
      console.error('Error creating default trainer settings:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update trainer profile
   */
  static async updateTrainerProfile(trainerId: string, updates: Partial<TrainerProfile>): Promise<TrainerProfile | null> {
    try {
      const { data, error } = await supabase
        .from('trainers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', trainerId)
        .select()
        .single();

      if (error) {
        console.error('Error updating trainer profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateTrainerProfile:', error);
      return null;
    }
  }

  /**
   * Get trainer dashboard data
   */
  static async getTrainerDashboard(trainerId: string): Promise<TrainerDashboardData | null> {
    try {
      // Get trainer profile
      const { data: trainer, error: trainerError } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', trainerId)
        .single();

      if (trainerError || !trainer) {
        console.error('Error fetching trainer for dashboard:', trainerError);
        return null;
      }

      // Get today's bookings
      const today = new Date().toISOString().split('T')[0];
      const { data: todayBookings } = await supabase
        .from('trainer_bookings')
        .select(`
          *,
          users!trainer_bookings_user_id_fkey(full_name, avatar_url)
        `)
        .eq('trainer_id', trainerId)
        .eq('session_date', today)
        .order('session_time');

      // Get weekly earnings
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const { data: weeklyEarningsData } = await supabase
        .from('trainer_earnings')
        .select('net_amount')
        .eq('trainer_id', trainerId)
        .gte('created_at', weekStart.toISOString())
        .eq('status', 'paid');

      const weeklyEarnings = weeklyEarningsData?.reduce((sum, earning) => sum + Number(earning.net_amount), 0) || 0;

      // Get monthly earnings
      const monthStart = new Date();
      monthStart.setDate(1);
      const { data: monthlyEarningsData } = await supabase
        .from('trainer_earnings')
        .select('net_amount')
        .eq('trainer_id', trainerId)
        .gte('created_at', monthStart.toISOString())
        .eq('status', 'paid');

      const monthlyEarnings = monthlyEarningsData?.reduce((sum, earning) => sum + Number(earning.net_amount), 0) || 0;

      // Get recent reviews
      const { data: recentReviews } = await supabase
        .from('trainer_reviews')
        .select(`
          *,
          users!trainer_reviews_user_id_fkey(full_name, avatar_url)
        `)
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get pending bookings count
      const { count: pendingBookings } = await supabase
        .from('trainer_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', trainerId)
        .eq('status', 'pending');

      // Get completed sessions count (this month)
      const { count: completedSessions } = await supabase
        .from('trainer_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', trainerId)
        .eq('status', 'completed')
        .gte('session_date', monthStart.toISOString().split('T')[0]);

      return {
        trainer,
        todayBookings: todayBookings || [],
        weeklyEarnings,
        monthlyEarnings,
        totalClients: trainer.client_count || 0,
        averageRating: Number(trainer.average_rating) || 0,
        totalReviews: trainer.total_reviews || 0,
        pendingBookings: pendingBookings || 0,
        completedSessions: completedSessions || 0,
        recentReviews: recentReviews || []
      };
    } catch (error) {
      console.error('Error in getTrainerDashboard:', error);
      return null;
    }
  }

  /**
   * Get trainer bookings with filters
   */
  static async getTrainerBookings(
    trainerId: string, 
    filters?: {
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
    }
  ): Promise<TrainerBooking[]> {
    try {
      let query = supabase
        .from('trainer_bookings')
        .select(`
          *,
          users!trainer_bookings_user_id_fkey(full_name, avatar_url, phone_number)
        `)
        .eq('trainer_id', trainerId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.dateFrom) {
        query = query.gte('session_date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('session_date', filters.dateTo);
      }

      query = query
        .order('session_date', { ascending: false })
        .order('session_time', { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching trainer bookings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTrainerBookings:', error);
      return [];
    }
  }

  /**
   * Update booking status
   */
  static async updateBookingStatus(
    bookingId: string, 
    status: TrainerBooking['status'],
    trainerNotes?: string
  ): Promise<boolean> {
    try {
      const updates: any = { 
        status, 
        updated_at: new Date().toISOString() 
      };

      if (trainerNotes) {
        updates.trainer_notes = trainerNotes;
      }

      const { error } = await supabase
        .from('trainer_bookings')
        .update(updates)
        .eq('id', bookingId);

      if (error) {
        console.error('Error updating booking status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateBookingStatus:', error);
      return false;
    }
  }

  /**
   * Get trainer earnings with filters
   */
  static async getTrainerEarnings(
    trainerId: string,
    filters?: {
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
    }
  ): Promise<TrainerEarnings[]> {
    try {
      let query = supabase
        .from('trainer_earnings')
        .select(`
          *,
          trainer_bookings!trainer_earnings_booking_id_fkey(
            session_date,
            session_time,
            session_type,
            users!trainer_bookings_user_id_fkey(full_name)
          )
        `)
        .eq('trainer_id', trainerId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      query = query.order('created_at', { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching trainer earnings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTrainerEarnings:', error);
      return [];
    }
  }

  /**
   * Validate trainer authentication
   */
  static async validateTrainerAuth(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', userId)
        .eq('user_type', 'trainer')
        .single();

      return !error && data !== null;
    } catch (error) {
      console.error('Error validating trainer auth:', error);
      return false;
    }
  }
} 