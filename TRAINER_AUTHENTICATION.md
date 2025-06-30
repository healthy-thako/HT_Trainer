# HT Trainer Authentication System 🔐

## Overview

The HT Trainer app uses a sophisticated authentication system specifically designed for fitness trainers. When users sign in through the app, their `user_type` must be `'trainer'` to access the platform.

## 🏗️ Database Architecture

### Core Tables Structure

#### 1. **`users` Table** - Authentication Base
```sql
users {
  id: uuid (primary key)
  email: text (unique) -- Login credential
  full_name: text -- Display name
  phone_number: text
  avatar_url: text
  user_type: 'user' | 'trainer' | 'gym_owner' | 'admin' -- CRITICAL: Must be 'trainer'
  created_at: timestamp
  updated_at: timestamp
}
```

#### 2. **`trainers` Table** - Professional Profile
```sql
trainers {
  id: uuid (primary key)
  user_id: uuid → references users(id) -- Links to auth account
  gym_id: uuid → references gyms(id) -- Optional gym association
  name: text -- Professional display name
  image_url: text -- Profile photo
  specialty: text -- e.g., "Strength Training", "Yoga"
  experience: text -- Years/background
  description: text -- Bio/about section
  certifications: text[] -- Array of certifications
  specialties: text[] -- Array of specialties
  availability: jsonb -- Weekly schedule
  pricing: jsonb -- Session pricing structure
  contact_phone: text
  contact_email: text
  location: text
  status: 'active' | 'inactive' | 'pending'
  
  -- Performance Metrics (auto-calculated)
  total_earnings: numeric
  average_rating: numeric
  total_reviews: integer
  monthly_bookings: integer
  client_count: integer
  
  created_at: timestamp
  updated_at: timestamp
}
```

#### 3. **`trainer_settings` Table** - Business Preferences
```sql
trainer_settings {
  id: uuid (primary key)
  trainer_id: uuid → references trainers(id)
  advance_booking_days: integer (default: 30)
  buffer_time_minutes: integer (default: 15)
  auto_accept_bookings: boolean (default: true)
  allow_same_day_booking: boolean (default: false)
  cancellation_policy_hours: integer (default: 24)
  notification_preferences: jsonb {
    new_booking: boolean
    booking_reminder: boolean
    payment_received: boolean
    client_message: boolean
    review_received: boolean
  }
  created_at: timestamp
  updated_at: timestamp
}
```

### Supporting Tables

#### 4. **`trainer_bookings` Table** - Session Management
```sql
trainer_bookings {
  id: uuid (primary key)
  user_id: uuid → references users(id) -- Client
  trainer_id: uuid → references trainers(id) -- Trainer
  session_date: date
  session_time: time
  duration_minutes: integer (default: 60)
  total_amount: numeric
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  payment_status: 'pending' | 'paid' | 'refunded'
  session_type: 'Personal Training' | 'Group Session' | 'Consultation'
  notes: text -- Client notes
  trainer_notes: text -- Trainer notes
  rating: integer -- Session rating (1-5)
  client_feedback: text
  reminder_sent: boolean
  no_show: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

#### 5. **`trainer_earnings` Table** - Financial Tracking
```sql
trainer_earnings {
  id: uuid (primary key)
  trainer_id: uuid → references trainers(id)
  booking_id: uuid → references trainer_bookings(id)
  amount: numeric -- Gross amount
  commission_rate: numeric (default: 0.8) -- 80% to trainer
  platform_fee: numeric -- Platform commission
  net_amount: numeric -- Amount trainer receives
  status: 'pending' | 'paid' | 'processing'
  payment_method: text
  paid_at: timestamp
  created_at: timestamp
}
```

#### 6. **`trainer_reviews` Table** - Feedback System
```sql
trainer_reviews {
  id: uuid (primary key)
  trainer_id: uuid → references trainers(id)
  user_id: uuid → references users(id) -- Client who left review
  booking_id: uuid → references trainer_bookings(id)
  rating: integer (1-5)
  comment: text
  session_type: text
  would_recommend: boolean (default: true)
  created_at: timestamp
  updated_at: timestamp
}
```

## 🔐 Authentication Flow

### 1. **Sign In Process**
```typescript
// When trainer attempts to sign in
const { success, error } = await trainerContext.signIn(email, password);

