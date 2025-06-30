import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAppNavigation } from '../../hooks/useNavigation';

interface ChatButtonProps {
  bookingId: string;
  variant?: 'text' | 'contained' | 'outlined';
  compact?: boolean;
  disabled?: boolean;
}

export function ChatFromBookingButton({ 
  bookingId, 
  variant = 'text', 
  compact = true,
  disabled = false 
}: ChatButtonProps) {
  const { navigateToChatFromBooking } = useAppNavigation();

  const handlePress = () => {
    navigateToChatFromBooking(bookingId);
  };

  return (
    <Button
      mode={variant}
      compact={compact}
      onPress={handlePress}
      icon="message"
      disabled={disabled}
      style={styles.button}
    >
      Message
    </Button>
  );
}

interface BookingButtonProps {
  conversationId: string;
  variant?: 'text' | 'contained' | 'outlined';
  compact?: boolean;
  disabled?: boolean;
}

export function BookingFromChatButton({ 
  conversationId, 
  variant = 'text', 
  compact = true,
  disabled = false 
}: BookingButtonProps) {
  const { navigateToBookingFromChat } = useAppNavigation();

  const handlePress = () => {
    navigateToBookingFromChat(conversationId);
  };

  return (
    <Button
      mode={variant}
      compact={compact}
      onPress={handlePress}
      icon="calendar"
      disabled={disabled}
      style={styles.button}
    >
      View Booking
    </Button>
  );
}

interface BackButtonProps {
  onPress?: () => void;
  disabled?: boolean;
}

export function BackButton({ onPress, disabled = false }: BackButtonProps) {
  const { goBack, canGoBack } = useAppNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (canGoBack()) {
      goBack();
    }
  };

  return (
    <IconButton
      icon="arrow-left"
      size={24}
      onPress={handlePress}
      disabled={disabled || (!onPress && !canGoBack())}
      iconColor={Colors.primary}
    />
  );
}

interface TabNavigationButtonsProps {
  currentTab?: string;
  style?: any;
}

export function TabNavigationButtons({ currentTab, style }: TabNavigationButtonsProps) {
  const { 
    navigateToDashboard, 
    navigateToBookings, 
    navigateToChat, 
    navigateToProfile 
  } = useAppNavigation();

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid', onPress: navigateToDashboard },
    { key: 'bookings', label: 'Bookings', icon: 'calendar', onPress: navigateToBookings },
    { key: 'chat', label: 'Chat', icon: 'chatbubbles', onPress: navigateToChat },
    { key: 'profile', label: 'Profile', icon: 'person', onPress: navigateToProfile },
  ];

  return (
    <View style={[styles.tabContainer, style]}>
      {tabs.map((tab) => (
        <IconButton
          key={tab.key}
          icon={tab.icon as any}
          size={24}
          onPress={tab.onPress}
          iconColor={currentTab === tab.key ? Colors.primary : Colors.textSecondary}
          style={[
            styles.tabButton,
            currentTab === tab.key && styles.activeTabButton
          ]}
        />
      ))}
    </View>
  );
}

interface QuickActionButtonsProps {
  bookingId?: string;
  conversationId?: string;
  style?: any;
}

export function QuickActionButtons({ 
  bookingId, 
  conversationId, 
  style 
}: QuickActionButtonsProps) {
  return (
    <View style={[styles.actionContainer, style]}>
      {bookingId && (
        <ChatFromBookingButton 
          bookingId={bookingId} 
          variant="outlined"
          compact={false}
        />
      )}
      {conversationId && (
        <BookingFromChatButton 
          conversationId={conversationId} 
          variant="outlined"
          compact={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
  },
  tabButton: {
    flex: 1,
  },
  activeTabButton: {
    backgroundColor: Colors.primary + '10',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
}); 