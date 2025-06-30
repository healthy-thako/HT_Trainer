import { NavigationProp } from '@react-navigation/native';
import { NavigationHelper as EnhancedNavigationHelper } from './navigation/NavigationHelper';
import { Routes } from './navigation/routes';
import { NavigationService } from './navigation/NavigationService';

// Define the navigation param list for the app
export type RootStackParamList = {
  '(tabs)': { screen?: string };
  'auth': undefined;
  'analytics': undefined;
  'earnings': undefined;
  'clients': undefined;
  'availability': undefined;
  'nutrition': undefined;
  'chat/[id]': { id: string };
  'bookings/[id]': { id: string };
};

export type AppNavigationProp = NavigationProp<RootStackParamList>;

// Enhanced NavigationHelper that extends the base functionality
export class NavigationHelper extends EnhancedNavigationHelper {
  // Additional app-specific navigation methods can be added here
  
  // Nutrition navigation (app-specific)
  static navigateToNutrition() {
    this.safeNavigate('nutrition');
  }

  // Enhanced cross-feature navigation with better error handling
  static async navigateToChatFromBookingEnhanced(bookingId: string) {
    return NavigationService.navigateToChatFromBooking(bookingId);
  }

  static async navigateToBookingFromChatEnhanced(conversationId: string) {
    return NavigationService.navigateToBookingFromChat(conversationId);
  }

  // Smart navigation with context awareness
  static navigateWithContext(context: {
    to: string;
    data?: any;
    fallback?: string;
  }) {
    return NavigationService.smartNavigate({
      from: this.getCurrentRoute() || 'unknown',
      ...context
    });
  }

  // Batch operations
  static async performBatchNavigation(operations: Array<() => Promise<void>>) {
    return NavigationService.performBatchNavigation(operations);
  }

  // Navigation with loading states
  static async navigateWithLoading<T>(
    navigationFn: () => void,
    dataLoader: () => Promise<T>,
    onSuccess?: (data: T) => void,
    onError?: (error: any) => void
  ) {
    return NavigationService.navigateWithLoading(navigationFn, dataLoader, onSuccess, onError);
  }

  // Authentication-aware navigation
  static async navigateWithAuth(navigationFn: () => void) {
    return NavigationService.navigateWithAuth(navigationFn);
  }

  // Role-based navigation
  static async navigateWithRoleCheck(
    navigationFn: () => void,
    requiredRole: 'trainer' | 'admin' = 'trainer'
  ) {
    return NavigationService.navigateWithRoleCheck(navigationFn, requiredRole);
  }

  // Logout handling
  static async handleLogout() {
    return NavigationService.handleLogout();
  }

  // Reset to home
  static resetToHome() {
    return NavigationService.resetToHome();
  }
}

// Export the enhanced navigation helper as default
export default NavigationHelper;

// Export additional utilities
export { NavigationService };
export { Routes }; 