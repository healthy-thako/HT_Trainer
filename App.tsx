import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationProvider, useNavigationContext } from './context/NavigationContext';
import AuthScreen from './app/auth/index';
import TabsLayout from './app/(tabs)/_layout';
import ChatScreen from './app/chat/[id]';
import BookingDetailScreen from './app/bookings/[id]';
import AnalyticsScreen from './app/analytics/index';
import EarningsScreen from './app/earnings/index';
import ClientsScreen from './app/clients/index';
import AvailabilityScreen from './app/availability/index';
import { Colors } from './constants/Colors';

const Stack = createStackNavigator();

const theme = {
  colors: {
    primary: Colors.primary,
    accent: Colors.secondary,
    background: Colors.background,
    surface: Colors.surface,
    text: Colors.text,
    onSurface: Colors.onSurface,
    onBackground: Colors.text,
    onPrimary: Colors.onPrimary,
    onSecondary: Colors.onSecondary,
    disabled: Colors.disabled,
    placeholder: Colors.textSecondary,
    backdrop: Colors.overlay,
    notification: Colors.error,
    outline: Colors.outline,
    outlineVariant: Colors.border,
    surfaceVariant: Colors.surfaceVariant,
    onSurfaceVariant: Colors.onSurfaceVariant,
    // Elevation levels with proper brand colors
    elevation: {
      level0: Colors.elevation.level0,
      level1: Colors.elevation.level1,
      level2: Colors.elevation.level2,
      level3: Colors.elevation.level3,
      level4: Colors.elevation.level4,
      level5: Colors.elevation.level5,
    },
  },
};

function AppNavigator() {
  const { user, trainer, loading } = useAuth();
  const { navigationRef, onReady } = useNavigationContext();

  if (loading) {
    return null; // You can add a loading screen here
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={onReady}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user || !trainer ? (
          <Stack.Screen name="auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="(tabs)" component={TabsLayout} />
            <Stack.Screen 
              name="chat/[id]" 
              component={ChatScreen}
              options={{ 
                headerShown: true,
                title: 'Chat',
                headerStyle: {
                  backgroundColor: Colors.surface,
                },
                headerTintColor: Colors.primary,
              }}
            />
            <Stack.Screen 
              name="bookings/[id]" 
              component={BookingDetailScreen}
              options={{ 
                headerShown: true,
                title: 'Booking Details',
                headerStyle: {
                  backgroundColor: Colors.surface,
                },
                headerTintColor: Colors.primary,
              }}
            />
            <Stack.Screen 
              name="analytics" 
              component={AnalyticsScreen}
              options={{ 
                headerShown: true,
                title: 'Analytics',
                headerStyle: {
                  backgroundColor: Colors.surface,
                },
                headerTintColor: Colors.primary,
              }}
            />
            <Stack.Screen 
              name="earnings" 
              component={EarningsScreen}
              options={{ 
                headerShown: true,
                title: 'Earnings',
                headerStyle: {
                  backgroundColor: Colors.surface,
                },
                headerTintColor: Colors.primary,
              }}
            />
            <Stack.Screen 
              name="clients" 
              component={ClientsScreen}
              options={{ 
                headerShown: true,
                title: 'Clients',
                headerStyle: {
                  backgroundColor: Colors.surface,
                },
                headerTintColor: Colors.primary,
              }}
            />
            <Stack.Screen 
              name="availability" 
              component={AvailabilityScreen}
              options={{ 
                headerShown: true,
                title: 'Availability',
                headerStyle: {
                  backgroundColor: Colors.surface,
                },
                headerTintColor: Colors.primary,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationProvider>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </NavigationProvider>
    </PaperProvider>
  );
}