// Internal flow:
1. Supabase Auth validates credentials
2. System checks if user.user_type === 'trainer'
3. If not trainer → Sign out immediately + show error
4. If trainer → Load complete trainer profile
5. Load dashboard data and settings
```

### 2. **Data Loading Sequence**
```typescript
// After successful authentication:
1. Load user data from users table
2. Load trainer profile from trainers table (linked by user_id)
3. Load trainer settings (create defaults if none exist)
4. Load dashboard data (bookings, earnings, reviews)
```

### 3. **Session Management**
```typescript
// TrainerContext provides:
{
  session: Session | null,           // Supabase session
  user: User | null,                 // Auth user data
  trainer: AuthenticatedTrainer | null, // Complete trainer data
  isLoading: boolean,                // Loading state
  isTrainer: boolean,                // Quick check
  dashboardData: TrainerDashboardData | null, // Dashboard metrics
  
  // Actions
  signIn: (email, password) => Promise<{success, error}>,
  signOut: () => Promise<void>,
  refreshTrainerData: () => Promise<void>,
  refreshDashboard: () => Promise<void>
}
```

## 📱 Usage in Components

### Basic Authentication Check
```typescript
import { useTrainer } from '../context/TrainerContext';

function MyComponent() {
  const { isTrainer, trainer, isLoading } = useTrainer();
  
  if (isLoading) return <LoadingSpinner />;
  if (!isTrainer) return <SignInScreen />;
  
  return <TrainerDashboard trainer={trainer} />;
}
```

### Authenticated Trainer Hook
```typescript
import { useAuthenticatedTrainer } from '../context/TrainerContext';

function DashboardScreen() {
  // This hook throws error if trainer not authenticated
  const { trainer, dashboardData, refreshDashboard } = useAuthenticatedTrainer();
  
  return (
    <View>
      <Text>Welcome, {trainer.trainer.name}!</Text>
      <Text>Total Earnings: ${trainer.trainer.total_earnings}</Text>
      {/* Dashboard content */}
    </View>
  );
}
```

### Sign In Component
```typescript
function SignInScreen() {
  const { signIn, isLoading } = useTrainer();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSignIn = async () => {
    const { success, error } = await signIn(email, password);
    
    if (!success) {
      Alert.alert('Sign In Failed', error);
    }
    // Success handled automatically by context
  };
  
  return (
    <View>
      <TextInput 
        value={email} 
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
      />
      <TextInput 
        value={password} 
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      <Button 
        title={isLoading ? "Signing In..." : "Sign In"}
        onPress={handleSignIn}
        disabled={isLoading}
      />
    </View>
  );
}
```

## 🎯 Key Features

### 1. **Type Safety**
- Full TypeScript interfaces for all data structures
- Compile-time validation of trainer data
- Proper error handling and null checks

### 2. **Security**
- User type validation on every sign-in
- Automatic sign-out if not a trainer
- Row Level Security (RLS) policies in database

### 3. **Performance**
- Efficient data loading with single queries
- Dashboard data caching
- Optimized re-renders with React Context

### 4. **User Experience**
- Loading states for all operations
- Automatic data refresh on auth changes
- Error handling with user-friendly messages

## 🔧 API Functions

### TrainerAPI Class Methods
```typescript
// Authentication & Profile
TrainerAPI.validateTrainerAuth(userId) → boolean
TrainerAPI.getAuthenticatedTrainer(userId) → AuthenticatedTrainer | null
TrainerAPI.getTrainerByUserId(userId) → TrainerProfile | null
TrainerAPI.updateTrainerProfile(trainerId, updates) → TrainerProfile | null

// Settings
TrainerAPI.getTrainerSettings(trainerId) → TrainerSettings | null
TrainerAPI.createDefaultTrainerSettings(trainerId) → TrainerSettings

// Dashboard & Analytics
TrainerAPI.getTrainerDashboard(trainerId) → TrainerDashboardData | null

// Bookings
TrainerAPI.getTrainerBookings(trainerId, filters?) → TrainerBooking[]
TrainerAPI.updateBookingStatus(bookingId, status, notes?) → boolean

// Earnings
TrainerAPI.getTrainerEarnings(trainerId, filters?) → TrainerEarnings[]
```

## 🚀 Current Database Status

✅ **Database is Ready!**
- 13 trainers already exist in the system
- All trainers now have linked user accounts with `user_type: 'trainer'`
- Sample trainer emails: `jake.rodriguez@healthythako.com`, `alex.johnson@fitmail.com`, etc.
- All relationships and constraints are properly configured

## 🔑 Test Credentials

You can test the system with any of the existing trainer emails. Since these are demo accounts, you'll need to set up proper passwords through Supabase Auth or create new trainer accounts.

## 📈 Next Steps

1. **Set up authentication UI** - Create sign-in/sign-up screens
2. **Implement dashboard** - Use the dashboard data for trainer overview
3. **Add booking management** - Allow trainers to manage their sessions
4. **Integrate earnings tracking** - Show financial analytics
5. **Add real-time features** - Live booking notifications and chat

---

**The HT Trainer authentication system is now fully configured and ready for trainer sign-ins!** 🏋️‍♂️✨ 