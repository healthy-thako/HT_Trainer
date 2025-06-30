# HT Trainer Navigation System

## Overview

The HT Trainer app implements a comprehensive navigation system that seamlessly connects bookings, chat, and user interactions across the platform. This system is designed to provide consistent navigation patterns and ensure users can easily move between related features.

## Architecture

### Core Components

1. **NavigationHelper** (`lib/navigation.ts`) - Main navigation utility class
2. **NavigationContext** (`context/NavigationContext.tsx`) - React context for navigation state
3. **useAppNavigation** (`hooks/useNavigation.ts`) - Custom hook for safe navigation
4. **NavigationButtons** (`components/navigation/NavigationButtons.tsx`) - Reusable navigation components
5. **Routes Configuration** (`lib/navigation/routes.ts`) - Centralized route definitions

### Navigation Flow

```
App.tsx
├── NavigationProvider (Context)
├── AuthProvider
└── NavigationContainer
    ├── Stack Navigator
    │   ├── Auth Screen (if not authenticated)
    │   └── Authenticated Stack
    │       ├── Tab Navigator
    │       │   ├── Dashboard
    │       │   ├── Bookings
    │       │   ├── Chat List
    │       │   ├── Profile
    │       │   └── Admin (if admin)
    │       ├── Chat Detail [id]
    │       └── Booking Detail [id]
```

## Key Features

### 1. Cross-Feature Navigation

The system enables seamless navigation between related features:

- **Booking → Chat**: Navigate from any booking to its associated chat conversation
- **Chat → Booking**: Navigate from a chat conversation to its associated booking
- **List → Detail**: Navigate from lists to detail screens with proper context

### 2. Smart Conversation Management

```typescript
// Automatically creates conversation if none exists
await NavigationHelper.navigateToChatFromBooking(bookingId);

// Finds associated booking from conversation
await NavigationHelper.navigateToBookingFromChat(conversationId);
```

### 3. Type-Safe Navigation

All navigation is type-safe with proper parameter validation:

```typescript
export type RootStackParamList = {
  '(tabs)': { screen?: string };
  'auth': undefined;
  'chat/[id]': { id: string };
  'bookings/[id]': { id: string };
};
```

### 4. Error Handling

Comprehensive error handling ensures navigation failures are gracefully handled:

```typescript
const { navigateToChatFromBooking } = useAppNavigation();

// Automatically handles errors and shows user-friendly messages
await navigateToChatFromBooking(bookingId);
```

## Usage Examples

### Basic Navigation

```typescript
import { useAppNavigation } from '../hooks/useNavigation';

function MyComponent() {
  const { navigateToBookingDetail, navigateToDashboard } = useAppNavigation();
  
  const handleBookingPress = (bookingId: string) => {
    navigateToBookingDetail(bookingId);
  };
  
  const goHome = () => {
    navigateToDashboard();
  };
}
```

### Using Navigation Components

```typescript
import { ChatFromBookingButton, BookingFromChatButton } from '../components/navigation/NavigationButtons';

function BookingCard({ booking }) {
  return (
    <Card>
      <Card.Content>
        {/* Booking details */}
        <ChatFromBookingButton 
          bookingId={booking.id}
          variant="outlined"
        />
      </Card.Content>
    </Card>
  );
}

function ChatHeader({ conversation }) {
  return (
    <View>
      {conversation.booking && (
        <BookingFromChatButton 
          conversationId={conversation.id}
          variant="text"
        />
      )}
    </View>
  );
}
```

### Deep Linking

The system supports deep linking with automatic parsing:

```typescript
// These URLs are automatically handled:
// ht-trainer://booking/123 → navigates to booking detail
// ht-trainer://chat/456 → navigates to chat detail
// ht-trainer://dashboard → navigates to dashboard

NavigationHelper.handleDeepLink(url);
```

## API Integration

### Automatic Conversation Creation

When navigating from a booking to chat, the system automatically:

1. Checks if a conversation exists for the booking
2. Creates a new conversation if none exists
3. Links the conversation to the booking
4. Navigates to the chat screen

```typescript
// In navigationApi (lib/supabase/api/index.ts)
export const navigationApi = {
  getOrCreateConversationForBooking: async (bookingId: string): Promise<string> => {
    // Smart conversation management
    let conversation = await chatApi.getConversationByBooking(bookingId);
    
    if (!conversation) {
      const booking = await bookingsApi.getBookingById(bookingId);
      conversation = await chatApi.createConversation(
        bookingId,
        booking.user_id,
        booking.trainer_id
      );
    }
    
    return conversation.id;
  }
};
```

## State Management

### Navigation Context

The NavigationContext provides:

```typescript
interface NavigationContextType {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList>>;
  isReady: boolean;
  onReady: () => void;
}
```

### Navigation State

Track navigation state across the app:

```typescript
const { isReady } = useAppNavigation();

// Only navigate when ready
if (isReady) {
  navigateToBookingDetail(bookingId);
}
```

## Best Practices

### 1. Use the Custom Hook

Always use `useAppNavigation()` instead of direct navigation:

```typescript
// ✅ Good
const { navigateToBookingDetail } = useAppNavigation();
navigateToBookingDetail(bookingId);

// ❌ Avoid
navigation.navigate('bookings/[id]', { id: bookingId });
```

### 2. Use Navigation Components

Leverage pre-built navigation components for consistency:

```typescript
// ✅ Good - Handles errors automatically
<ChatFromBookingButton bookingId={booking.id} />

// ❌ Avoid - Manual implementation
<Button onPress={() => /* manual navigation logic */}>
  Message
</Button>
```

### 3. Handle Loading States

Check navigation readiness before performing navigation:

```typescript
const { isReady, navigateToBookingDetail } = useAppNavigation();

const handlePress = () => {
  if (!isReady) {
    console.warn('Navigation not ready');
    return;
  }
  navigateToBookingDetail(bookingId);
};
```

### 4. Error Boundaries

Wrap navigation-heavy components in error boundaries to catch navigation errors:

```typescript
<ErrorBoundary fallback={<ErrorScreen />}>
  <BookingsList />
</ErrorBoundary>
```

## Integration with Supabase

The navigation system is tightly integrated with Supabase:

### Real-time Updates

Navigation components automatically update when data changes:

```typescript
// Real-time subscription updates navigation state
const subscription = supabase
  .channel(`conversation_${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
  }, (payload) => {
    // Navigation components automatically reflect changes
  })
  .subscribe();
```

### Data Consistency

Navigation ensures data consistency across screens:

- Booking updates reflect in associated chat conversations
- Chat messages update conversation timestamps
- Status changes propagate across all relevant screens

## Troubleshooting

### Common Issues

1. **Navigation not working**: Check if `NavigationProvider` is properly wrapped around the app
2. **Type errors**: Ensure route parameters match the `RootStackParamList` definition
3. **Deep links not working**: Verify URL patterns in `routes.ts`
4. **Context errors**: Make sure `useAppNavigation` is used within `NavigationProvider`

### Debugging

Enable navigation logging:

```typescript
// In NavigationHelper
static setDebugMode(enabled: boolean) {
  this.debugMode = enabled;
}

// Log all navigation actions
if (this.debugMode) {
  console.log('Navigating to:', route, params);
}
```

## Future Enhancements

1. **Animation Configuration**: Customize screen transitions
2. **Navigation Analytics**: Track user navigation patterns
3. **Offline Navigation**: Handle navigation when offline
4. **Push Notification Integration**: Deep link from notifications 