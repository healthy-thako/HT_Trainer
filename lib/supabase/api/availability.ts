import { supabase } from '../client';
import type { TrainerAvailability } from '../../../types/trainer';

export interface AvailabilitySlot {
  id?: string;
  trainer_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AvailabilityException {
  id?: string;
  trainer_id: string;
  date: string; // YYYY-MM-DD
  start_time?: string;
  end_time?: string;
  is_available: boolean;
  reason?: string;
  created_at?: string;
}

export class AvailabilityAPI {
  /**
   * Get trainer's weekly availability
   */
  static async getTrainerAvailability(trainerId: string): Promise<AvailabilitySlot[]> {
    try {
      const { data, error } = await supabase
        .from('trainer_availability')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trainer availability:', error);
      throw error;
    }
  }

  /**
   * Update trainer's weekly availability
   */
  static async updateTrainerAvailability(
    trainerId: string, 
    availability: Omit<AvailabilitySlot, 'id' | 'trainer_id' | 'created_at' | 'updated_at'>[]
  ): Promise<AvailabilitySlot[]> {
    try {
      // Delete existing availability
      await supabase
        .from('trainer_availability')
        .delete()
        .eq('trainer_id', trainerId);

      // Insert new availability
      const availabilityWithTrainer = availability.map(slot => ({
        ...slot,
        trainer_id: trainerId,
      }));

      const { data, error } = await supabase
        .from('trainer_availability')
        .insert(availabilityWithTrainer)
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error updating trainer availability:', error);
      throw error;
    }
  }

  /**
   * Get available time slots for a specific date
   */
  static async getAvailableSlots(trainerId: string, date: string): Promise<string[]> {
    try {
      const dayOfWeek = new Date(date).getDay();
      
      // Get regular availability for the day
      const { data: regularAvailability } = await supabase
        .from('trainer_availability')
        .select('start_time, end_time')
        .eq('trainer_id', trainerId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      // Get existing bookings for the date
      const { data: bookings } = await supabase
        .from('trainer_bookings')
        .select('session_time, duration_minutes')
        .eq('trainer_id', trainerId)
        .eq('session_date', date)
        .in('status', ['confirmed', 'pending']);

      // Get availability exceptions for the date
      const { data: exceptions } = await supabase
        .from('trainer_availability_exceptions')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('date', date);

      // Calculate available slots
      const availableSlots: string[] = [];
      
      if (regularAvailability && regularAvailability.length > 0) {
        for (const slot of regularAvailability) {
          const startTime = new Date(`2000-01-01T${slot.start_time}`);
          const endTime = new Date(`2000-01-01T${slot.end_time}`);
          
          // Generate 60-minute slots
          while (startTime < endTime) {
            const slotTime = startTime.toTimeString().slice(0, 5);
            
            // Check if slot is not booked
            const isBooked = bookings?.some(booking => {
              const bookingStart = new Date(`2000-01-01T${booking.session_time}`);
              const bookingEnd = new Date(bookingStart.getTime() + (booking.duration_minutes * 60000));
              return startTime >= bookingStart && startTime < bookingEnd;
            });

            // Check exceptions
            const hasException = exceptions?.some(exception => 
              !exception.is_available && 
              (!exception.start_time || slotTime >= exception.start_time) &&
              (!exception.end_time || slotTime < exception.end_time)
            );

            if (!isBooked && !hasException) {
              availableSlots.push(slotTime);
            }

            startTime.setHours(startTime.getHours() + 1);
          }
        }
      }

      return availableSlots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }

  /**
   * Add availability exception (holiday, break, etc.)
   */
  static async addAvailabilityException(exception: Omit<AvailabilityException, 'id' | 'created_at'>): Promise<AvailabilityException> {
    try {
      const { data, error } = await supabase
        .from('trainer_availability_exceptions')
        .insert(exception)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding availability exception:', error);
      throw error;
    }
  }

  /**
   * Remove availability exception
   */
  static async removeAvailabilityException(exceptionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trainer_availability_exceptions')
        .delete()
        .eq('id', exceptionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing availability exception:', error);
      return false;
    }
  }

  /**
   * Get trainer's availability exceptions
   */
  static async getAvailabilityExceptions(trainerId: string, fromDate?: string, toDate?: string): Promise<AvailabilityException[]> {
    try {
      let query = supabase
        .from('trainer_availability_exceptions')
        .select('*')
        .eq('trainer_id', trainerId);

      if (fromDate) {
        query = query.gte('date', fromDate);
      }
      if (toDate) {
        query = query.lte('date', toDate);
      }

      const { data, error } = await query.order('date');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching availability exceptions:', error);
      throw error;
    }
  }

  /**
   * Bulk update availability for multiple days
   */
  static async bulkUpdateAvailability(
    trainerId: string,
    updates: { day_of_week: number; slots: Omit<AvailabilitySlot, 'id' | 'trainer_id' | 'day_of_week' | 'created_at' | 'updated_at'>[] }[]
  ): Promise<boolean> {
    try {
      // Delete existing availability for specified days
      const daysToUpdate = updates.map(u => u.day_of_week);
      await supabase
        .from('trainer_availability')
        .delete()
        .eq('trainer_id', trainerId)
        .in('day_of_week', daysToUpdate);

      // Prepare new availability slots
      const allSlots = updates.flatMap(update => 
        update.slots.map(slot => ({
          ...slot,
          trainer_id: trainerId,
          day_of_week: update.day_of_week,
        }))
      );

      if (allSlots.length > 0) {
        const { error } = await supabase
          .from('trainer_availability')
          .insert(allSlots);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error bulk updating availability:', error);
      return false;
    }
  }
} 