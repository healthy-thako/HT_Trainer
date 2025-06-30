import { Alert } from 'react-native';
import { NavigationHelper } from './NavigationHelper';
import { Routes } from './routes';
import { ApiEndpoints } from './apiEndpoints';
import { authApi, chatApi, bookingsApi, navigationApi } from '../supabase/api';

/**
 * NavigationService - Handles complex navigation flows with API integration
 */
export class NavigationService {
  /**
   * Navigate to booking detail with data preloading
   */
  static async navigateToBookingWithData(bookingId: string) {
    try {
      // Show loading state
      NavigationHelper.navigateToBookingDetail(bookingId);
      
      // Preload booking data in background
      const booking = await bookingsApi.getBookingById(bookingId);
      
      if (!booking) {
        Alert.alert('Error', 'Booking not found');
        NavigationHelper.goBack();
        return;
      }
      
      return booking;
    } catch (error) {
      console.error('Error navigating to booking:', error);
      Alert.alert('Error', 'Failed to load booking details');
      NavigationHelper.goBack();
    }
  }

  /**
   * Navigate to chat with conversation creation if needed
   */
  static async navigateToChatWithClient(clientId: string) {
    try {
      // Try to find existing conversation
      const conversation = await chatApi.getOrCreateConversationForClient(clientId);
      
      if (conversation) {
        NavigationHelper.navigateToChatDetail(conversation.id);
        return conversation;
      } else {
        Alert.alert('Error', 'Unable to start conversation with client');
      }
    } catch (error) {
      console.error('Error navigating to chat:', error);
      Alert.alert('Error', 'Failed to open chat');
    }
  }

  /**
   * Navigate from booking to related chat
   */
  static async navigateToChatFromBooking(bookingId: string) {
    try {
      const conversationId = await navigationApi.getConversationFromBooking(bookingId);
      
      if (conversationId) {
        NavigationHelper.navigateToChatDetail(conversationId);
      } else {
        // Create new conversation for this booking
        const booking = await bookingsApi.getBookingById(bookingId);
        if (booking) {
          const conversation = await chatApi.createConversation(
            bookingId,
            booking.user_id,
            booking.trainer_id
          );
          NavigationHelper.navigateToChatDetail(conversation.id);
        } else {
          Alert.alert('Error', 'Unable to create conversation for this booking');
        }
      }
    } catch (error) {
      console.error('Error navigating to chat from booking:', error);
      Alert.alert('Error', 'Failed to open chat');
    }
  }

  /**
   * Navigate from chat to related booking
   */
  static async navigateToBookingFromChat(conversationId: string) {
    try {
      const bookingId = await navigationApi.getBookingFromConversation(conversationId);
      
      if (bookingId) {
        NavigationHelper.navigateToBookingDetail(bookingId);
      } else {
        Alert.alert('Info', 'No booking associated with this conversation');
      }
    } catch (error) {
      console.error('Error navigating to booking from chat:', error);
      Alert.alert('Error', 'Failed to open booking details');
    }
  }

  /**
   * Navigate to analytics with specific filter
   */
  static navigateToAnalyticsWithFilter(filter: {
    timeRange?: string;
    clientId?: string;
    metric?: string;
  }) {
    NavigationHelper.navigateToAnalytics();
    // Store filter in navigation state or context
    // This would be handled by the analytics screen
  }

  /**
   * Navigate to earnings with specific period
   */
  static navigateToEarningsWithPeriod(period: 'week' | 'month' | 'year') {
    NavigationHelper.navigateToEarnings();
    // Store period preference
  }

  /**
   * Navigate to client detail with preloaded data
   */
  static async navigateToClientDetail(clientId: string) {
    try {
      NavigationHelper.navigateToClients();
      // The clients screen should handle showing detail for specific client
      // This could be enhanced with a dedicated client detail screen
    } catch (error) {
      console.error('Error navigating to client detail:', error);
      Alert.alert('Error', 'Failed to load client details');
    }
  }

  /**
   * Handle deep link navigation with authentication check
   */
  static async handleDeepLink(url: string) {
    try {
      // Check if user is authenticated
      const user = await authApi.getCurrentUser();
      
      if (!user) {
        // Store deep link for after authentication
        // This would be handled by auth context
        NavigationHelper.navigateToAuth();
        return;
      }

      // Handle authenticated deep link
      NavigationHelper.handleDeepLink(url);
    } catch (error) {
      console.error('Error handling deep link:', error);
      NavigationHelper.navigateToDashboard();
    }
  }

  /**
   * Navigate with authentication check
   */
  static async navigateWithAuth(navigationFn: () => void) {
    try {
      const user = await authApi.getCurrentUser();
      
      if (!user) {
        NavigationHelper.navigateToAuth();
        return;
      }

      navigationFn();
    } catch (error) {
      console.error('Authentication check failed:', error);
      NavigationHelper.navigateToAuth();
    }
  }

  /**
   * Navigate to feature with role check
   */
  static async navigateWithRoleCheck(
    navigationFn: () => void,
    requiredRole: 'trainer' | 'admin' = 'trainer'
  ) {
    try {
      const user = await authApi.getCurrentUser();
      
      if (!user) {
        NavigationHelper.navigateToAuth();
        return;
      }

      // Check user role (this would depend on your user structure)
      // For now, assuming all authenticated users are trainers
      navigationFn();
    } catch (error) {
      console.error('Role check failed:', error);
      Alert.alert('Access Denied', 'You do not have permission to access this feature');
    }
  }

  /**
   * Batch navigation operations
   */
  static async performBatchNavigation(operations: Array<() => Promise<void>>) {
    try {
      await Promise.all(operations);
    } catch (error) {
      console.error('Batch navigation failed:', error);
      Alert.alert('Error', 'Some navigation operations failed');
    }
  }

  /**
   * Navigate with loading state
   */
  static async navigateWithLoading<T>(
    navigationFn: () => void,
    dataLoader: () => Promise<T>,
    onSuccess?: (data: T) => void,
    onError?: (error: any) => void
  ) {
    try {
      navigationFn();
      const data = await dataLoader();
      onSuccess?.(data);
      return data;
    } catch (error) {
      console.error('Navigation with loading failed:', error);
      onError?.(error);
      NavigationHelper.goBack();
    }
  }

  /**
   * Smart navigation based on context
   */
  static smartNavigate(context: {
    from: string;
    to: string;
    data?: any;
  }) {
    const { from, to, data } = context;

    switch (to) {
      case Routes.CHAT_DETAIL:
        if (data?.clientId) {
          this.navigateToChatWithClient(data.clientId);
        } else if (data?.conversationId) {
          NavigationHelper.navigateToChatDetail(data.conversationId);
        }
        break;

      case Routes.BOOKING_DETAIL:
        if (data?.bookingId) {
          this.navigateToBookingWithData(data.bookingId);
        }
        break;

      case Routes.ANALYTICS:
        this.navigateToAnalyticsWithFilter(data?.filter || {});
        break;

      case Routes.EARNINGS:
        this.navigateToEarningsWithPeriod(data?.period || 'month');
        break;

      default:
        NavigationHelper.safeNavigate(to, data);
    }
  }

  /**
   * Navigation history management
   */
  static getNavigationHistory(): string[] {
    // This would be implemented with a navigation state tracker
    return [];
  }

  /**
   * Clear navigation stack and reset to dashboard
   */
  static resetToHome() {
    NavigationHelper.resetToTabs();
    NavigationHelper.navigateToDashboard();
  }

  /**
   * Handle logout navigation
   */
  static async handleLogout() {
    try {
      await authApi.signOut();
      NavigationHelper.resetToAuth();
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  }
} 