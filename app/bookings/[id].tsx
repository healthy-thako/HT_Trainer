import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Avatar,
  Chip,
  Divider,
  List,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { bookingsApi } from '../../lib/supabase/api';
import { supabase } from '../../lib/supabase/client';
import { Colors } from '../../constants/Colors';
import { TrainerBookingWithDetails } from '../../types';
import { useAppNavigation } from '../../hooks/useNavigation';

export default function BookingDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { trainer } = useAuth();
  const { navigateToChatFromBooking } = useAppNavigation();
  const { id: bookingId } = route.params as { id: string };
  
  const [booking, setBooking] = useState<TrainerBookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const subscriptionRef = useRef<any>(null);

  const statusColors = {
    pending: Colors.warning,
    confirmed: Colors.success,
    completed: Colors.secondary,
    cancelled: Colors.error,
  };

  const statusIcons = {
    pending: 'time-outline',
    confirmed: 'checkmark-circle-outline',
    completed: 'trophy-outline',
    cancelled: 'close-circle-outline',
  };

  useEffect(() => {
    fetchBookingDetails();
    
    // Set up real-time subscription for booking updates
    subscribeToBookingUpdates();

    return () => {
      // Cleanup subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const bookingData = await bookingsApi.getBookingById(bookingId);
      setBooking(bookingData);
      
      navigation.setOptions({
        title: `Session with ${bookingData.user.full_name}`,
      });
    } catch (error) {
      console.error('Error fetching booking details:', error);
      Alert.alert('Error', 'Failed to load booking details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const subscribeToBookingUpdates = () => {
    // Subscribe to real-time updates for this specific booking
    subscriptionRef.current = supabase
      .channel(`booking_${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trainer_bookings',
          filter: `id=eq.${bookingId}`,
        },
        async (payload) => {
          console.log('Booking update received:', payload);
          // Refresh booking details when the booking is updated
          await fetchBookingDetails();
        }
      )
      .subscribe();
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!booking) return;

    const statusActions = {
      confirmed: 'confirm',
      cancelled: 'cancel',
      completed: 'mark as complete',
    };

    Alert.alert(
      `${statusActions[newStatus as keyof typeof statusActions]?.charAt(0).toUpperCase()}${statusActions[newStatus as keyof typeof statusActions]?.slice(1)} Session`,
      `Are you sure you want to ${statusActions[newStatus as keyof typeof statusActions]} this session?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setUpdating(true);
              await bookingsApi.updateBookingStatus(booking.id, newStatus);
              setBooking({ ...booking, status: newStatus as any });
              Alert.alert('Success', `Session ${statusActions[newStatus as keyof typeof statusActions]} successfully`);
            } catch (error) {
              console.error('Error updating booking status:', error);
              Alert.alert('Error', 'Failed to update session status');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleCallClient = () => {
    if (!booking?.user.phone_number) {
      Alert.alert('No Phone Number', 'Client has not provided a phone number');
      return;
    }
    
    const phoneUrl = `tel:${booking.user.phone_number}`;
    Linking.openURL(phoneUrl);
  };

  const handleEmailClient = () => {
    const emailUrl = `mailto:${booking?.user.email}`;
    Linking.openURL(emailUrl);
  };

  const handleMessageClient = async () => {
    try {
      await navigateToChatFromBooking(bookingId);
    } catch (error) {
      console.error('Error navigating to chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTimeUntilSession = () => {
    if (!booking) return '';
    
    const sessionDateTime = new Date(`${booking.session_date}T${booking.session_time}`);
    const now = new Date();
    const timeDiff = sessionDateTime.getTime() - now.getTime();
    
    if (timeDiff < 0) return 'Session has passed';
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''} and ${hours} hour${hours > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
    if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'Starting soon!';
  };

  const getAvailableActions = () => {
    if (!booking) return [];
    
    const actions = [];
    
    if (booking.status === 'pending') {
      actions.push({
        title: 'Confirm Session',
        icon: 'checkmark-circle',
        color: Colors.success,
        onPress: () => handleStatusUpdate('confirmed'),
      });
      actions.push({
        title: 'Cancel Session',
        icon: 'close-circle',
        color: Colors.error,
        onPress: () => handleStatusUpdate('cancelled'),
      });
    } else if (booking.status === 'confirmed') {
      const sessionDateTime = new Date(`${booking.session_date}T${booking.session_time}`);
      const now = new Date();
      
      if (sessionDateTime < now) {
        actions.push({
          title: 'Mark Complete',
          icon: 'trophy',
          color: Colors.secondary,
          onPress: () => handleStatusUpdate('completed'),
        });
      }
    }

    return actions;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading booking details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerContainer}>
        <Text>Booking not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Status Header */}
      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <View style={styles.statusInfo}>
              <Ionicons 
                name={statusIcons[booking.status] as any} 
                size={32} 
                color={statusColors[booking.status]} 
              />
              <View style={styles.statusText}>
                <Title style={styles.statusTitle}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </Title>
                {booking.status === 'confirmed' && (
                  <Paragraph style={styles.timeUntil}>
                    {getTimeUntilSession()}
                  </Paragraph>
                )}
              </View>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: statusColors[booking.status] + '20' }]}
              textStyle={[styles.statusChipText, { color: statusColors[booking.status] }]}
            >
              ${booking.total_amount}
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Client Information */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Client Information</Title>
          
          <View style={styles.clientHeader}>
            <Avatar.Text
              size={60}
              label={booking.user.full_name.split(' ').map(n => n[0]).join('')}
              style={styles.clientAvatar}
            />
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{booking.user.full_name}</Text>
              <Text style={styles.clientEmail}>{booking.user.email}</Text>
              {booking.user.phone_number && (
                <Text style={styles.clientPhone}>{booking.user.phone_number}</Text>
              )}
            </View>
          </View>

          <View style={styles.contactActions}>
            <Button
              mode="outlined"
              icon="call"
              onPress={handleCallClient}
              disabled={!booking.user.phone_number}
              style={styles.contactButton}
            >
              Call
            </Button>
            <Button
              mode="outlined"
              icon="email"
              onPress={handleEmailClient}
              style={styles.contactButton}
            >
              Email
            </Button>
            <Button
              mode="outlined"
              icon="message"
              onPress={handleMessageClient}
              style={styles.contactButton}
            >
              Message
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Session Details */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Session Details</Title>
          
          <List.Item
            title="Date"
            description={formatDate(booking.session_date)}
            left={props => <List.Icon {...props} icon="calendar" />}
          />
          <List.Item
            title="Time"
            description={formatTime(booking.session_time)}
            left={props => <List.Icon {...props} icon="clock" />}
          />
          <List.Item
            title="Duration"
            description={`${booking.duration_minutes} minutes`}
            left={props => <List.Icon {...props} icon="timer" />}
          />
          <List.Item
            title="Amount"
            description={`$${booking.total_amount}`}
            left={props => <List.Icon {...props} icon="cash" />}
          />
          <List.Item
            title="Payment Status"
            description={booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
            left={props => <List.Icon {...props} icon="card" />}
          />
        </Card.Content>
      </Card>

      {/* Notes */}
      {booking.notes && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Notes</Title>
            <View style={styles.notesContainer}>
              <Text style={styles.notesText}>{booking.notes}</Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Actions */}
      {getAvailableActions().length > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Actions</Title>
            <View style={styles.actionsContainer}>
              {getAvailableActions().map((action, index) => (
                <Button
                  key={index}
                  mode="contained"
                  icon={action.icon}
                  onPress={action.onPress}
                  disabled={updating}
                  loading={updating}
                  style={[styles.actionButton, { backgroundColor: action.color }]}
                >
                  {action.title}
                </Button>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Booking History */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Booking History</Title>
          
          <View style={styles.historyItem}>
            <View style={styles.historyDot} />
            <View style={styles.historyContent}>
              <Text style={styles.historyTitle}>Booking Created</Text>
              <Text style={styles.historyTime}>
                {new Date(booking.created_at).toLocaleDateString()} at{' '}
                {new Date(booking.created_at).toLocaleTimeString()}
              </Text>
            </View>
          </View>
          
          {booking.updated_at !== booking.created_at && (
            <View style={styles.historyItem}>
              <View style={styles.historyDot} />
              <View style={styles.historyContent}>
                <Text style={styles.historyTitle}>Last Updated</Text>
                <Text style={styles.historyTime}>
                  {new Date(booking.updated_at).toLocaleDateString()} at{' '}
                  {new Date(booking.updated_at).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    margin: 16,
    marginBottom: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    marginLeft: 16,
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  timeUntil: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  statusChip: {
    marginLeft: 16,
  },
  statusChipText: {
    fontWeight: '600',
  },
  sectionCard: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientAvatar: {
    backgroundColor: Colors.primary,
    marginRight: 16,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    flex: 1,
  },
  notesContainer: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
}); 