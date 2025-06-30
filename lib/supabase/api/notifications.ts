import { supabase } from '../client';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: {
    new_booking: boolean;
    booking_reminder: boolean;
    booking_cancelled: boolean;
    payment_received: boolean;
    client_message: boolean;
    review_received: boolean;
    goal_achieved: boolean;
    workout_reminder: boolean;
    meal_plan_update: boolean;
  };
  push_notifications: {
    new_booking: boolean;
    booking_reminder: boolean;
    booking_cancelled: boolean;
    payment_received: boolean;
    client_message: boolean;
    review_received: boolean;
    goal_achieved: boolean;
    workout_reminder: boolean;
    meal_plan_update: boolean;
  };
  sms_notifications: {
    booking_reminder: boolean;
    booking_cancelled: boolean;
    emergency_only: boolean;
  };
  notification_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'message' | 'review' | 'goal' | 'workout' | 'meal_plan' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  data?: any;
  action_url?: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface PushNotificationSubscription {
  id: string;
  user_id: string;
  push_token: string;
  device_type: 'ios' | 'android' | 'web';
  device_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  title_template: string;
  message_template: string;
  email_subject_template?: string;
  email_body_template?: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

export class NotificationsAPI {
  /**
   * Get user's notification preferences
   */
  static async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Create default preferences if none exist
          return await this.createDefaultNotificationPreferences(userId);
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  /**
   * Create default notification preferences
   */
  static async createDefaultNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const defaultPreferences = {
        user_id: userId,
        email_notifications: {
          new_booking: true,
          booking_reminder: true,
          booking_cancelled: true,
          payment_received: true,
          client_message: true,
          review_received: true,
          goal_achieved: true,
          workout_reminder: false,
          meal_plan_update: true,
        },
        push_notifications: {
          new_booking: true,
          booking_reminder: true,
          booking_cancelled: true,
          payment_received: false,
          client_message: true,
          review_received: true,
          goal_achieved: true,
          workout_reminder: true,
          meal_plan_update: true,
        },
        sms_notifications: {
          booking_reminder: false,
          booking_cancelled: true,
          emergency_only: true,
        },
        notification_frequency: 'immediate' as const,
        quiet_hours: {
          enabled: true,
          start_time: '22:00',
          end_time: '08:00',
        },
      };

      const { data, error } = await supabase
        .from('notification_preferences')
        .insert(defaultPreferences)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating default notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .update({ ...preferences, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get user's notifications
   */
  static async getUserNotifications(
    userId: string,
    filters?: {
      read?: boolean;
      type?: string;
      priority?: string;
      limit?: number;
    }
  ): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId);

      if (filters?.read !== undefined) {
        query = query.eq('read', filters.read);
      }

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      query = query.order('created_at', { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Create notification
   */
  static async createNotification(
    notificationData: Omit<Notification, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) throw error;

      // Send push notification if user has it enabled
      await this.sendPushNotificationIfEnabled(
        notificationData.user_id,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        notificationData.data
      );

      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      return 0;
    }
  }

  /**
   * Register push notification token
   */
  static async registerPushToken(
    userId: string,
    pushToken: string,
    deviceType: 'ios' | 'android' | 'web',
    deviceId: string
  ): Promise<PushNotificationSubscription> {
    try {
      // Deactivate existing tokens for this device
      await supabase
        .from('push_notification_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('device_id', deviceId);

      // Insert new token
      const { data, error } = await supabase
        .from('push_notification_subscriptions')
        .insert({
          user_id: userId,
          push_token: pushToken,
          device_type: deviceType,
          device_id: deviceId,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error registering push token:', error);
      throw error;
    }
  }

  /**
   * Send push notification if enabled
   */
  static async sendPushNotificationIfEnabled(
    userId: string,
    notificationType: string,
    title: string,
    message: string,
    data?: any
  ): Promise<boolean> {
    try {
      // Check if user has push notifications enabled for this type
      const preferences = await this.getNotificationPreferences(userId);
      if (!preferences?.push_notifications[notificationType as keyof typeof preferences.push_notifications]) {
        return false;
      }

      // Check quiet hours
      if (preferences.quiet_hours.enabled) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const startTime = preferences.quiet_hours.start_time;
        const endTime = preferences.quiet_hours.end_time;

        if (startTime > endTime) {
          // Quiet hours span midnight
          if (currentTime >= startTime || currentTime <= endTime) {
            return false;
          }
        } else {
          // Normal quiet hours
          if (currentTime >= startTime && currentTime <= endTime) {
            return false;
          }
        }
      }

      // Get active push tokens
      const { data: subscriptions } = await supabase
        .from('push_notification_subscriptions')
        .select('push_token, device_type')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!subscriptions || subscriptions.length === 0) {
        return false;
      }

      // Send push notifications (implementation would depend on your push service)
      // This is a placeholder for the actual push notification sending logic
      console.log('Sending push notification:', {
        tokens: subscriptions.map(s => s.push_token),
        title,
        message,
        data,
      });

      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Send booking reminder notifications
   */
  static async sendBookingReminders(): Promise<void> {
    try {
      // Get bookings that need reminders (24 hours before)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];

      const { data: bookings } = await supabase
        .from('trainer_bookings')
        .select(`
          *,
          users!trainer_bookings_user_id_fkey(id, full_name),
          trainers!trainer_bookings_trainer_id_fkey(id, name, user_id)
        `)
        .eq('session_date', tomorrowDate)
        .eq('status', 'confirmed')
        .eq('reminder_sent', false);

      if (!bookings || bookings.length === 0) {
        return;
      }

      for (const booking of bookings) {
        // Send reminder to client
        await this.createNotification({
          user_id: booking.user_id,
          title: 'Session Reminder',
          message: `You have a training session with ${booking.trainers.name} tomorrow at ${booking.session_time}`,
          type: 'booking',
          priority: 'medium',
          category: 'reminder',
          data: { booking_id: booking.id },
        });

        // Send reminder to trainer
        await this.createNotification({
          user_id: booking.trainers.user_id,
          title: 'Session Reminder',
          message: `You have a training session with ${booking.users.full_name} tomorrow at ${booking.session_time}`,
          type: 'booking',
          priority: 'medium',
          category: 'reminder',
          data: { booking_id: booking.id },
        });

        // Mark reminder as sent
        await supabase
          .from('trainer_bookings')
          .update({ reminder_sent: true })
          .eq('id', booking.id);
      }
    } catch (error) {
      console.error('Error sending booking reminders:', error);
    }
  }

  /**
   * Send goal achievement notification
   */
  static async sendGoalAchievementNotification(
    clientUserId: string,
    trainerId: string,
    goalTitle: string
  ): Promise<void> {
    try {
      // Notify client
      await this.createNotification({
        user_id: clientUserId,
        title: 'Goal Achieved! 🎉',
        message: `Congratulations! You've completed your goal: ${goalTitle}`,
        type: 'goal',
        priority: 'high',
        category: 'achievement',
      });

      // Notify trainer
      const { data: client } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', clientUserId)
        .single();

      if (client) {
        await this.createNotification({
          user_id: trainerId,
          title: 'Client Achievement',
          message: `${client.full_name} has achieved their goal: ${goalTitle}`,
          type: 'goal',
          priority: 'medium',
          category: 'client_progress',
        });
      }
    } catch (error) {
      console.error('Error sending goal achievement notification:', error);
    }
  }

  /**
   * Send new message notification
   */
  static async sendNewMessageNotification(
    recipientUserId: string,
    senderName: string,
    messagePreview: string,
    conversationId: string
  ): Promise<void> {
    try {
      await this.createNotification({
        user_id: recipientUserId,
        title: `New message from ${senderName}`,
        message: messagePreview.length > 50 
          ? messagePreview.substring(0, 50) + '...' 
          : messagePreview,
        type: 'message',
        priority: 'medium',
        category: 'chat',
        action_url: `/chat/${conversationId}`,
        data: { conversation_id: conversationId },
      });
    } catch (error) {
      console.error('Error sending new message notification:', error);
    }
  }

  /**
   * Send booking status update notification
   */
  static async sendBookingStatusNotification(
    userId: string,
    bookingId: string,
    status: string,
    trainerName?: string,
    clientName?: string
  ): Promise<void> {
    try {
      let title = '';
      let message = '';

      switch (status) {
        case 'confirmed':
          title = 'Booking Confirmed';
          message = trainerName 
            ? `Your session with ${trainerName} has been confirmed`
            : `Your booking has been confirmed by ${clientName}`;
          break;
        case 'cancelled':
          title = 'Booking Cancelled';
          message = trainerName 
            ? `Your session with ${trainerName} has been cancelled`
            : `${clientName} has cancelled their booking`;
          break;
        case 'completed':
          title = 'Session Completed';
          message = 'Your training session has been completed. Please rate your experience!';
          break;
        default:
          title = 'Booking Update';
          message = `Your booking status has been updated to ${status}`;
      }

      await this.createNotification({
        user_id: userId,
        title,
        message,
        type: 'booking',
        priority: status === 'cancelled' ? 'high' : 'medium',
        category: 'status_update',
        action_url: `/bookings/${bookingId}`,
        data: { booking_id: bookingId, status },
      });
    } catch (error) {
      console.error('Error sending booking status notification:', error);
    }
  }
} 