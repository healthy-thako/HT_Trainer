# Cross-Platform Integration Guide
## HT Main App ↔ HT Trainer App Integration

### 📋 Overview

This document outlines the complete integration flow between the **HT Main App** (client-facing) and the **HT Trainer App** (trainer-facing). The system enables clients to discover trainers, book sessions, make payments, and communicate through a unified platform.

---

## 🏗️ System Architecture

### Database Schema Overview

```sql
-- Core Tables for Cross-Platform Integration
users (id, email, full_name, user_type, avatar_url, phone_number)
trainers (id, user_id, name, specialties, pricing, location, status)
trainer_bookings (id, user_id, trainer_id, session_date, status, payment_status)
chat_conversations (id, user_id, trainer_id, booking_id, status)
chat_messages (id, conversation_id, sender_id, sender_type, message_text)
payment_transactions (id, booking_id, trainer_id, amount, payment_status)
trainer_earnings (id, trainer_id, booking_id, net_amount, status)
trainer_notifications (id, trainer_id, type, title, message, read)
```

### User Types
- **`user_type: 'client'`** - Regular users in the main HT app
- **`user_type: 'trainer'`** - Trainers using the HT Trainer app

---

## 🔄 Complete Integration Flow

### Phase 1: Trainer Discovery (Main HT App)

```typescript
// 1. Get all available trainers
import { crossPlatformApi } from './lib/supabase/api';

const trainers = await crossPlatformApi.getAllTrainers({
  specialty: 'Weight Training',
  location: 'New York',
  min_rating: 4.0,
  max_price: 100,
  limit: 20
});

// Response format:
[
  {
    id: "trainer-uuid",
    name: "John Smith",
    image_url: "https://...",
    specialty: "Weight Training",
    specialties: ["Weight Training", "Cardio", "Nutrition"],
    experience: "5 years",
    average_rating: 4.8,
    total_reviews: 127,
    description: "Certified personal trainer...",
    location: "New York, NY",
    pricing: {
      hourly_rate: 75,
      session_packages: [
        { sessions: 4, price: 270, description: "4-session package (10% discount)" },
        { sessions: 8, price: 510, description: "8-session package (15% discount)" }
      ]
    },
    certifications: ["NASM", "ACE"],
    bio: "Passionate about helping clients...",
    user: {
      id: "user-uuid",
      full_name: "John Smith",
      avatar_url: "https://..."
    }
  }
]
```

### Phase 2: Trainer Details & Availability (Main HT App)

```typescript
// 2. Get detailed trainer info with availability
const trainerDetails = await crossPlatformApi.getTrainerDetails(trainerId);

// Response includes availability for next 30 days:
{
  ...trainerInfo,
  availability: [
    {
      id: "slot-uuid",
      trainer_id: "trainer-uuid",
      date: "2024-01-15",
      start_time: "09:00",
      end_time: "10:00",
      is_available: true,
      session_type: "personal_training"
    }
  ]
}
```

### Phase 3: Session Booking & Payment (Main HT App)

```typescript
// 3. Book a session with payment processing
const bookingResult = await crossPlatformApi.bookTrainerSession({
  user_id: "client-user-uuid",
  trainer_id: "trainer-uuid",
  session_date: "2024-01-15",
  session_time: "09:00",
  duration_minutes: 60,
  total_amount: 75.00,
  payment_method: "stripe",
  payment_token: "stripe_token_here", // From Stripe Elements
  notes: "First session, focusing on weight training"
});

// Success Response:
{
  success: true,
  booking_id: "booking-uuid",
  conversation_id: "conversation-uuid",
  message: "Booking confirmed and chat created successfully"
}

// Error Response:
{
  success: false,
  error: "Payment processing failed",
  message: "Payment processing failed"
}
```

### Phase 4: Automatic System Processing

When a booking is successfully created, the system automatically:

1. **Creates Booking Record** with status `confirmed`
2. **Processes Payment** through Stripe/PayPal
3. **Creates Chat Conversation** linking client and trainer
4. **Calculates Trainer Earnings** (85% to trainer, 15% platform fee)
5. **Sends Notification** to trainer in HT Trainer app
6. **Updates Trainer Availability** (marks slot as booked)

### Phase 5: Chat Integration (Both Apps)

```typescript
// 5. Get or create conversation (Main HT App)
const conversation = await crossPlatformApi.getOrCreateConversation(
  userId,
  trainerId,
  bookingId // Optional: links chat to specific booking
);

// 6. Send messages (Main HT App)
const message = await crossPlatformApi.sendMessage(
  conversationId,
  userId,
  "Hi! Looking forward to our session tomorrow.",
  'user' // sender_type
);

// 7. Get conversation messages (Main HT App)
const messages = await crossPlatformApi.getConversationMessages(
  conversationId,
  50, // limit
  0   // offset
);
```

