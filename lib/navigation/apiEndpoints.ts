/**
 * API Endpoints Configuration
 * Maps navigation routes to their corresponding API endpoints and methods
 */

export const ApiEndpoints = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },

  // Trainer endpoints
  TRAINER: {
    PROFILE: '/api/trainer/profile',
    STATS: '/api/trainer/stats',
    UPDATE: '/api/trainer/update',
    AVAILABILITY: '/api/trainer/availability',
    SETTINGS: '/api/trainer/settings',
  },

  // Booking endpoints
  BOOKINGS: {
    LIST: '/api/bookings',
    DETAIL: (id: string) => `/api/bookings/${id}`,
    CREATE: '/api/bookings',
    UPDATE: (id: string) => `/api/bookings/${id}`,
    CANCEL: (id: string) => `/api/bookings/${id}/cancel`,
    CONFIRM: (id: string) => `/api/bookings/${id}/confirm`,
    RESCHEDULE: (id: string) => `/api/bookings/${id}/reschedule`,
  },

  // Chat endpoints
  CHAT: {
    CONVERSATIONS: '/api/chat/conversations',
    CONVERSATION_DETAIL: (id: string) => `/api/chat/conversations/${id}`,
    MESSAGES: (conversationId: string) => `/api/chat/conversations/${conversationId}/messages`,
    SEND_MESSAGE: '/api/chat/messages',
    MARK_READ: (conversationId: string) => `/api/chat/conversations/${conversationId}/read`,
    CREATE_CONVERSATION: '/api/chat/conversations',
  },

  // Client management endpoints
  CLIENTS: {
    LIST: '/api/clients',
    DETAIL: (id: string) => `/api/clients/${id}`,
    ADD: '/api/clients',
    UPDATE: (id: string) => `/api/clients/${id}`,
    PROGRESS: (id: string) => `/api/clients/${id}/progress`,
    GOALS: (id: string) => `/api/clients/${id}/goals`,
    NOTES: (id: string) => `/api/clients/${id}/notes`,
  },

  // Analytics endpoints
  ANALYTICS: {
    DASHBOARD: '/api/analytics/dashboard',
    EARNINGS: '/api/analytics/earnings',
    PERFORMANCE: '/api/analytics/performance',
    CLIENTS: '/api/analytics/clients',
    BOOKINGS: '/api/analytics/bookings',
    EXPORT: '/api/analytics/export',
  },

  // Earnings endpoints
  EARNINGS: {
    SUMMARY: '/api/earnings/summary',
    TRANSACTIONS: '/api/earnings/transactions',
    PAYOUTS: '/api/earnings/payouts',
    REQUEST_PAYOUT: '/api/earnings/payout',
    PAYMENT_METHODS: '/api/earnings/payment-methods',
    TAX_DOCUMENTS: '/api/earnings/tax-documents',
  },

  // Availability endpoints
  AVAILABILITY: {
    GET: '/api/availability',
    UPDATE: '/api/availability',
    EXCEPTIONS: '/api/availability/exceptions',
    TIME_SLOTS: (date: string) => `/api/availability/slots?date=${date}`,
  },

  // Nutrition endpoints
  NUTRITION: {
    GOALS: '/api/nutrition/goals',
    MEAL_LOGS: '/api/nutrition/meals',
    WATER_INTAKE: '/api/nutrition/water',
    FOOD_DATABASE: '/api/nutrition/foods',
    MEAL_PLANS: '/api/nutrition/meal-plans',
    DAILY_SUMMARY: (date: string) => `/api/nutrition/summary?date=${date}`,
  },

  // Workout endpoints
  WORKOUTS: {
    PLANS: '/api/workouts/plans',
    PLAN_DETAIL: (id: string) => `/api/workouts/plans/${id}`,
    SESSIONS: '/api/workouts/sessions',
    SESSION_DETAIL: (id: string) => `/api/workouts/sessions/${id}`,
    EXERCISES: '/api/workouts/exercises',
    EXERCISE_LOGS: '/api/workouts/exercise-logs',
    TEMPLATES: '/api/workouts/templates',
  },

  // Notification endpoints
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    MARK_READ: (id: string) => `/api/notifications/${id}/read`,
    PREFERENCES: '/api/notifications/preferences',
    PUSH_TOKEN: '/api/notifications/push-token',
  },

  // Admin endpoints
  ADMIN: {
    DASHBOARD: '/api/admin/dashboard',
    USERS: '/api/admin/users',
    TRAINERS: '/api/admin/trainers',
    REPORTS: '/api/admin/reports',
    SETTINGS: '/api/admin/settings',
  },
} as const;

