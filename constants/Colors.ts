// Healthy Thako Brand Colors
const brandPrimary = '#3c0747'; // Deep purple from gradient start
const brandSecondary = '#c90e5c'; // Pink from gradient end
const brandWhite = '#FFFFFF';
const brandGradient = 'linear-gradient(135deg, #3c0747, #c90e5c)';

const tintColorLight = brandPrimary;
const tintColorDark = brandWhite;

export default {
  light: {
    text: '#1a1a1a',
    background: '#fafafa',
    tint: tintColorLight,
    tabIconDefault: '#9ca3af',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: brandWhite,
    background: brandPrimary,
    tint: tintColorDark,
    tabIconDefault: '#6b7280',
    tabIconSelected: tintColorDark,
  },
};

export const Colors = {
  // Brand Colors
  primary: brandPrimary,        // #3c0747 - Deep purple
  secondary: brandSecondary,    // #c90e5c - Pink
  accent: '#8b5cf6',           // Purple accent
  white: brandWhite,           // Pure white
  
  // Gradient Colors
  gradientStart: brandPrimary,  // #3c0747
  gradientEnd: brandSecondary,  // #c90e5c
  gradientString: brandGradient,
  
  // Status Colors (Professional palette)
  success: '#10b981',          // Emerald green
  warning: '#f59e0b',          // Amber
  error: '#ef4444',            // Red
  info: '#3b82f6',             // Blue
  
  // Background Colors
  background: '#fafafa',        // Light gray background
  surface: brandWhite,          // White surface
  surfaceVariant: '#f8fafc',    // Very light gray
  card: brandWhite,             // White cards
  overlay: 'rgba(60, 7, 71, 0.8)', // Brand overlay
  
  // Text Colors
  text: '#1f2937',             // Dark gray text
  textSecondary: '#6b7280',    // Medium gray
  textTertiary: '#9ca3af',     // Light gray
  textInverse: brandWhite,     // White text on dark backgrounds
  onPrimary: brandWhite,       // White text on primary
  onSecondary: brandWhite,     // White text on secondary
  onSurface: '#1f2937',        // Dark text on surfaces
  onSurfaceVariant: '#6b7280', // Medium text on surface variants
  
  // Border & Outline Colors
  border: '#e5e7eb',           // Light border
  borderFocus: brandPrimary,   // Focused border
  separator: '#f3f4f6',        // Separator lines
  outline: '#d1d5db',          // Outline color
  outlineFocus: brandSecondary, // Focused outline
  
  // Interactive States
  hover: 'rgba(60, 7, 71, 0.08)',     // Hover state
  pressed: 'rgba(60, 7, 71, 0.12)',   // Pressed state
  focus: 'rgba(60, 7, 71, 0.12)',     // Focus state
  disabled: '#f3f4f6',                // Disabled background
  disabledText: '#9ca3af',            // Disabled text
  
  // Status Colors (Contextual)
  online: '#10b981',           // Online status
  offline: '#6b7280',          // Offline status
  busy: '#f59e0b',             // Busy status
  away: '#8b5cf6',             // Away status
  
  // Chat Colors
  messageReceived: '#f3f4f6',  // Received message background
  messageSent: brandPrimary,   // Sent message background
  messageText: '#1f2937',      // Message text
  messageTextSent: brandWhite, // Sent message text
  
  // Booking Status Colors
  pending: '#f59e0b',          // Pending bookings
  confirmed: '#10b981',        // Confirmed bookings
  completed: '#8b5cf6',        // Completed bookings
  cancelled: '#ef4444',        // Cancelled bookings
  rescheduled: '#3b82f6',      // Rescheduled bookings
  
  // Semantic Colors
  revenue: '#10b981',          // Revenue/earnings
  expense: '#ef4444',          // Expenses
  neutral: '#6b7280',          // Neutral values
  
  // Shadow Colors
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
  shadowLight: 'rgba(0, 0, 0, 0.05)',
  
  // Elevation Colors (for Material Design)
  elevation: {
    level0: 'transparent',
    level1: brandWhite,
    level2: '#fefefe',
    level3: '#fdfdfd',
    level4: '#fcfcfc',
    level5: '#fbfbfb',
  },
}; 