### Phase 6: Trainer App Processing

The **HT Trainer App** automatically:

1. **Receives Real-time Notification** of new booking
2. **Shows Booking in Dashboard** with client details
3. **Enables Chat Access** with the client
4. **Allows Booking Management** (confirm, reschedule, complete)
5. **Tracks Earnings** and payment status

---

## 🔌 API Endpoints for Main HT App

### Base Configuration

```typescript
// Supabase Configuration (shared between apps)
const supabaseUrl = 'https://lhncpcsniuxnrmabbkmr.supabase.co';
const supabaseAnonKey = 'your-anon-key';

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Core API Functions

```typescript
// Import the cross-platform API
import { crossPlatformApi } from './lib/supabase/api';

// 1. Trainer Discovery
const trainers = await crossPlatformApi.getAllTrainers(filters);

// 2. Trainer Details
const trainer = await crossPlatformApi.getTrainerDetails(trainerId);

// 3. Book Session
const booking = await crossPlatformApi.bookTrainerSession(bookingData);

// 4. Get User Bookings
const userBookings = await crossPlatformApi.getUserBookings(userId, status);

// 5. Chat Functions
const conversation = await crossPlatformApi.getOrCreateConversation(userId, trainerId);
const message = await crossPlatformApi.sendMessage(conversationId, senderId, text);
const messages = await crossPlatformApi.getConversationMessages(conversationId);
```

---

## 💳 Payment Integration

### Current Implementation

The system includes a payment processing framework that supports:

- **Stripe Integration** (placeholder ready for implementation)
- **PayPal Integration** (placeholder ready for implementation)
- **Transaction Tracking** with detailed records
- **Automatic Earnings Calculation** with platform fees

### Payment Flow

```typescript
// Payment processing happens automatically in bookTrainerSession()
const paymentResult = await PaymentsAPI.processPayment({
  amount: 75.00,
  currency: 'USD',
  payment_method: 'stripe',
  payment_token: 'stripe_token',
  booking_id: 'booking-uuid',
  trainer_id: 'trainer-uuid'
});

