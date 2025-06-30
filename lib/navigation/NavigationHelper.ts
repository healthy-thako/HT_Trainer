import { Alert } from 'react-native';
import { Routes, parseDeepLink } from './routes';
import { chatApi, navigationApi } from '../supabase/api';

// Navigation types
interface AppNavigationProp {
  navigate: (route: string, params?: any) => void;
  reset: (config: { index: number; routes: Array<{ name: string; params?: any }> }) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  getState?: () => any;
}

/**
 * Enhanced NavigationHelper with API integration and error handling
 */
export class NavigationHelper {
  private static navigation: AppNavigationProp | null = null;
  private static navigationHistory: string[] = [];

  static setNavigation(nav: AppNavigationProp) {
    this.navigation = nav;
  }

  static getNavigation(): AppNavigationProp | null {
    return this.navigation;
  }

  // Tab navigation
  static navigateToDashboard() {
    this.safeNavigate(Routes.TABS, { screen: Routes.DASHBOARD });
    this.addToHistory(Routes.DASHBOARD);
  }

  static navigateToBookings() {
    this.safeNavigate(Routes.TABS, { screen: Routes.BOOKINGS });
    this.addToHistory(Routes.BOOKINGS);
  }

  static navigateToChat() {
    this.safeNavigate(Routes.TABS, { screen: Routes.CHAT });
    this.addToHistory(Routes.CHAT);
  }

  static navigateToProfile() {
    this.safeNavigate(Routes.TABS, { screen: Routes.PROFILE });
    this.addToHistory(Routes.PROFILE);
  }

  static navigateToAdmin() {
    this.safeNavigate(Routes.TABS, { screen: Routes.ADMIN });
    this.addToHistory(Routes.ADMIN);
  }

  // Feature navigation
  static navigateToAnalytics() {
    this.safeNavigate(Routes.ANALYTICS);
    this.addToHistory(Routes.ANALYTICS);
  }

  static navigateToEarnings() {
    this.safeNavigate(Routes.EARNINGS);
    this.addToHistory(Routes.EARNINGS);
  }

  static navigateToClients() {
    this.safeNavigate(Routes.CLIENTS);
    this.addToHistory(Routes.CLIENTS);
  }

  static navigateToAvailability() {
    this.safeNavigate(Routes.AVAILABILITY);
    this.addToHistory(Routes.AVAILABILITY);
  }

  static navigateToNutrition() {
    this.safeNavigate('nutrition');
    this.addToHistory('nutrition');
  }

  // Detail navigation
  static navigateToBookingDetail(bookingId: string) {
    this.safeNavigate(Routes.BOOKING_DETAIL, { id: bookingId });
    this.addToHistory(`${Routes.BOOKING_DETAIL}/${bookingId}`);
  }

  static navigateToChatDetail(conversationId: string) {
    this.safeNavigate(Routes.CHAT_DETAIL, { id: conversationId });
    this.addToHistory(`${Routes.CHAT_DETAIL}/${conversationId}`);
  }

  // Cross-feature navigation with API integration
  static async navigateToChatFromBooking(bookingId: string) {
    try {
      const conversationId = await navigationApi.getConversationFromBooking(bookingId);
      
      if (conversationId) {
        this.navigateToChatDetail(conversationId);
      } else {
        Alert.alert('Info', 'No conversation found for this booking');
      }
    } catch (error) {
      console.error('Error navigating to chat from booking:', error);
      Alert.alert('Error', 'Failed to open chat');
    }
  }

  static async navigateToBookingFromChat(conversationId: string) {
    try {
      const bookingId = await navigationApi.getBookingFromConversation(conversationId);
      
      if (bookingId) {
        this.navigateToBookingDetail(bookingId);
      } else {
        Alert.alert('Info', 'No booking associated with this conversation');
      }
    } catch (error) {
      console.error('Error navigating to booking from chat:', error);
      Alert.alert('Error', 'Failed to open booking details');
    }
  }

  static async getOrCreateConversationForClient(clientId: string) {
    try {
      const conversation = await chatApi.getOrCreateConversationForClient(clientId);
      
      if (conversation) {
        this.navigateToChatDetail(conversation.id);
        return conversation;
      } else {
        Alert.alert('Error', 'Unable to create conversation with client');
        return null;
      }
    } catch (error) {
      console.error('Error creating conversation for client:', error);
      Alert.alert('Error', 'Failed to open chat with client');
      return null;
    }
  }

  // Auth navigation
  static navigateToAuth() {
    this.safeNavigate(Routes.AUTH);
    this.addToHistory(Routes.AUTH);
  }

