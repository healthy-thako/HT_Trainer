# HT Trainer Integration - Quick Start Guide

## 🚀 Quick Integration for Main HT App

### 1. Setup & Configuration

```typescript
// Install dependencies
npm install @supabase/supabase-js

// Configure Supabase client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lhncpcsniuxnrmabbkmr.supabase.co',
  'your-anon-key'
);

// Import cross-platform API
import { crossPlatformApi } from './lib/supabase/api';
```

### 2. Essential API Endpoints

#### Get All Trainers
```typescript
const trainers = await crossPlatformApi.getAllTrainers({
  specialty: 'Weight Training',    // Optional filter
  location: 'New York',           // Optional filter
  min_rating: 4.0,               // Optional filter
  max_price: 100,                // Optional filter
  limit: 20                      // Optional limit
});

// Returns array of trainer objects with pricing, ratings, specialties
```

#### Get Trainer Details + Availability
```typescript
const trainer = await crossPlatformApi.getTrainerDetails('trainer-uuid');

// Returns trainer info + availability array for next 30 days
// trainer.availability = [{ date, start_time, end_time, is_available }]
```

#### Book a Session
```typescript
const result = await crossPlatformApi.bookTrainerSession({
  user_id: 'client-user-uuid',
  trainer_id: 'trainer-uuid',
  session_date: '2024-01-15',
  session_time: '09:00',
  duration_minutes: 60,
  total_amount: 75.00,
  payment_method: 'stripe',
  payment_token: 'stripe_token_from_elements',
  notes: 'First session'
});

// Returns: { success: true, booking_id, conversation_id }
// Automatically creates chat conversation
```

#### Get User's Bookings
```typescript
const bookings = await crossPlatformApi.getUserBookings(
  'user-uuid',
  'confirmed' // Optional status filter
);

// Returns array of bookings with trainer details
```

#### Chat Functions
```typescript
// Get or create conversation
const conversation = await crossPlatformApi.getOrCreateConversation(
  'user-uuid',
  'trainer-uuid',
  'booking-uuid' // Optional
);

// Send message
const message = await crossPlatformApi.sendMessage(
  'conversation-uuid',
  'user-uuid',
  'Hello! Looking forward to our session.',
  'user' // sender_type
);

// Get messages
const messages = await crossPlatformApi.getConversationMessages(
  'conversation-uuid',
  50, // limit
  0   // offset
);
```

### 3. Real-time Chat Subscription

```typescript
// Subscribe to new messages
const subscription = supabase
  .channel(`conversation_${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    const newMessage = payload.new;
    // Update your chat UI
    addMessageToChat(newMessage);
  })
  .subscribe();

// Don't forget to unsubscribe
subscription.unsubscribe();
```

### 4. Authentication Setup

```typescript
// Client signup (Main HT App)
const { data, error } = await supabase.auth.signUp({
  email: 'client@example.com',
  password: 'password',
  options: {
    data: {
      full_name: 'John Doe',
      user_type: 'client' // IMPORTANT: Set user type
    }
  }
});

// Client signin
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'client@example.com',
  password: 'password'
});
```

### 5. Payment Integration (Stripe Example)

```typescript
// Install Stripe
npm install @stripe/stripe-react-native

// Setup Stripe
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';

function PaymentScreen() {
  const { confirmPayment } = useStripe();
  
  const handlePayment = async () => {
    // Create payment intent on your backend
    const { client_secret } = await fetch('/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: 7500 }) // $75.00 in cents
    }).then(r => r.json());
    
    // Confirm payment
    const { error, paymentIntent } = await confirmPayment(client_secret, {
      paymentMethodType: 'Card',
    });
    
    if (!error) {
      // Payment successful - book the session
      const booking = await crossPlatformApi.bookTrainerSession({
        // ... booking data
        payment_token: paymentIntent.id
      });
    }
  };
}
```

### 6. Error Handling

```typescript
try {
  const result = await crossPlatformApi.bookTrainerSession(bookingData);
  
  if (result.success) {
    // Success - navigate to booking confirmation
    navigation.navigate('BookingConfirmation', { 
      bookingId: result.booking_id,
      conversationId: result.conversation_id 
    });
  } else {
    // Payment or booking failed
    Alert.alert('Booking Failed', result.message);
  }
} catch (error) {
  // Network or other error
  Alert.alert('Error', 'Something went wrong. Please try again.');
}
```

### 7. Data Models

#### Trainer Object
```typescript
interface Trainer {
  id: string;
  name: string;
  image_url?: string;
  specialty: string;
  specialties: string[];
  experience: string;
  average_rating: number;
  total_reviews: number;
  description: string;
  location: string;
  pricing: {
    hourly_rate: number;
    session_packages: Array<{
      sessions: number;
      price: number;
      description: string;
    }>;
  };
  certifications: string[];
  bio: string;
  availability?: Array<{
    date: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }>;
}
```

#### Booking Object
```typescript
interface Booking {
  id: string;
  user_id: string;
  trainer_id: string;
  session_date: string;
  session_time: string;
  duration_minutes: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'processing' | 'completed' | 'failed';
  notes?: string;
  trainer: {
    name: string;
    image_url?: string;
    specialty: string;
    location: string;
  };
}
```

#### Message Object
```typescript
interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'user' | 'trainer';
  message_text: string;
  message_type: 'text' | 'image' | 'system';
  created_at: string;
  read_at?: string;
}
```

### 8. Environment Variables

```env
# Add to your .env file
SUPABASE_URL=https://lhncpcsniuxnrmabbkmr.supabase.co
SUPABASE_ANON_KEY=your-anon-key
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 9. Complete Flow Example

```typescript
// 1. User browses trainers
const trainers = await crossPlatformApi.getAllTrainers();

// 2. User selects trainer and views details
const trainer = await crossPlatformApi.getTrainerDetails(selectedTrainerId);

// 3. User selects time slot and books
const booking = await crossPlatformApi.bookTrainerSession({
  user_id: currentUser.id,
  trainer_id: trainer.id,
  session_date: selectedDate,
  session_time: selectedTime,
  duration_minutes: 60,
  total_amount: trainer.pricing.hourly_rate,
  payment_method: 'stripe',
  payment_token: stripeToken
});

// 4. Navigate to chat (conversation auto-created)
if (booking.success) {
  navigation.navigate('Chat', { 
    conversationId: booking.conversation_id 
  });
}
```

### 10. Testing

```typescript
// Test with existing trainer data
const testTrainerId = 'existing-trainer-uuid';
const testUserId = 'your-test-user-uuid';

// Test trainer discovery
console.log(await crossPlatformApi.getAllTrainers({ limit: 5 }));

// Test booking (without payment)
console.log(await crossPlatformApi.getTrainerDetails(testTrainerId));
```

---

## 🔗 Related Files

- `CROSS_PLATFORM_INTEGRATION.md` - Complete documentation
- `lib/supabase/api/index.ts` - Full API implementation
- `lib/supabase/api/payments.ts` - Payment processing
- `SUPABASE_SETUP.md` - Database schema details

---

## ⚡ Quick Checklist

- [ ] Install Supabase client
- [ ] Configure authentication with `user_type: 'client'`
- [ ] Implement trainer listing with `getAllTrainers()`
- [ ] Add trainer details with `getTrainerDetails()`
- [ ] Integrate payment processing
- [ ] Implement booking with `bookTrainerSession()`
- [ ] Add chat with `getOrCreateConversation()`
- [ ] Setup real-time message subscriptions
- [ ] Test complete flow end-to-end

---

*Ready to integrate? Start with step 1 and follow the examples above!* 