export const Routes = {
  // Auth routes
  AUTH: 'auth' as const,
  
  // Tab routes
  TABS: '(tabs)' as const,
  DASHBOARD: 'dashboard' as const,
  BOOKINGS: 'bookings' as const,
  CHAT: 'chat' as const,
  PROFILE: 'profile' as const,
  ADMIN: 'admin' as const,
  
  // Feature routes
  ANALYTICS: 'analytics' as const,
  EARNINGS: 'earnings' as const,
  CLIENTS: 'clients' as const,
  AVAILABILITY: 'availability' as const,
  
  // Detail routes
  CHAT_DETAIL: 'chat/[id]' as const,
  BOOKING_DETAIL: 'bookings/[id]' as const,
} as const;

export type RouteNames = typeof Routes[keyof typeof Routes];

// Route parameter types
export interface RouteParams {
  [Routes.AUTH]: undefined;
  [Routes.TABS]: { screen?: string };
  [Routes.ANALYTICS]: undefined;
  [Routes.EARNINGS]: undefined;
  [Routes.CLIENTS]: undefined;
  [Routes.AVAILABILITY]: undefined;
  [Routes.CHAT_DETAIL]: { id: string };
  [Routes.BOOKING_DETAIL]: { id: string };
}

// Deep linking URL patterns
export const DeepLinkPatterns = {
  BOOKING: /\/booking\/([a-zA-Z0-9-]+)$/,
  CHAT: /\/chat\/([a-zA-Z0-9-]+)$/,
  DASHBOARD: /\/dashboard$/,
  BOOKINGS: /\/bookings$/,
  CHAT_LIST: /\/chat$/,
  PROFILE: /\/profile$/,
  ANALYTICS: /\/analytics$/,
  EARNINGS: /\/earnings$/,
  CLIENTS: /\/clients$/,
  AVAILABILITY: /\/availability$/,
} as const;

// Navigation configuration
export const NavigationConfig = {
  // Tab screen names for bottom navigation
  TAB_SCREENS: [
    Routes.DASHBOARD,
    Routes.BOOKINGS,
    Routes.CHAT,
    Routes.PROFILE,
    Routes.ADMIN,
  ] as const,
  
  // Feature screens accessible from main navigation
  FEATURE_SCREENS: [
    Routes.ANALYTICS,
    Routes.EARNINGS,
    Routes.CLIENTS,
    Routes.AVAILABILITY,
  ] as const,
  
  // Screens that require authentication
  PROTECTED_SCREENS: [
    Routes.TABS,
    Routes.ANALYTICS,
    Routes.EARNINGS,
    Routes.CLIENTS,
    Routes.AVAILABILITY,
    Routes.CHAT_DETAIL,
    Routes.BOOKING_DETAIL,
  ] as const,
  
  // Screens that require trainer role
  TRAINER_ONLY_SCREENS: [
    Routes.TABS,
    Routes.ANALYTICS,
    Routes.EARNINGS,
    Routes.CLIENTS,
    Routes.AVAILABILITY,
    Routes.CHAT_DETAIL,
    Routes.BOOKING_DETAIL,
  ] as const,
  
  // Screens that require admin role
  ADMIN_ONLY_SCREENS: [
    Routes.ADMIN,
  ] as const,
} as const;

// Navigation helpers
export function isTabScreen(routeName: string): boolean {
  return NavigationConfig.TAB_SCREENS.includes(routeName as any);
}

export function isProtectedScreen(routeName: string): boolean {
  return NavigationConfig.PROTECTED_SCREENS.includes(routeName as any);
}

export function isTrainerOnlyScreen(routeName: string): boolean {
  return NavigationConfig.TRAINER_ONLY_SCREENS.includes(routeName as any);
}

export function isAdminOnlyScreen(routeName: string): boolean {
  return NavigationConfig.ADMIN_ONLY_SCREENS.includes(routeName as any);
}

// Route generation helpers
export function generateBookingDetailRoute(bookingId: string): string {
  return Routes.BOOKING_DETAIL.replace('[id]', bookingId);
}

export function generateChatDetailRoute(conversationId: string): string {
  return Routes.CHAT_DETAIL.replace('[id]', conversationId);
}

// Deep link parsing
export function parseDeepLink(url: string): { route: string; params?: any } | null {
  try {
    // Remove protocol and domain if present
    const path = url.replace(/^https?:\/\/[^\/]+/, '');
    
    // Check against patterns
    for (const [name, pattern] of Object.entries(DeepLinkPatterns)) {
      const match = path.match(pattern);
      if (match) {
        switch (name) {
          case 'BOOKING':
            return {
              route: Routes.BOOKING_DETAIL,
              params: { id: match[1] },
            };
          case 'CHAT':
            return {
              route: Routes.CHAT_DETAIL,
              params: { id: match[1] },
            };
          case 'DASHBOARD':
            return { route: Routes.DASHBOARD };
          case 'BOOKINGS':
            return { route: Routes.BOOKINGS };
          case 'CHAT_LIST':
            return { route: Routes.CHAT };
          case 'PROFILE':
            return { route: Routes.PROFILE };
          case 'ANALYTICS':
            return { route: Routes.ANALYTICS };
          case 'EARNINGS':
            return { route: Routes.EARNINGS };
          case 'CLIENTS':
            return { route: Routes.CLIENTS };
          case 'AVAILABILITY':
            return { route: Routes.AVAILABILITY };
          default:
            return null;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return null;
  }
} 