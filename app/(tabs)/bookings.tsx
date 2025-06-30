import React, { useEffect, useState, useCallback } from 'react';
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
  Title,
  Paragraph,
  Button,
  Avatar,
  Chip,
  Searchbar,
  Menu,
  Divider,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { bookingsApi } from '../../lib/supabase/api';
import { Colors } from '../../constants/Colors';
import { TrainerBookingWithDetails } from '../../types';
import { useAppNavigation } from '../../hooks/useNavigation';
import { ChatFromBookingButton } from '../../components/navigation/NavigationButtons';

export default function BookingsScreen() {
  const { trainer } = useAuth();
  const { navigateToBookingDetail } = useAppNavigation();
  const [bookings, setBookings] = useState<TrainerBookingWithDetails[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<TrainerBookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const statusColors = {
    pending: Colors.warning,
    confirmed: Colors.success,
    completed: Colors.secondary,
    cancelled: Colors.error,
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [trainer])
  );

  const fetchBookings = async () => {
    if (!trainer) return;

    try {
      setLoading(true);
      const bookingsData = await bookingsApi.getTrainerBookings(trainer.id);
      setBookings(bookingsData);
      filterBookings(bookingsData, selectedFilter, searchQuery);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const filterBookings = (
    bookingsList: TrainerBookingWithDetails[],
    filter: string,
    query: string
  ) => {
    let filtered = bookingsList;

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(booking => booking.status === filter);
    }

    // Apply search query
    if (query) {
      filtered = filtered.filter(booking =>
        booking.user.full_name.toLowerCase().includes(query.toLowerCase()) ||
        booking.user.email.toLowerCase().includes(query.toLowerCase())
      );
    }

    setFilteredBookings(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterBookings(bookings, selectedFilter, query);
  };

  const handleFilterSelect = (filter: string) => {
    setSelectedFilter(filter);
    setFilterMenuVisible(false);
    filterBookings(bookings, filter, searchQuery);
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      await bookingsApi.updateBookingStatus(bookingId, newStatus);
      fetchBookings(); // Refresh the list
      Alert.alert('Success', `Booking ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Failed to update booking status');
    }
  };

  const handleViewBooking = (bookingId: string) => {
    navigateToBookingDetail(bookingId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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

  const getFilterText = (filter: string) => {
    switch (filter) {
      case 'all': return 'All Bookings';
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'All Bookings';
    }
  };

  const getStatusActions = (booking: TrainerBookingWithDetails) => {
    const actions = [];
    
    if (booking.status === 'pending') {
      actions.push(
        <Button
          key="confirm"
          mode="contained"
          compact
          onPress={() => handleStatusUpdate(booking.id, 'confirmed')}
          style={[styles.actionButton, { backgroundColor: Colors.success }]}
        >
          Confirm
        </Button>
      );
      actions.push(
        <Button
          key="cancel"
          mode="outlined"
          compact
          onPress={() => handleStatusUpdate(booking.id, 'cancelled')}
          style={styles.actionButton}
        >
          Cancel
        </Button>
      );
    } else if (booking.status === 'confirmed') {
      const sessionDateTime = new Date(`${booking.session_date}T${booking.session_time}`);
      const now = new Date();
      
      if (sessionDateTime < now) {
        actions.push(
          <Button
            key="complete"
            mode="contained"
            compact
            onPress={() => handleStatusUpdate(booking.id, 'completed')}
            style={[styles.actionButton, { backgroundColor: Colors.secondary }]}
          >
            Mark Complete
          </Button>
        );
      }
    }

    return actions;
  };

  const renderBookingItem = ({ item }: { item: TrainerBookingWithDetails }) => (
    <TouchableOpacity onPress={() => handleViewBooking(item.id)}>
      <Card style={styles.bookingCard}>
        <Card.Content>
          <View style={styles.bookingHeader}>
            <View style={styles.clientInfo}>
              <Avatar.Text
                size={48}
                label={item.user.full_name.split(' ').map(n => n[0]).join('')}
                style={[styles.avatar, { backgroundColor: Colors.primary }]}
              />
              <View style={styles.clientDetails}>
                <Text style={styles.clientName}>{item.user.full_name}</Text>
                <Text style={styles.clientEmail}>{item.user.email}</Text>
                {item.user.phone_number && (
                  <Text style={styles.clientPhone}>{item.user.phone_number}</Text>
                )}
              </View>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: statusColors[item.status] + '20' }]}
              textStyle={[styles.statusText, { color: statusColors[item.status] }]}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Chip>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.sessionDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>
                {formatDate(item.session_date)} at {formatTime(item.session_time)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{item.duration_minutes} minutes</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="cash" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>${item.total_amount}</Text>
            </View>
          </View>

          {item.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}

          <View style={styles.actionSection}>
            {getStatusActions(item)}
            <ChatFromBookingButton 
              bookingId={item.id}
              variant="text"
              compact={true}
            />
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const filterOptions = [
    { label: 'All Bookings', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <View style={styles.container}>
      {/* Search and Filter */}
      <View style={styles.searchSection}>
        <Searchbar
          placeholder="Search clients..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
        />
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setFilterMenuVisible(true)}
            >
              <Text style={styles.filterText}>{getFilterText(selectedFilter)}</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          }
        >
          {filterOptions.map(option => (
            <Menu.Item
              key={option.value}
              onPress={() => handleFilterSelect(option.value)}
              title={option.label}
            />
          ))}
        </Menu>
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        renderItem={renderBookingItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No bookings found</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'all' 
                ? 'Your client bookings will appear here'
                : `No ${selectedFilter} bookings at the moment`
              }
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  filterText: {
    color: Colors.text,
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  bookingCard: {
    marginBottom: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  clientInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    marginRight: 12,
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  clientEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  clientPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusChip: {
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    marginVertical: 16,
  },
  sessionDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  notesSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  actionSection: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
}); 