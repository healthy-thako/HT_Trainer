import { supabase } from '../client';

export interface PaymentTransaction {
  id: string;
  trainer_id: string;
  booking_id?: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_type: 'booking_payment' | 'subscription' | 'commission' | 'refund';
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  processing_fee: number;
  net_amount: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TrainerEarnings {
  id: string;
  trainer_id: string;
  booking_id?: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
  net_earnings: number;
  payment_status: 'pending' | 'paid' | 'processing';
  payout_date?: string;
  payout_method?: string;
  payout_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  trainer_id: string;
  type: 'bank_account' | 'paypal' | 'stripe_express';
  is_default: boolean;
  is_verified: boolean;
  details: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface EarningsStats {
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  this_month_earnings: number;
  last_month_earnings: number;
  average_session_rate: number;
  total_sessions: number;
  commission_rate: number;
}

export const PaymentsAPI = {
  // Earnings Management
  getTrainerEarnings: async (trainerId: string, filters: {
    status?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    try {
      let query = supabase
        .from('trainer_earnings')
        .select(`
          *,
          booking:booking_id (
            id,
            session_date,
            session_time,
            duration_minutes,
            user:user_id (
              full_name,
              email
            )
          )
        `)
        .eq('trainer_id', trainerId);

      if (filters.status) {
        query = query.eq('payment_status', filters.status);
      }
      if (filters.from_date) {
        query = query.gte('created_at', filters.from_date);
      }
      if (filters.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 50);

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as TrainerEarnings[];
    } catch (error) {
      console.error('Error fetching trainer earnings:', error);
      throw error;
    }
  },

  getEarningsStats: async (trainerId: string): Promise<EarningsStats> => {
    try {
      // Get all earnings
      const { data: earnings, error: earningsError } = await supabase
        .from('trainer_earnings')
        .select('*')
        .eq('trainer_id', trainerId);

      if (earningsError) throw earningsError;

      // Calculate stats
      const totalEarnings = earnings?.reduce((sum, e) => sum + e.net_earnings, 0) || 0;
      const pendingEarnings = earnings?.filter(e => e.payment_status === 'pending')
        .reduce((sum, e) => sum + e.net_earnings, 0) || 0;
      const paidEarnings = earnings?.filter(e => e.payment_status === 'paid')
        .reduce((sum, e) => sum + e.net_earnings, 0) || 0;

      // This month earnings
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthEarnings = earnings?.filter(e => 
        new Date(e.created_at) >= thisMonth
      ).reduce((sum, e) => sum + e.net_earnings, 0) || 0;

      // Last month earnings
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      const lastMonthEnd = new Date(thisMonth);
      lastMonthEnd.setDate(0);
      
      const lastMonthEarnings = earnings?.filter(e => {
        const date = new Date(e.created_at);
        return date >= lastMonth && date <= lastMonthEnd;
      }).reduce((sum, e) => sum + e.net_earnings, 0) || 0;

      // Get session stats
      const { data: bookings } = await supabase
        .from('trainer_bookings')
        .select('total_amount')
        .eq('trainer_id', trainerId)
        .eq('status', 'completed');

      const totalSessions = bookings?.length || 0;
      const averageSessionRate = totalSessions > 0 
        ? (bookings?.reduce((sum, b) => sum + b.total_amount, 0) || 0) / totalSessions 
        : 0;

      // Get trainer commission rate
      const { data: trainer } = await supabase
        .from('trainers')
        .select('commission_rate')
        .eq('id', trainerId)
        .single();

      return {
        total_earnings: totalEarnings,
        pending_earnings: pendingEarnings,
        paid_earnings: paidEarnings,
        this_month_earnings: thisMonthEarnings,
        last_month_earnings: lastMonthEarnings,
        average_session_rate: averageSessionRate,
        total_sessions: totalSessions,
        commission_rate: trainer?.commission_rate || 0.15, // Default 15%
      };
    } catch (error) {
      console.error('Error fetching earnings stats:', error);
      throw error;
    }
  },

  // Payment Methods
  getPaymentMethods: async (trainerId: string) => {
    try {
      const { data, error } = await supabase
        .from('trainer_payment_methods')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('is_default', { ascending: false });

      if (error) throw error;
      return data as PaymentMethod[];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  },

  addPaymentMethod: async (trainerId: string, paymentMethod: {
    type: 'bank_account' | 'paypal' | 'stripe_express';
    details: Record<string, any>;
    is_default?: boolean;
  }) => {
    try {
      // If this is set as default, unset other defaults
      if (paymentMethod.is_default) {
        await supabase
          .from('trainer_payment_methods')
          .update({ is_default: false })
          .eq('trainer_id', trainerId);
      }

      const { data, error } = await supabase
        .from('trainer_payment_methods')
        .insert({
          trainer_id: trainerId,
          type: paymentMethod.type,
          details: paymentMethod.details,
          is_default: paymentMethod.is_default || false,
          is_verified: false, // Will be verified through external process
        })
        .select()
        .single();

      if (error) throw error;
      return data as PaymentMethod;
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  },

  updatePaymentMethod: async (paymentMethodId: string, updates: {
    details?: Record<string, any>;
    is_default?: boolean;
    is_verified?: boolean;
  }) => {
    try {
      const { data, error } = await supabase
        .from('trainer_payment_methods')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentMethodId)
        .select()
        .single();

      if (error) throw error;
      return data as PaymentMethod;
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw error;
    }
  },

  deletePaymentMethod: async (paymentMethodId: string) => {
    try {
      const { error } = await supabase
        .from('trainer_payment_methods')
        .delete()
        .eq('id', paymentMethodId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  },

  // Transaction History
  getTransactionHistory: async (trainerId: string, filters: {
    type?: string;
    status?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    try {
      let query = supabase
        .from('payment_transactions')
        .select(`
          *,
          booking:booking_id (
            id,
            session_date,
            session_time,
            user:user_id (
              full_name,
              email
            )
          )
        `)
        .eq('trainer_id', trainerId);

      if (filters.type) {
        query = query.eq('transaction_type', filters.type);
      }
      if (filters.status) {
        query = query.eq('payment_status', filters.status);
      }
      if (filters.from_date) {
        query = query.gte('created_at', filters.from_date);
      }
      if (filters.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 50);

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as PaymentTransaction[];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  },

  // Payout Management
  requestPayout: async (trainerId: string, payoutData: {
    amount: number;
    payment_method_id: string;
    earnings_ids: string[];
  }) => {
    try {
      // Verify earnings belong to trainer and are pending
      const { data: earnings, error: earningsError } = await supabase
        .from('trainer_earnings')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('payment_status', 'pending')
        .in('id', payoutData.earnings_ids);

      if (earningsError) throw earningsError;

      const totalAvailable = earnings?.reduce((sum, e) => sum + e.net_earnings, 0) || 0;
      if (totalAvailable < payoutData.amount) {
        throw new Error('Insufficient available earnings for payout');
      }

      // Create payout request
      const { data: payout, error: payoutError } = await supabase
        .from('trainer_payouts')
        .insert({
          trainer_id: trainerId,
          amount: payoutData.amount,
          payment_method_id: payoutData.payment_method_id,
          status: 'pending',
          earnings_ids: payoutData.earnings_ids,
        })
        .select()
        .single();

      if (payoutError) throw payoutError;

      // Update earnings status to processing
      await supabase
        .from('trainer_earnings')
        .update({ payment_status: 'processing' })
        .in('id', payoutData.earnings_ids);

      return payout;
    } catch (error) {
      console.error('Error requesting payout:', error);
      throw error;
    }
  },

  getPayoutHistory: async (trainerId: string, filters: {
    status?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    try {
      let query = supabase
        .from('trainer_payouts')
        .select(`
          *,
          payment_method:payment_method_id (
            type,
            details
          )
        `)
        .eq('trainer_id', trainerId);

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.from_date) {
        query = query.gte('created_at', filters.from_date);
      }
      if (filters.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 50);

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching payout history:', error);
      throw error;
    }
  },

  // Booking Payment Processing
  processBookingPayment: async (bookingData: {
    user_id: string;
    trainer_id: string;
    session_date: string;
    session_time: string;
    duration_minutes: number;
    total_amount: number;
    payment_method: string;
    payment_token?: string; // Stripe token or PayPal token
  }) => {
    try {
      // 1. Create pending booking
      const { data: booking, error: bookingError } = await supabase
        .from('trainer_bookings')
        .insert({
          user_id: bookingData.user_id,
          trainer_id: bookingData.trainer_id,
          session_date: bookingData.session_date,
          session_time: bookingData.session_time,
          duration_minutes: bookingData.duration_minutes,
          total_amount: bookingData.total_amount,
          status: 'pending',
          payment_status: 'processing',
          session_type: 'personal_training',
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 2. Process payment (integrate with Stripe/PayPal)
      const paymentResult = await PaymentsAPI.processPayment({
        amount: bookingData.total_amount,
        currency: 'USD',
        payment_method: bookingData.payment_method,
        payment_token: bookingData.payment_token,
        booking_id: booking.id,
        trainer_id: bookingData.trainer_id,
      });

      if (paymentResult.success) {
        // 3. Update booking status
        await supabase
          .from('trainer_bookings')
          .update({
            status: 'confirmed',
            payment_status: 'completed',
          })
          .eq('id', booking.id);

        // 4. Create chat conversation
        const conversation = await supabase
          .from('chat_conversations')
          .insert({
            user_id: bookingData.user_id,
            trainer_id: bookingData.trainer_id,
            booking_id: booking.id,
            status: 'active',
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();

        // 5. Create trainer earnings record
        const trainerCommissionRate = 0.85; // Trainer gets 85%, platform takes 15%
        await supabase
          .from('trainer_earnings')
          .insert({
            trainer_id: bookingData.trainer_id,
            booking_id: booking.id,
            amount: bookingData.total_amount,
            commission_rate: 0.15,
            platform_fee: bookingData.total_amount * 0.15,
            net_amount: bookingData.total_amount * trainerCommissionRate,
            status: 'pending', // Will be paid out later
          });

        // 6. Send notification to trainer (implement push notifications)
        await PaymentsAPI.notifyTrainerOfNewBooking(bookingData.trainer_id, booking.id);

        return {
          success: true,
          booking_id: booking.id,
          conversation_id: conversation.data?.id,
          message: 'Booking confirmed and chat created successfully',
        };
      } else {
        // Payment failed - update booking
        await supabase
          .from('trainer_bookings')
          .update({
            status: 'cancelled',
            payment_status: 'failed',
          })
          .eq('id', booking.id);

        return {
          success: false,
          error: paymentResult.error,
          message: 'Payment processing failed',
        };
      }
    } catch (error) {
      console.error('Error processing booking payment:', error);
      throw error;
    }
  },

  // Stripe/PayPal Integration (placeholder - implement with actual payment processor)
  processPayment: async (paymentData: {
    amount: number;
    currency: string;
    payment_method: string;
    payment_token?: string;
    booking_id: string;
    trainer_id: string;
  }) => {
    try {
      // TODO: Implement actual Stripe/PayPal integration
      // This is a placeholder that simulates payment processing
      
      // For Stripe integration:
      // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: paymentData.amount * 100, // Convert to cents
      //   currency: paymentData.currency,
      //   payment_method: paymentData.payment_token,
      //   confirm: true,
      //   metadata: {
      //     booking_id: paymentData.booking_id,
      //     trainer_id: paymentData.trainer_id,
      //   },
      // });

      // Simulate successful payment for now
      const paymentTransaction = {
        id: `txn_${Date.now()}`,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: 'succeeded', // or 'failed'
        payment_method: paymentData.payment_method,
        created_at: new Date().toISOString(),
      };

      // Store transaction record
      await supabase
        .from('payment_transactions')
        .insert({
          booking_id: paymentData.booking_id,
          trainer_id: paymentData.trainer_id,
          amount: paymentData.amount,
          currency: paymentData.currency,
          payment_method: paymentData.payment_method,
          payment_status: 'completed',
          transaction_type: 'booking_payment',
          processing_fee: paymentData.amount * 0.029, // 2.9% processing fee
          net_amount: paymentData.amount * 0.971,
          metadata: paymentTransaction,
        });

      return {
        success: true,
        transaction_id: paymentTransaction.id,
        payment_data: paymentTransaction,
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Notification system for trainers
  notifyTrainerOfNewBooking: async (trainerId: string, bookingId: string) => {
    try {
      // TODO: Implement push notifications
      // This could integrate with Expo Push Notifications or Firebase
      
      // For now, create a notification record in the database
      await supabase
        .from('trainer_notifications')
        .insert({
          trainer_id: trainerId,
          type: 'new_booking',
          title: 'New Booking Request',
          message: 'You have received a new booking request from a client',
          data: { booking_id: bookingId },
          read: false,
        });

      console.log(`Notification sent to trainer ${trainerId} for booking ${bookingId}`);
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  },

  // API endpoint for Main HT App to get trainer availability
  getTrainerAvailability: async (trainerId: string, date?: string) => {
    try {
      const { data: availability, error } = await supabase
        .from('trainer_availability')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('is_available', true);

      if (error) throw error;

      // If specific date requested, filter by date
      if (date) {
        return availability?.filter(slot => slot.date === date) || [];
      }

      return availability || [];
    } catch (error) {
      console.error('Error fetching trainer availability:', error);
      throw error;
    }
  },

  // API endpoint for Main HT App to get trainer details
  getTrainerForBooking: async (trainerId: string) => {
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

      return {
        id: trainer.id,
        name: trainer.name,
        image_url: trainer.image_url,
        specialty: trainer.specialty,
        specialties: trainer.specialties,
        experience: trainer.experience,
        rating: trainer.average_rating,
        reviews: trainer.total_reviews,
        description: trainer.description,
        location: trainer.location,
        pricing: trainer.pricing,
        certifications: trainer.certifications,
        bio: trainer.bio,
      };
    } catch (error) {
      console.error('Error fetching trainer for booking:', error);
      throw error;
    }
  },

  // Export earnings data
  exportEarningsData: async (trainerId: string, format: 'csv' | 'pdf', filters: {
    from_date?: string;
    to_date?: string;
  } = {}) => {
    try {
      const earnings = await PaymentsAPI.getTrainerEarnings(trainerId, filters);
      
      if (format === 'csv') {
        const csvData = earnings.map(earning => ({
          Date: new Date(earning.created_at).toLocaleDateString(),
          'Booking ID': earning.booking_id || 'N/A',
          'Client': earning.booking?.user?.full_name || 'N/A',
          'Session Date': earning.booking?.session_date || 'N/A',
          'Gross Amount': earning.amount,
          'Commission': earning.commission_amount,
          'Net Earnings': earning.net_earnings,
          'Status': earning.payment_status,
          'Payout Date': earning.payout_date || 'Pending',
        }));

        return {
          data: csvData,
          filename: `earnings_${trainerId}_${new Date().toISOString().split('T')[0]}.csv`,
        };
      }

      // For PDF, return structured data that can be used by a PDF generator
      return {
        data: earnings,
        summary: await PaymentsAPI.getEarningsStats(trainerId),
        filename: `earnings_report_${trainerId}_${new Date().toISOString().split('T')[0]}.pdf`,
      };
    } catch (error) {
      console.error('Error exporting earnings data:', error);
      throw error;
    }
  },
}; 