  static resetToTabs() {
    if (this.navigation?.reset) {
      this.navigation.reset({
        index: 0,
        routes: [{ name: Routes.TABS }],
      });
      this.clearHistory();
      this.addToHistory(Routes.TABS);
    }
  }

  static resetToAuth() {
    if (this.navigation?.reset) {
      this.navigation.reset({
        index: 0,
        routes: [{ name: Routes.AUTH }],
      });
      this.clearHistory();
      this.addToHistory(Routes.AUTH);
    }
  }

  // Utility navigation methods
  static goBack() {
    if (this.navigation?.canGoBack()) {
      this.navigation.goBack();
      this.removeFromHistory();
    } else {
      this.navigateToDashboard();
    }
  }

  static canGoBack(): boolean {
    return this.navigation?.canGoBack() || false;
  }

  // Enhanced deep linking with route configuration
  static handleDeepLink(url: string) {
    try {
      const parsedLink = parseDeepLink(url);
      
      if (parsedLink) {
        if (parsedLink.params) {
          this.safeNavigate(parsedLink.route, parsedLink.params);
        } else {
          // Handle tab navigation
          switch (parsedLink.route) {
            case Routes.DASHBOARD:
              this.navigateToDashboard();
              break;
            case Routes.BOOKINGS:
              this.navigateToBookings();
              break;
            case Routes.CHAT:
              this.navigateToChat();
              break;
            case Routes.PROFILE:
              this.navigateToProfile();
              break;
            case Routes.ANALYTICS:
              this.navigateToAnalytics();
              break;
            case Routes.EARNINGS:
              this.navigateToEarnings();
              break;
            case Routes.CLIENTS:
              this.navigateToClients();
              break;
            case Routes.AVAILABILITY:
              this.navigateToAvailability();
              break;
            default:
              this.navigateToDashboard();
          }
        }
      } else {
        // Fallback to dashboard for unrecognized links
        this.navigateToDashboard();
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
      this.navigateToDashboard();
    }
  }

  // Navigation state helpers
  static getCurrentRoute(): string | undefined {
    if (!this.navigation) return undefined;
    
    try {
      const state = this.navigation.getState?.();
      return state?.routes?.[state?.index || 0]?.name;
    } catch (error) {
      console.error('Error getting current route:', error);
      return undefined;
    }
  }

  static isOnTabScreen(): boolean {
    const currentRoute = this.getCurrentRoute();
    return currentRoute === Routes.TABS;
  }

  // Batch navigation operations
  static navigateToTabScreen(tabName: string, params?: any) {
    this.safeNavigate(Routes.TABS, { screen: tabName, ...params });
    this.addToHistory(tabName);
  }

  // Navigation with error handling
  static safeNavigate(routeName: string, params?: any): boolean {
    try {
      if (!this.navigation) {
        console.warn('Navigation not ready');
        return false;
      }
      
      this.navigation.navigate(routeName, params);
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Failed to navigate. Please try again.');
      return false;
    }
  }

  // Navigation history management
  private static addToHistory(route: string) {
    this.navigationHistory.push(route);
    // Keep only last 10 routes
    if (this.navigationHistory.length > 10) {
      this.navigationHistory.shift();
    }
  }

  private static removeFromHistory() {
    this.navigationHistory.pop();
  }

  private static clearHistory() {
    this.navigationHistory = [];
  }

  static getNavigationHistory(): string[] {
    return [...this.navigationHistory];
  }

  // Smart navigation based on context
  static smartNavigate(context: {
    from?: string;
    to: string;
    data?: any;
    fallback?: string;
  }) {
    const { to, data, fallback } = context;

    try {
      switch (to) {
        case Routes.CHAT_DETAIL:
          if (data?.conversationId) {
            this.navigateToChatDetail(data.conversationId);
          } else if (data?.clientId) {
            this.getOrCreateConversationForClient(data.clientId);
          } else {
            this.navigateToChat();
          }
          break;

        case Routes.BOOKING_DETAIL:
          if (data?.bookingId) {
            this.navigateToBookingDetail(data.bookingId);
          } else {
            this.navigateToBookings();
          }
          break;

        default:
          this.safeNavigate(to, data);
      }
    } catch (error) {
      console.error('Smart navigation failed:', error);
      if (fallback) {
        this.safeNavigate(fallback);
      } else {
        this.navigateToDashboard();
      }
    }
  }

  // Navigation guards
  static canNavigateTo(route: string): boolean {
    // Add any navigation guards here
    // For example, check authentication, permissions, etc.
    return true;
  }

  // Navigation analytics
  static trackNavigation(route: string, params?: any) {
    // Track navigation events for analytics
    console.log('Navigation tracked:', { route, params, timestamp: new Date().toISOString() });
  }
}

export default NavigationHelper; 