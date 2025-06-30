import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Avatar,
  Chip,
  Searchbar,
  FAB,
  SegmentedButtons,
  Surface,
  ActivityIndicator,
  IconButton,
  Menu,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../hooks/useNavigation';
import { bookingsApi } from '../../lib/supabase/api';
import { supabase } from '../../lib/supabase/client';
import { Colors } from '../../constants/Colors';
import { TrainerBookingWithDetails } from '../../types';

type BookingStatus = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

export default function BookingsIndexScreen() {
  const { trainer } = useAuth();
  const navigation = useAppNavigation();
  const [bookings, setBookings] = useState<TrainerBookingWithDetails[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<TrainerBookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus>('all');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    fetchBookings();
    
    if (trainer) {
      subscribeToBookingUpdates();
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [trainer]);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchQuery, statusFilter]);

  const fetchBookings = async () => {
    if (!trainer) return;

    try {
      setLoading(true);
      const bookingsData = await bookingsApi.getTrainerBookings(trainer.id);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const subscribeToBookingUpdates = () => {
    if (!trainer) return;

    // Subscribe to booking updates for real-time data
    subscriptionRef.current = supabase
      .channel(`trainer_bookings_${trainer.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trainer_bookings',
          filter: `trainer_id=eq.${trainer.id}`,
        },
        async (payload) => {
          console.log('Booking update received:', payload);
          await fetchBookings();
        }
      )
      .subscribe();
  };

  const filterBookings = () => {
    let filtered = bookings;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(booking =>
        booking.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by session date and time
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.session_date}T${a.session_time}`);
      const dateB = new Date(`${b.session_date}T${b.session_time}`);
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });

    setFilteredBookings(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleBookingPress = (bookingId: string) => {
    navigation.navigateToBookingDetail(bookingId);
  };

  const handleNewBooking = () => {
    // Navigate to client selection for new booking
    navigation.navigateToClients();
  };

  const handleBookingAction = async (bookingId: string, action: 'confirm' | 'cancel' | 'complete') => {
    try {
      let newStatus: TrainerBookingWithDetails['status'];
      let message: string;

      switch (action) {
        case 'confirm':
          newStatus = 'confirmed';
          message = 'Booking confirmed successfully';
          break;
        case 'cancel':
          newStatus = 'cancelled';
          message = 'Booking cancelled successfully';
          break;
        case 'complete':
          newStatus = 'completed';
          message = 'Session marked as completed';
          break;
      }

      await bookingsApi.updateBookingStatus(bookingId, newStatus);
      Alert.alert('Success', message);
      await fetchBookings();
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
      Alert.alert('Error', `Failed to ${action} booking`);
    }
    setMenuVisible(null);
  };

  const handleChatWithClient = async (clientId: string) => {
    try {
      await navigation.getOrCreateConversationForClient(clientId);
    } catch (error) {
      Alert.alert('Error', 'Failed to open chat with client');
    }
  };

  const formatSessionDateTime = (date: string, time: string) => {
    const sessionDate = new Date(`${date}T${time}`);
    const now = new Date();
    const isToday = sessionDate.toDateString() === now.toDateString();
    const isTomorrow = sessionDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

    let dateStr;
    if (isToday) {
      dateStr = 'Today';
    } else if (isTomorrow) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = sessionDate.toLocaleDateString();
    }

    const timeStr = sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} at ${timeStr}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return Colors.warning;
      case 'confirmed':
        return Colors.success;
      case 'completed':
        return Colors.info;
      case 'cancelled':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'clock-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'completed':
        return 'trophy-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const renderBooking = ({ item }: { item: TrainerBookingWithDetails }) => {
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);
    const sessionDateTime = new Date(`${item.session_date}T${item.session_time}`);
    const isPastSession = sessionDateTime < new Date();

    return (
      <TouchableOpacity onPress={() => handleBookingPress(item.id)}>
        <Card style={styles.bookingCard}>
          <Card.Content style={styles.bookingContent}>
            <View style={styles.bookingHeader}>
              <Avatar.Text
                size={50}
                label={item.user.full_name.split(' ').map(n => n[0]).join('')}
                style={styles.avatar}
              />
              <View style={styles.bookingInfo}>
                <Text style={styles.clientName}>{item.user.full_name}</Text>
                <Text style={styles.sessionTime}>
                  {formatSessionDateTime(item.session_date, item.session_time)}
                </Text>
                <Text style={styles.sessionDetails}>
                  {item.duration_minutes} min • ${item.total_amount}
                </Text>
                {item.notes && (
                  <Text style={styles.notes} numberOfLines={2}>
                    {item.notes}
                  </Text>
                )}
              </View>
              
              <View style={styles.bookingActions}>
                <Chip
                  icon={statusIcon}
                  style={[styles.statusChip, { backgroundColor: statusColor + '20' }]}
                  textStyle={[styles.statusText, { color: statusColor }]}
                  compact
                >
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Chip>
                
                <View style={styles.actionButtons}>
                  <IconButton
                    icon="chatbubble-outline"
                    size={20}
                    onPress={() => handleChatWithClient(item.user.id)}
                    iconColor={Colors.primary}
                  />
                  
                  <Menu
                    visible={menuVisible === item.id}
                    onDismiss={() => setMenuVisible(null)}
                    anchor={
                      <IconButton
                        icon="ellipsis-vertical"
                        size={20}
                        onPress={() => setMenuVisible(item.id)}
                        iconColor={Colors.textSecondary}
                      />
                    }
                  >
                    {item.status === 'pending' && (
                      <>
                        <Menu.Item
                          onPress={() => handleBookingAction(item.id, 'confirm')}
                          title="Confirm Booking"
                          leadingIcon="checkmark-circle-outline"
                        />
                        <Menu.Item
                          onPress={() => handleBookingAction(item.id, 'cancel')}
                          title="Cancel Booking"
                          leadingIcon="close-circle-outline"
                        />
                      </>
                    )}
                    {item.status === 'confirmed' && !isPastSession && (
                      <Menu.Item
                        onPress={() => handleBookingAction(item.id, 'cancel')}
                        title="Cancel Booking"
                        leadingIcon="close-circle-outline"
                      />
                    )}
                    {item.status === 'confirmed' && isPastSession && (
                      <Menu.Item
                        onPress={() => handleBookingAction(item.id, 'complete')}
                        title="Mark Complete"
                        leadingIcon="trophy-outline"
                      />
                    )}
                    <Divider />
                    <Menu.Item
                      onPress={() => handleBookingPress(item.id)}
                      title="View Details"
                      leadingIcon="eye-outline"
                    />
                  </Menu>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>
        {statusFilter === 'all' ? 'No bookings yet' : `No ${statusFilter} bookings`}
      </Text>
      <Text style={styles.emptySubtitle}>
        {statusFilter === 'all' 
          ? 'Your client bookings will appear here'
          : `You don't have any ${statusFilter} bookings at the moment`
        }
      </Text>
    </View>
  );

  const getBookingCounts = () => {
    return {
      all: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const counts = getBookingCounts();

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search bookings..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as BookingStatus)}
          buttons={[
            { value: 'all', label: `All (${counts.all})` },
            { value: 'pending', label: `Pending (${counts.pending})` },
            { value: 'confirmed', label: `Confirmed (${counts.confirmed})` },
            { value: 'completed', label: `Completed (${counts.completed})` },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* New Booking FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleNewBooking}
        label="New Booking"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    elevation: 2,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  segmentedButtons: {
    backgroundColor: Colors.surface,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
    flexGrow: 1,
  },
  bookingCard: {
    marginBottom: 12,
    elevation: 2,
  },
  bookingContent: {
    padding: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    backgroundColor: Colors.primary,
  },
  bookingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  sessionDetails: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  notes: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  bookingActions: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  statusChip: {
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
  },
}); 