/**
 * HTTP Methods for API endpoints
 */
export const ApiMethods = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

/**
 * API endpoint configurations with methods and authentication requirements
 */
export const ApiConfig = {
  // Authentication endpoints
  [ApiEndpoints.AUTH.LOGIN]: { method: ApiMethods.POST, requiresAuth: false },
  [ApiEndpoints.AUTH.LOGOUT]: { method: ApiMethods.POST, requiresAuth: true },
  [ApiEndpoints.AUTH.REFRESH]: { method: ApiMethods.POST, requiresAuth: false },
  [ApiEndpoints.AUTH.PROFILE]: { method: ApiMethods.GET, requiresAuth: true },

  // Trainer endpoints
  [ApiEndpoints.TRAINER.PROFILE]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.TRAINER.STATS]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.TRAINER.UPDATE]: { method: ApiMethods.PUT, requiresAuth: true },
  [ApiEndpoints.TRAINER.AVAILABILITY]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.TRAINER.SETTINGS]: { method: ApiMethods.GET, requiresAuth: true },

  // Booking endpoints
  [ApiEndpoints.BOOKINGS.LIST]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.BOOKINGS.CREATE]: { method: ApiMethods.POST, requiresAuth: true },

  // Chat endpoints
  [ApiEndpoints.CHAT.CONVERSATIONS]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.CHAT.SEND_MESSAGE]: { method: ApiMethods.POST, requiresAuth: true },
  [ApiEndpoints.CHAT.CREATE_CONVERSATION]: { method: ApiMethods.POST, requiresAuth: true },

  // Client endpoints
  [ApiEndpoints.CLIENTS.LIST]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.CLIENTS.ADD]: { method: ApiMethods.POST, requiresAuth: true },

  // Analytics endpoints
  [ApiEndpoints.ANALYTICS.DASHBOARD]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.ANALYTICS.EARNINGS]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.ANALYTICS.PERFORMANCE]: { method: ApiMethods.GET, requiresAuth: true },

  // Earnings endpoints
  [ApiEndpoints.EARNINGS.SUMMARY]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.EARNINGS.TRANSACTIONS]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.EARNINGS.PAYOUTS]: { method: ApiMethods.GET, requiresAuth: true },

  // Availability endpoints
  [ApiEndpoints.AVAILABILITY.GET]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.AVAILABILITY.UPDATE]: { method: ApiMethods.PUT, requiresAuth: true },

  // Nutrition endpoints
  [ApiEndpoints.NUTRITION.GOALS]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.NUTRITION.MEAL_LOGS]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.NUTRITION.MEAL_PLANS]: { method: ApiMethods.GET, requiresAuth: true },

  // Workout endpoints
  [ApiEndpoints.WORKOUTS.PLANS]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.WORKOUTS.SESSIONS]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.WORKOUTS.EXERCISES]: { method: ApiMethods.GET, requiresAuth: true },

  // Notification endpoints
  [ApiEndpoints.NOTIFICATIONS.LIST]: { method: ApiMethods.GET, requiresAuth: true },
  [ApiEndpoints.NOTIFICATIONS.PREFERENCES]: { method: ApiMethods.GET, requiresAuth: true },

  // Admin endpoints
  [ApiEndpoints.ADMIN.DASHBOARD]: { method: ApiMethods.GET, requiresAuth: true, requiresAdmin: true },
  [ApiEndpoints.ADMIN.USERS]: { method: ApiMethods.GET, requiresAuth: true, requiresAdmin: true },
} as const;

/**
 * Helper function to get API endpoint configuration
 */
export function getApiConfig(endpoint: string) {
  return ApiConfig[endpoint as keyof typeof ApiConfig];
}

/**
 * Helper function to check if endpoint requires authentication
 */
export function requiresAuthentication(endpoint: string): boolean {
  const config = getApiConfig(endpoint);
  return config?.requiresAuth ?? true;
}

/**
 * Helper function to check if endpoint requires admin privileges
 */
export function requiresAdmin(endpoint: string): boolean {
  const config = getApiConfig(endpoint);
  return config?.requiresAdmin ?? false;
} 