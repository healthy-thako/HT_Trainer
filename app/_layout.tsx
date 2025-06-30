import React from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { NavigationProvider } from '../context/NavigationContext';
// import { NotificationProvider } from '../context/NotificationContext'; // DISABLED
import { Colors } from '../constants/Colors';

export default function RootLayout() {
  return (
    <PaperProvider>
      <AuthProvider>
        {/* <NotificationProvider> DISABLED */}
          <NavigationProvider>
            <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: Colors.surface,
              },
              headerTintColor: Colors.text,
              headerTitleStyle: {
                fontWeight: '600',
              },
              headerShadowVisible: true,
            }}
          >
            {/* Auth Screens */}
            <Stack.Screen 
              name="auth" 
              options={{ 
                headerShown: false,
                title: 'Authentication'
              }} 
            />
            
            {/* Main Tab Navigation */}
            <Stack.Screen 
              name="(tabs)" 
              options={{ 
                headerShown: false,
                title: 'HT Trainer'
              }} 
            />
            
            {/* Feature Screens */}
            <Stack.Screen 
              name="analytics" 
              options={{ 
                title: 'Analytics',
                presentation: 'modal'
              }} 
            />
            
            <Stack.Screen 
              name="earnings" 
              options={{ 
                title: 'Earnings',
                presentation: 'modal'
              }} 
            />
            
            <Stack.Screen 
              name="clients" 
              options={{ 
                title: 'My Clients',
                presentation: 'modal'
              }} 
            />
            
            <Stack.Screen 
              name="availability" 
              options={{ 
                title: 'Availability',
                presentation: 'modal'
              }} 
            />
            
            <Stack.Screen 
              name="nutrition" 
              options={{ 
                title: 'Nutrition Plans',
                presentation: 'modal'
              }} 
            />
            
            <Stack.Screen 
              name="bookings" 
              options={{ 
                title: 'Bookings',
                presentation: 'modal'
              }} 
            />
            
            <Stack.Screen 
              name="chat" 
              options={{ 
                title: 'Conversations',
                presentation: 'modal'
              }} 
            />
            
            {/* Onboarding Screens */}
            <Stack.Screen 
              name="onboarding/trainer-setup" 
              options={{ 
                title: 'Complete Your Profile',
                headerShown: false
              }} 
            />
            
            {/* Client Management Screens */}
            <Stack.Screen 
              name="clients/add-client" 
              options={{ 
                title: 'Add New Client',
                headerBackTitle: 'Back'
              }} 
            />
            
            <Stack.Screen 
              name="clients/[id]" 
              options={{ 
                title: 'Client Details',
                headerBackTitle: 'Back'
              }} 
            />
            
            {/* Workout Screens */}
            <Stack.Screen 
              name="workouts/create-plan" 
              options={{ 
                title: 'Create Workout Plan',
                headerBackTitle: 'Back'
              }} 
            />
            
            <Stack.Screen 
              name="workouts/[id]" 
              options={{ 
                title: 'Workout Plan',
                headerBackTitle: 'Back'
              }} 
            />
            
            {/* Detail Screens */}
            <Stack.Screen 
              name="chat/[id]" 
              options={{ 
                title: 'Chat',
                headerBackTitle: 'Back'
              }} 
            />
            
            <Stack.Screen 
              name="bookings/[id]" 
              options={{ 
                title: 'Booking Details',
                headerBackTitle: 'Back'
              }} 
            />
            
            {/* Admin Screens */}
            <Stack.Screen 
              name="admin" 
              options={{ 
                title: 'Admin Panel',
                presentation: 'modal'
              }} 
            />
          </Stack>
          </NavigationProvider>
        {/* </NotificationProvider> DISABLED */}
      </AuthProvider>
    </PaperProvider>
  );
} 