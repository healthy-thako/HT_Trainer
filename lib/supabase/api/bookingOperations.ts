import { supabase } from '../client';
import { NotificationsAPI } from './notifications';

export interface BookingCreateData {
  user_id: string;
  trainer_id: string;
  session_date: string;
  session_time: string;
  duration_minutes: number;
  session_type: string;
  total_amount: number;
  notes?: string;
}

export interface BookingUpdateData {
  session_date?: string;
  session_time?: string;
  duration_minutes?: number;
  session_type?: string;
  total_amount?: number;
  notes?: string;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  payment_status?: 'pending' | 'paid' | 'refunded' | 'failed';
  cancellation_reason?: string;
}

export interface BookingFilters {
  status?: string;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
  session_type?: string;
  user_id?: string;
  limit?: number;
  offset?: number;
}

export class BookingOperationsAPI {
  /**
   * Create a new booking with real-time notifications
   */
  static async createBooking(bookingData: BookingCreateData): Promise<any> {
    try {
      // Validate booking data
      await this.validateBookingData(bookingData);

      // Check trainer availability
      const isAvailable = await this.checkTrainerAvailability(
        bookingData.trainer_id,
        bookingData.session_date,
        bookingData.session_time,
        bookingData.duration_minutes
      );

      if (!isAvailable) {
        throw new Error('Trainer is not available at the requested time');
      }

      // Create the booking
      const { data: booking, error } = await supabase
        .from('trainer_bookings')
        .insert({
          ...bookingData,
          status: 'pending',
          payment_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
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
            pricing,
            user_id
          )
        `)
        .single();

      if (error) throw error;

      // Send notifications
      await this.sendBookingNotifications(booking, 'created');

      // Create earnings record
      await this.createEarningsRecord(booking);

      return booking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  /**
   * Update an existing booking
   */
  static async updateBooking(
    bookingId: string,
    updateData: BookingUpdateData,
    updatedBy: 'trainer' | 'user'
  ): Promise<any> {
    try {
      // Get current booking data
      const { data: currentBooking, error: fetchError } = await supabase
        .from('trainer_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchError) throw fetchError;

      // If rescheduling, check availability
      if (updateData.session_date || updateData.session_time) {
        const isAvailable = await this.checkTrainerAvailability(
          currentBooking.trainer_id,
          updateData.session_date || currentBooking.session_date,
          updateData.session_time || currentBooking.session_time,
          updateData.duration_minutes || currentBooking.duration_minutes,
          bookingId // Exclude current booking from availability check
        );

        if (!isAvailable) {
          throw new Error('Trainer is not available at the requested time');
        }
      }

      // Update the booking
      const { data: updatedBooking, error } = await supabase
        .from('trainer_bookings')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
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
            pricing,
            user_id
          )
        `)
        .single();

      if (error) throw error;

      // Send notifications for status changes
      if (updateData.status && updateData.status !== currentBooking.status) {
        await this.sendBookingNotifications(updatedBooking, 'status_changed', updatedBy);
      }

      // Update earnings if status changed to completed
      if (updateData.status === 'completed' && currentBooking.status !== 'completed') {
        await this.updateEarningsRecord(updatedBooking);
      }

      return updatedBooking;
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(
    bookingId: string,
    cancellationReason: string,
    cancelledBy: 'trainer' | 'user'
  ): Promise<any> {
    try {
      const { data: booking, error } = await supabase
        .from('trainer_bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: cancellationReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
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
            pricing,
            user_id
          )
        `)
        .single();

      if (error) throw error;

      // Send cancellation notifications
      await this.sendBookingNotifications(booking, 'cancelled', cancelledBy);

      // Handle refund if payment was made
      if (booking.payment_status === 'paid') {
        await this.processRefund(booking);
      }

      return booking;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }

  /**
   * Get bookings with filters
   */
  static async getBookings(
    trainerId: string,
    filters: BookingFilters = {}
  ): Promise<any[]> {
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

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }
      if (filters.date_from) {
        query = query.gte('session_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('session_date', filters.date_to);
      }
      if (filters.session_type) {
        query = query.eq('session_type', filters.session_type);
      }
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      // Order by session date and time
      query = query.order('session_date', { ascending: true })
                   .order('session_time', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  }

  /**
   * Get upcoming bookings for today and next few days
   */
  static async getUpcomingBookings(trainerId: string, days: number = 7): Promise<any[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      return await this.getBookings(trainerId, {
        status: 'confirmed',
        date_from: today,
        date_to: futureDateStr,
        limit: 20,
      });
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error);
      throw error;
    }
  }

  /**
   * Check trainer availability for a specific time slot
   */
  static async checkTrainerAvailability(
    trainerId: string,
    sessionDate: string,
    sessionTime: string,
    durationMinutes: number,
    excludeBookingId?: string
  ): Promise<boolean> {
    try {
      // Calculate end time
      const startDateTime = new Date(`${sessionDate}T${sessionTime}`);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);
      const endTime = endDateTime.toTimeString().slice(0, 5);

      // Check for conflicting bookings
      let query = supabase
        .from('trainer_bookings')
        .select('id, session_time, duration_minutes')
        .eq('trainer_id', trainerId)
        .eq('session_date', sessionDate)
        .in('status', ['pending', 'confirmed']);

      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId);
      }

      const { data: existingBookings, error } = await query;

      if (error) throw error;

      // Check for time conflicts
      for (const booking of existingBookings || []) {
        const existingStart = new Date(`${sessionDate}T${booking.session_time}`);
        const existingEnd = new Date(existingStart.getTime() + booking.duration_minutes * 60000);

        // Check if times overlap
        if (
          (startDateTime >= existingStart && startDateTime < existingEnd) ||
          (endDateTime > existingStart && endDateTime <= existingEnd) ||
          (startDateTime <= existingStart && endDateTime >= existingEnd)
        ) {
          return false; // Time conflict found
        }
      }

      return true; // No conflicts
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  }

  /**
   * Validate booking data
   */
  private static async validateBookingData(bookingData: BookingCreateData): Promise<void> {
    // Check if session date is in the future
    const sessionDateTime = new Date(`${bookingData.session_date}T${bookingData.session_time}`);
    const now = new Date();

    if (sessionDateTime <= now) {
      throw new Error('Session date and time must be in the future');
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', bookingData.user_id)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    // Check if trainer exists
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('id')
      .eq('id', bookingData.trainer_id)
      .single();

    if (trainerError || !trainer) {
      throw new Error('Trainer not found');
    }

    // Validate duration
    if (bookingData.duration_minutes < 30 || bookingData.duration_minutes > 180) {
      throw new Error('Session duration must be between 30 and 180 minutes');
    }

    // Validate amount
    if (bookingData.total_amount <= 0) {
      throw new Error('Total amount must be greater than 0');
    }
  }

  /**
   * Send booking notifications
   */
  private static async sendBookingNotifications(
    booking: any,
    action: 'created' | 'status_changed' | 'cancelled',
    actionBy?: 'trainer' | 'user'
  ): Promise<void> {
    try {
      const trainerUserId = booking.trainer.user_id;
      const clientUserId = booking.user.id;

      switch (action) {
        case 'created':
          // Notify trainer of new booking
          await NotificationsAPI.createNotification({
            user_id: trainerUserId,
            title: 'New Booking Request',
            message: `${booking.user.full_name} has requested a ${booking.session_type} session on ${new Date(booking.session_date).toLocaleDateString()}`,
            type: 'booking',
            priority: 'high',
            category: 'new_booking',
            data: { booking_id: booking.id },
            read: false,
          });

          // Notify client of booking confirmation
          await NotificationsAPI.createNotification({
            user_id: clientUserId,
            title: 'Booking Request Sent',
            message: `Your booking request with ${booking.trainer.name} has been sent and is pending confirmation`,
            type: 'booking',
            priority: 'medium',
            category: 'booking_status',
            data: { booking_id: booking.id },
            read: false,
          });
          break;

        case 'status_changed':
          const statusMessages = {
            confirmed: 'Your booking has been confirmed',
            completed: 'Your session has been marked as completed',
            cancelled: 'Your booking has been cancelled',
          };

          const recipientId = actionBy === 'trainer' ? clientUserId : trainerUserId;
          const message = statusMessages[booking.status as keyof typeof statusMessages] || 
                         `Your booking status has been updated to ${booking.status}`;

          await NotificationsAPI.createNotification({
            user_id: recipientId,
            title: 'Booking Status Update',
            message,
            type: 'booking',
            priority: 'high',
            category: 'booking_status',
            data: { booking_id: booking.id },
            read: false,
          });
          break;

        case 'cancelled':
          const otherUserId = actionBy === 'trainer' ? clientUserId : trainerUserId;
          const cancellerName = actionBy === 'trainer' ? booking.trainer.name : booking.user.full_name;

          await NotificationsAPI.createNotification({
            user_id: otherUserId,
            title: 'Booking Cancelled',
            message: `${cancellerName} has cancelled the session scheduled for ${new Date(booking.session_date).toLocaleDateString()}`,
            type: 'booking',
            priority: 'high',
            category: 'booking_cancelled',
            data: { booking_id: booking.id },
            read: false,
          });
          break;
      }
    } catch (error) {
      console.error('Error sending booking notifications:', error);
    }
  }

  /**
   * Create earnings record for completed booking
   */
  private static async createEarningsRecord(booking: any): Promise<void> {
    try {
      const commissionRate = 0.15; // 15% platform fee
      const netAmount = booking.total_amount * (1 - commissionRate);

      await supabase
        .from('trainer_earnings')
        .insert({
          trainer_id: booking.trainer_id,
          booking_id: booking.id,
          amount: booking.total_amount,
          commission_rate: commissionRate,
          net_amount: netAmount,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error creating earnings record:', error);
    }
  }

  /**
   * Update earnings record when booking is completed
   */
  private static async updateEarningsRecord(booking: any): Promise<void> {
    try {
      await supabase
        .from('trainer_earnings')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('booking_id', booking.id);
    } catch (error) {
      console.error('Error updating earnings record:', error);
    }
  }

  /**
   * Process refund for cancelled booking
   */
  private static async processRefund(booking: any): Promise<void> {
    try {
      // Update payment status
      await supabase
        .from('trainer_bookings')
        .update({
          payment_status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      // Update earnings record
      await supabase
        .from('trainer_earnings')
        .update({
          status: 'refunded',
        })
        .eq('booking_id', booking.id);

      // In a real implementation, you would integrate with payment processor here
      console.log('Refund processed for booking:', booking.id);
    } catch (error) {
      console.error('Error processing refund:', error);
    }
  }
} 