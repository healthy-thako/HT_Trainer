import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import DashboardScreen from './dashboard';
import BookingsScreen from './bookings';
import ChatListScreen from './chat';
import ProfileScreen from './profile';
import AdminScreen from './admin';

const Tab = createBottomTabNavigator();

export default function TabsLayout() {
  const { user } = useAuth();
  
  // Check if user is admin
  const isAdmin = user?.email === 'admin@healthythako.com' || user?.email?.includes('admin');

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'bookings':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'chat':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'admin':
              iconName = focused ? 'shield' : 'shield-outline';
              break;
            default:
              iconName = 'grid-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.separator,
          height: 90,
          paddingBottom: 25,
          paddingTop: 10,
        },
        headerStyle: {
          backgroundColor: Colors.surface,
          shadowColor: Colors.separator,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 4,
        },
        headerTitleStyle: {
          fontWeight: '600',
          color: Colors.text,
        },
      })}
    >
      <Tab.Screen 
        name="dashboard" 
        component={DashboardScreen}
        options={{ 
          title: 'Dashboard',
          headerTitle: 'Dashboard'
        }}
      />
      <Tab.Screen 
        name="bookings" 
        component={BookingsScreen}
        options={{ 
          title: 'Bookings',
          headerTitle: 'My Bookings'
        }}
      />
      <Tab.Screen 
        name="chat" 
        component={ChatListScreen}
        options={{ 
          title: 'Chat',
          headerTitle: 'Messages'
        }}
      />
      <Tab.Screen 
        name="profile" 
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          headerTitle: 'My Profile'
        }}
      />
      {isAdmin && (
        <Tab.Screen 
          name="admin" 
          component={AdminScreen}
          options={{ 
            title: 'Admin',
            headerTitle: 'Admin Panel'
          }}
        />
      )}
    </Tab.Navigator>
  );
} 