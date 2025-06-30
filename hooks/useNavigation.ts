import { useCallback } from 'react';
import { Alert } from 'react-native';
import { NavigationHelper } from '../lib/navigation/helpers';
import { useNavigationContext } from '../context/NavigationContext';

export function useAppNavigation() {
  const { isReady } = useNavigationContext();

  const navigateWithCheck = useCallback((navigationFn: () => void | Promise<void>) => {
    if (!isReady) {
      console.warn('Navigation not ready yet');
      return;
    }
    
    try {
      const result = navigationFn();
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error('Navigation error:', error);
          Alert.alert('Navigation Error', 'Failed to navigate. Please try again.');
        });
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Failed to navigate. Please try again.');
    }
  }, [isReady]);

  // Tab navigation
  const navigateToDashboard = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.navigateToDashboard());
  }, [navigateWithCheck]);

  const navigateToBookings = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.navigateToBookings());
  }, [navigateWithCheck]);

  const navigateToChat = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.navigateToChat());
  }, [navigateWithCheck]);

  const navigateToProfile = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.navigateToProfile());
  }, [navigateWithCheck]);

  const navigateToAdmin = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.navigateToAdmin());
  }, [navigateWithCheck]);

  // Feature navigation
  const navigateToAnalytics = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.navigateToAnalytics());
  }, [navigateWithCheck]);

  const navigateToEarnings = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.navigateToEarnings());
  }, [navigateWithCheck]);

  const navigateToClients = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.navigateToClients());
  }, [navigateWithCheck]);

  const navigateToAvailability = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.navigateToAvailability());
  }, [navigateWithCheck]);

  const navigateToNutrition = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.navigateToNutrition());
  }, [navigateWithCheck]);

  // Detail navigation
  const navigateToBookingDetail = useCallback((bookingId: string) => {
    navigateWithCheck(() => NavigationHelper.navigateToBookingDetail(bookingId));
  }, [navigateWithCheck]);

  const navigateToChatDetail = useCallback((conversationId: string) => {
    navigateWithCheck(() => NavigationHelper.navigateToChatDetail(conversationId));
  }, [navigateWithCheck]);

  // Cross-feature navigation
  const navigateToChatFromBooking = useCallback((bookingId: string) => {
    navigateWithCheck(() => NavigationHelper.navigateToChatFromBooking(bookingId));
  }, [navigateWithCheck]);

  const navigateToBookingFromChat = useCallback((conversationId: string) => {
    navigateWithCheck(() => NavigationHelper.navigateToBookingFromChat(conversationId));
  }, [navigateWithCheck]);

  // Client management navigation
  const getOrCreateConversationForClient = useCallback(async (clientId: string) => {
    if (!isReady) {
      console.warn('Navigation not ready yet');
      return null;
    }
    
    try {
      return await NavigationHelper.getOrCreateConversationForClient(clientId);
    } catch (error) {
      console.error('Error creating conversation for client:', error);
      Alert.alert('Error', 'Failed to open chat with client');
      return null;
    }
  }, [isReady]);

  // Auth navigation
  const navigateToAuth = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.navigateToAuth());
  }, [navigateWithCheck]);

  const resetToTabs = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.resetToTabs());
  }, [navigateWithCheck]);

  const resetToAuth = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.resetToAuth());
  }, [navigateWithCheck]);

  // Utility methods
  const goBack = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.goBack());
  }, [navigateWithCheck]);

  const canGoBack = useCallback(() => {
    return NavigationHelper.canGoBack();
  }, []);

  // New navigation methods
  const navigateToTrainerSetup = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.navigateToTrainerSetup());
  }, [navigateWithCheck]);

  const navigateToAddClient = useCallback(() => {
    navigateWithCheck(() => NavigationHelper.navigateToAddClient());
  }, [navigateWithCheck]);

  const navigateToClientDetail = useCallback((clientId: string) => {
    navigateWithCheck(() => NavigationHelper.navigateToClientDetail(clientId));
  }, [navigateWithCheck]);

  const navigateToCreateWorkoutPlan = useCallback((clientId?: string) => {
    navigateWithCheck(() => NavigationHelper.navigateToCreateWorkoutPlan(clientId));
  }, [navigateWithCheck]);

  const navigateToWorkoutPlan = useCallback((planId: string) => {
    navigateWithCheck(() => NavigationHelper.navigateToWorkoutPlan(planId));
  }, [navigateWithCheck]);

  // Generic navigation for new screens
  const navigate = useCallback((route: string, params?: any) => {
    navigateWithCheck(() => {
      if (params) {
        NavigationHelper.navigate(route, params);
      } else {
        NavigationHelper.navigate(route);
      }
    });
  }, [navigateWithCheck]);

  return {
    // Navigation state
    isReady,
    
    // Tab navigation
    navigateToDashboard,
    navigateToBookings,
    navigateToChat,
    navigateToProfile,
    navigateToAdmin,
    
    // Feature navigation
    navigateToAnalytics,
    navigateToEarnings,
    navigateToClients,
    navigateToAvailability,
    navigateToNutrition,
    
    // Detail navigation
    navigateToBookingDetail,
    navigateToChatDetail,
    
    // Cross-feature navigation
    navigateToChatFromBooking,
    navigateToBookingFromChat,
    getOrCreateConversationForClient,
    
    // Auth navigation
    navigateToAuth,
    resetToTabs,
    resetToAuth,
    
    // New navigation methods
    navigateToTrainerSetup,
    navigateToAddClient,
    navigateToClientDetail,
    navigateToCreateWorkoutPlan,
    navigateToWorkoutPlan,
    navigate,
    
    // Utility
    goBack,
    canGoBack,
  };
} 