import { router } from 'expo-router';

export class NavigationHelper {
  private static navigate(route: string, params?: any) {
    if (params) {
      router.push({ pathname: route as any, params });
    } else {
      router.push(route as any);
    }
  }

  // Tab navigation
  static navigateToDashboard() {
    this.navigate('/(tabs)/dashboard');
  }

  static navigateToBookings() {
    this.navigate('/(tabs)/bookings');
  }

  static navigateToChat() {
    this.navigate('/(tabs)/chat');
  }

  static navigateToProfile() {
    this.navigate('/(tabs)/profile');
  }

  // Feature navigation
  static navigateToAnalytics() {
    this.navigate('/analytics');
  }

  static navigateToEarnings() {
    this.navigate('/earnings');
  }

  static navigateToClients() {
    this.navigate('/clients');
  }

  static navigateToAvailability() {
    this.navigate('/availability');
  }

  static navigateToNutrition() {
    this.navigate('/nutrition');
  }

  // Auth navigation
  static navigateToAuth() {
    this.navigate('/auth');
  }

  static resetToAuth() {
    router.replace('/auth');
  }

  // Detail navigation
  static navigateToBookingDetail(bookingId: string) {
    this.navigate('/bookings/[id]', { id: bookingId });
  }

  static navigateToChatDetail(conversationId: string) {
    this.navigate('/chat/[id]', { id: conversationId });
  }

  // Cross-feature navigation
  static navigateToChatFromBooking(bookingId: string) {
    // Implementation would get conversation ID from booking
    this.navigate('/chat');
  }

  static navigateToBookingFromChat(conversationId: string) {
    // Implementation would get booking ID from conversation
    this.navigate('/bookings');
  }

  // Onboarding navigation
  static navigateToTrainerSetup() {
    this.navigate('/onboarding/trainer-setup');
  }

  // Client management navigation
  static navigateToAddClient() {
    this.navigate('/clients/add-client');
  }

  static navigateToClientDetail(clientId: string) {
    this.navigate('/clients/[id]', { id: clientId });
  }

  static navigateToClientProgress(clientId: string) {
    this.navigate('/clients/[id]/progress', { id: clientId });
  }

  // Workout navigation
  static navigateToCreateWorkoutPlan(clientId?: string) {
    this.navigate('/workouts/create-plan', clientId ? { clientId } : undefined);
  }

  static navigateToWorkoutPlan(planId: string) {
    this.navigate('/workouts/[id]', { id: planId });
  }

  // Generic navigation
  static goBack() {
    router.back();
  }

  static canGoBack(): boolean {
    return router.canGoBack();
  }
} 