// Creates records in:
// - payment_transactions (transaction details)
// - trainer_earnings (trainer payout calculation)
```

### Stripe Integration Example

```typescript
// TODO: Implement in PaymentsAPI.processPayment()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const paymentIntent = await stripe.paymentIntents.create({
  amount: amount * 100, // Convert to cents
  currency: 'USD',
  payment_method: paymentToken,
  confirm: true,
  metadata: {
    booking_id: bookingId,
    trainer_id: trainerId,
    user_id: userId
  }
});
```

---

## 💬 Real-time Chat System

### Chat Architecture

- **Conversations** link users, trainers, and bookings
- **Messages** support text, images, and attachments
- **Real-time Updates** via Supabase subscriptions
- **Cross-Platform Access** from both apps

### Message Flow

```typescript
// Real-time subscription (both apps)
const subscription = supabase
  .channel(`conversation_${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // Handle new message
    const newMessage = payload.new;
    updateMessagesList(newMessage);
  })
  .subscribe();
```

### Message Types

- **`sender_type: 'user'`** - Messages from clients (Main HT App)
- **`sender_type: 'trainer'`** - Messages from trainers (HT Trainer App)
- **`message_type: 'text'`** - Text messages
- **`message_type: 'image'`** - Image attachments
- **`message_type: 'system'`** - System notifications

---

## 📱 Notification System

### Trainer Notifications

When events occur in the main app, trainers receive notifications:

```typescript
// Automatic notification creation
await supabase
  .from('trainer_notifications')
  .insert({
    trainer_id: trainerId,
    type: 'new_booking',
    title: 'New Booking Request',
    message: 'You have received a new booking request from Sarah Johnson',
    data: { 
      booking_id: bookingId,
      client_name: 'Sarah Johnson',
      session_date: '2024-01-15',
      session_time: '09:00'
    },
    read: false
  });
```

### Notification Types

- **`new_booking`** - New session booked
- **`booking_cancelled`** - Client cancelled session
- **`payment_received`** - Payment processed successfully
- **`new_message`** - New chat message received
- **`session_reminder`** - Upcoming session reminder

---

## 🔐 Security & Authentication

### Row Level Security (RLS)

All tables have RLS policies ensuring:

- **Users** can only access their own data
- **Trainers** can only see their bookings and conversations
- **Cross-platform access** is properly secured

### Authentication Flow

```typescript
// Main HT App - Client Authentication
const { data: authData, error } = await supabase.auth.signUp({
  email: 'client@example.com',
  password: 'password',
  options: {
    data: {
      full_name: 'John Doe',
      user_type: 'client' // Important: Set user type
    }
  }
});

// HT Trainer App - Trainer Authentication
const { data: authData, error } = await supabase.auth.signUp({
  email: 'trainer@example.com',
  password: 'password',
  options: {
    data: {
      full_name: 'Jane Smith',
      user_type: 'trainer' // Important: Set user type
    }
  }
});
```

---

## 📊 Data Models

### Booking Status Flow

```
pending → confirmed → completed
    ↓         ↓          ↓
cancelled  cancelled  cancelled
```

### Payment Status Flow

```
processing → completed → paid_out
     ↓           ↓
   failed    refunded
```

### Chat Status Flow

```
active → archived
   ↓
blocked
```

---

## 🚀 Implementation Checklist for Main HT App

### Phase 1: Basic Integration
- [ ] Install Supabase client
- [ ] Configure authentication with `user_type: 'client'`
- [ ] Implement trainer discovery screen
- [ ] Add trainer detail view with availability

### Phase 2: Booking System
- [ ] Implement session booking flow
- [ ] Integrate Stripe/PayPal payment processing
- [ ] Add booking confirmation screen
- [ ] Implement booking history

### Phase 3: Chat Integration
- [ ] Add chat conversation list
- [ ] Implement real-time messaging
- [ ] Add message notifications
- [ ] Link chat to bookings

### Phase 4: Advanced Features
- [ ] Add push notifications
- [ ] Implement booking reminders
- [ ] Add rating/review system
- [ ] Add session feedback

---

## 🔧 Environment Setup

### Required Environment Variables

```env
# Supabase Configuration
SUPABASE_URL=https://lhncpcsniuxnrmabbkmr.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Payment Processing
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-secret

# Push Notifications
EXPO_PUSH_TOKEN=your-expo-push-token
```

### Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x.x",
    "@stripe/stripe-react-native": "^0.x.x",
    "expo-notifications": "^0.x.x",
    "expo-linear-gradient": "^12.x.x"
  }
}
```

---

## 📈 Analytics & Monitoring

### Key Metrics to Track

- **Booking Conversion Rate** - Trainer views → Bookings
- **Payment Success Rate** - Payment attempts → Successful payments
- **Chat Engagement** - Messages per conversation
- **Trainer Response Time** - Time to respond to bookings/messages
- **Session Completion Rate** - Booked → Completed sessions

### Database Queries for Analytics

```sql
-- Booking conversion rate
SELECT 
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
  (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*)) as completion_rate
FROM trainer_bookings
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Average response time
SELECT 
  AVG(EXTRACT(EPOCH FROM (first_response.created_at - conversations.created_at))/60) as avg_response_minutes
FROM chat_conversations conversations
JOIN chat_messages first_response ON conversations.id = first_response.conversation_id
WHERE first_response.sender_type = 'trainer';
```

---

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure `user_type` is set correctly during signup
   - Check RLS policies are properly configured

2. **Payment Failures**
   - Verify Stripe/PayPal credentials
   - Check payment token validity
   - Ensure booking data is complete

3. **Chat Not Working**
   - Verify conversation exists
   - Check real-time subscription setup
   - Ensure proper sender_type values

4. **Booking Issues**
   - Check trainer availability
   - Verify booking time slots
   - Ensure payment processing is complete

### Debug Queries

```sql
-- Check user type
SELECT id, email, user_type FROM users WHERE email = 'user@example.com';

-- Check trainer profile
SELECT * FROM trainers WHERE user_id = 'user-uuid';

-- Check booking status
SELECT * FROM trainer_bookings WHERE id = 'booking-uuid';

-- Check conversation
SELECT * FROM chat_conversations WHERE booking_id = 'booking-uuid';
```

---

## 📞 Support & Contact

For technical support or integration questions:

- **Documentation**: This file and related MD files in the project
- **Database Schema**: Check `SUPABASE_SETUP.md`
- **API Reference**: See `lib/supabase/api/` directory
- **Example Implementation**: HT Trainer app codebase

---

## 🔄 Version History

- **v1.0** - Initial cross-platform integration
- **v1.1** - Enhanced payment processing
- **v1.2** - Real-time chat system
- **v1.3** - Notification system
- **v1.4** - Complete API documentation

---

*This document should be updated as the integration evolves and new features are added.* 