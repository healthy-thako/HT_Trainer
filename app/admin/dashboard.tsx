import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Avatar,
  Chip,
  List,
  Searchbar,
  SegmentedButtons,
  DataTable,
  IconButton,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase/client';
import { Colors } from '../../constants/Colors';

interface AdminStats {
  totalTrainers: number;
  activeTrainers: number;
  totalBookings: number;
  totalRevenue: number;
  pendingBookings: number;
  completedSessions: number;
  averageRating: number;
  totalUsers: number;
  monthlyGrowth: number;
  activeConversations: number;
}

interface TrainerData {
  id: string;
  name: string;
  email: string;
  specialty: string;
  rating: number;
  total_bookings: number;
  total_earnings: number;
  is_available: boolean;
  created_at: string;
  last_active: string;
}

interface BookingData {
  id: string;
  trainer_name: string;
  user_name: string;
  session_date: string;
  session_time: string;
  status: string;
  total_amount: number;
  created_at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [trainers, setTrainers] = useState<TrainerData[]>([]);
  const [recentBookings, setRecentBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Check if user is admin
  const isAdmin = user?.email === 'admin@healthythako.com' || user?.email?.includes('admin');

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAdminStats(),
        fetchTrainersData(),
        fetchRecentBookings(),
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      Alert.alert('Error', 'Failed to load admin data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      // Fetch trainer stats
      const { data: trainersData, error: trainersError } = await supabase
        .from('trainers')
        .select('*');

      if (trainersError) throw trainersError;

      // Fetch bookings stats
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('trainer_bookings')
        .select('*');

      if (bookingsError) throw bookingsError;

      // Fetch users stats
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;

      // Fetch conversations stats
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('status', 'active');

      if (conversationsError) throw conversationsError;

      // Calculate stats
      const totalTrainers = trainersData?.length || 0;
      const activeTrainers = trainersData?.filter(t => t.is_available).length || 0;
      const totalBookings = bookingsData?.length || 0;
      const totalRevenue = bookingsData?.filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + b.total_amount, 0) || 0;
      const pendingBookings = bookingsData?.filter(b => b.status === 'pending').length || 0;
      const completedSessions = bookingsData?.filter(b => b.status === 'completed').length || 0;
      
      // Calculate average rating
      const { data: reviewsData } = await supabase
        .from('trainer_reviews')
        .select('rating');
      
      const averageRating = reviewsData && reviewsData.length > 0
        ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
        : 0;

      // Calculate monthly growth
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const currentMonthBookings = bookingsData?.filter(b => {
        const bookingDate = new Date(b.created_at);
        return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
      }).length || 0;

      const lastMonthBookings = bookingsData?.filter(b => {
        const bookingDate = new Date(b.created_at);
        return bookingDate.getMonth() === lastMonth && bookingDate.getFullYear() === lastMonthYear;
      }).length || 0;

      const monthlyGrowth = lastMonthBookings > 0 
        ? ((currentMonthBookings - lastMonthBookings) / lastMonthBookings) * 100 
        : 0;

      setStats({
        totalTrainers,
        activeTrainers,
        totalBookings,
        totalRevenue,
        pendingBookings,
        completedSessions,
        averageRating: Math.round(averageRating * 100) / 100,
        totalUsers: usersData?.length || 0,
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
        activeConversations: conversationsData?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      throw error;
    }
  };

  const fetchTrainersData = async () => {
    try {
      const { data, error } = await supabase
        .from('trainers')
        .select(`
          *,
          user:user_id (
            email,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get additional stats for each trainer
      const trainersWithStats = await Promise.all(
        (data || []).map(async (trainer) => {
          // Get booking count and earnings
          const { data: bookings } = await supabase
            .from('trainer_bookings')
            .select('total_amount, status')
            .eq('trainer_id', trainer.id);

          const totalBookings = bookings?.length || 0;
          const totalEarnings = bookings?.filter(b => b.status === 'completed')
            .reduce((sum, b) => sum + b.total_amount, 0) || 0;

          return {
            id: trainer.id,
            name: trainer.name,
            email: trainer.user?.email || '',
            specialty: trainer.specialty || 'Not specified',
            rating: trainer.rating || 0,
            total_bookings: totalBookings,
            total_earnings: totalEarnings,
            is_available: trainer.is_available,
            created_at: trainer.created_at,
            last_active: trainer.updated_at || trainer.created_at,
          };
        })
      );

      setTrainers(trainersWithStats);
    } catch (error) {
      console.error('Error fetching trainers data:', error);
      throw error;
    }
  };

  const fetchRecentBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('trainer_bookings')
        .select(`
          *,
          trainer:trainer_id (
            name
          ),
          user:user_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const bookingsData = (data || []).map(booking => ({
        id: booking.id,
        trainer_name: booking.trainer?.name || 'Unknown',
        user_name: booking.user?.full_name || 'Unknown',
        session_date: booking.session_date,
        session_time: booking.session_time,
        status: booking.status,
        total_amount: booking.total_amount,
        created_at: booking.created_at,
      }));

      setRecentBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching recent bookings:', error);
      throw error;
    }
  };

  // Admin action functions
  const handleTrainerAction = async (trainerId: string, action: 'activate' | 'deactivate' | 'delete') => {
    try {
      switch (action) {
        case 'activate':
          await supabase
            .from('trainers')
            .update({ status: 'active' })
            .eq('id', trainerId);
          Alert.alert('Success', 'Trainer activated successfully');
          break;
        
        case 'deactivate':
          await supabase
            .from('trainers')
            .update({ status: 'inactive' })
            .eq('id', trainerId);
          Alert.alert('Success', 'Trainer deactivated successfully');
          break;
        
        case 'delete':
          Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this trainer? This action cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await supabase
                    .from('trainers')
                    .delete()
                    .eq('id', trainerId);
                  Alert.alert('Success', 'Trainer deleted successfully');
                  await fetchAdminData();
                }
              }
            ]
          );
          return;
      }
      
      await fetchAdminData();
    } catch (error) {
      console.error(`Error ${action}ing trainer:`, error);
      Alert.alert('Error', `Failed to ${action} trainer`);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredTrainers = trainers.filter(trainer =>
    trainer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trainer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trainer.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const StatCard = ({ title, value, icon, color = Colors.primary }: {
    title: string;
    value: string | number;
    icon: string;
    color?: string;
  }) => (
    <Card style={styles.statCard}>
      <Card.Content style={styles.statContent}>
        <View style={styles.statHeader}>
          <Ionicons name={icon as any} size={24} color={color} />
          <Text style={[styles.statValue, { color }]}>{value}</Text>
        </View>
        <Text style={styles.statTitle}>{title}</Text>
      </Card.Content>
    </Card>
  );

  if (!isAdmin) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="lock-closed" size={48} color={Colors.textTertiary} />
        <Text style={styles.accessDeniedText}>Access Denied</Text>
        <Text style={styles.accessDeniedSubtext}>
          You need administrator privileges to view this content
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading admin dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.header}>
            <View>
              <Title style={styles.headerTitle}>Admin Dashboard</Title>
              <Paragraph style={styles.headerSubtitle}>
                Healthy Thako Trainer Platform
              </Paragraph>
            </View>
            <Avatar.Icon
              size={50}
              icon="shield-check"
              style={{ backgroundColor: Colors.primary }}
            />
          </View>
        </Card.Content>
      </Card>

      {/* View Selector */}
      <View style={styles.viewSelector}>
        <SegmentedButtons
          value={activeView}
          onValueChange={setActiveView}
          buttons={[
            { value: 'overview', label: 'Overview' },
            { value: 'trainers', label: 'Trainers' },
            { value: 'bookings', label: 'Bookings' },
          ]}
        />
      </View>

      {activeView === 'overview' && (
        <>
          {/* Key Metrics */}
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats?.totalRevenue || 0)}
              icon="cash"
              color={Colors.success}
            />
            <StatCard
              title="Active Trainers"
              value={`${stats?.activeTrainers}/${stats?.totalTrainers}`}
              icon="people"
              color={Colors.primary}
            />
            <StatCard
              title="Total Users"
              value={stats?.totalUsers || 0}
              icon="person"
              color={Colors.info}
            />
            <StatCard
              title="Pending Bookings"
              value={stats?.pendingBookings || 0}
              icon="time"
              color={Colors.warning}
            />
            <StatCard
              title="Completed Sessions"
              value={stats?.completedSessions || 0}
              icon="checkmark-circle"
              color={Colors.success}
            />
            <StatCard
              title="Average Rating"
              value={stats?.averageRating || 0}
              icon="star"
              color={Colors.warning}
            />
            <StatCard
              title="Active Chats"
              value={stats?.activeConversations || 0}
              icon="chatbubbles"
              color={Colors.secondary}
            />
            <StatCard
              title="Monthly Growth"
              value={`${stats?.monthlyGrowth || 0}%`}
              icon="trending-up"
              color={stats?.monthlyGrowth && stats.monthlyGrowth > 0 ? Colors.success : Colors.error}
            />
          </View>

          {/* Quick Actions */}
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Title>Quick Actions</Title>
              <View style={styles.quickActions}>
                <Button
                  mode="contained"
                  icon="people"
                  onPress={() => setActiveView('trainers')}
                  style={styles.actionButton}
                >
                  Manage Trainers
                </Button>
                <Button
                  mode="outlined"
                  icon="calendar"
                  onPress={() => setActiveView('bookings')}
                  style={styles.actionButton}
                >
                  View Bookings
                </Button>
              </View>
            </Card.Content>
          </Card>
        </>
      )}

      {activeView === 'trainers' && (
        <>
          {/* Search */}
          <View style={styles.searchContainer}>
            <Searchbar
              placeholder="Search trainers..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
            />
          </View>

          {/* Trainers List */}
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Title>Trainers ({filteredTrainers.length})</Title>
              
              {filteredTrainers.map((trainer) => (
                <List.Item
                  key={trainer.id}
                  title={trainer.name}
                  description={`${trainer.specialty} • ${trainer.total_bookings} bookings • ${formatCurrency(trainer.total_earnings)} earned`}
                  left={() => (
                    <Avatar.Text
                      size={40}
                      label={trainer.name.split(' ').map(n => n[0]).join('')}
                      style={{ backgroundColor: trainer.is_available ? Colors.success : Colors.textTertiary }}
                    />
                  )}
                  right={() => (
                    <View style={styles.trainerActions}>
                      <Chip
                        style={[
                          styles.statusChip,
                          { backgroundColor: trainer.is_available ? Colors.success + '20' : Colors.textTertiary + '20' }
                        ]}
                        textStyle={{ color: trainer.is_available ? Colors.success : Colors.textTertiary }}
                      >
                        {trainer.is_available ? 'Available' : 'Offline'}
                      </Chip>
                      <IconButton
                        icon={trainer.is_available ? "pause" : "play"}
                        size={20}
                        onPress={() => handleTrainerAction(trainer.id, trainer.is_available ? 'deactivate' : 'activate')}
                      />
                      <IconButton
                        icon="delete"
                        size={20}
                        iconColor={Colors.error}
                        onPress={() => handleTrainerAction(trainer.id, 'delete')}
                      />
                    </View>
                  )}
                  style={styles.trainerItem}
                />
              ))}
            </Card.Content>
          </Card>
        </>
      )}

      {activeView === 'bookings' && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title>Recent Bookings ({recentBookings.length})</Title>
            
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Client</DataTable.Title>
                <DataTable.Title>Trainer</DataTable.Title>
                <DataTable.Title>Date</DataTable.Title>
                <DataTable.Title numeric>Amount</DataTable.Title>
                <DataTable.Title>Status</DataTable.Title>
              </DataTable.Header>

              {recentBookings.slice(0, 10).map((booking) => (
                <DataTable.Row key={booking.id}>
                  <DataTable.Cell>{booking.user_name}</DataTable.Cell>
                  <DataTable.Cell>{booking.trainer_name}</DataTable.Cell>
                  <DataTable.Cell>{formatDate(booking.session_date)}</DataTable.Cell>
                  <DataTable.Cell numeric>{formatCurrency(booking.total_amount)}</DataTable.Cell>
                  <DataTable.Cell>
                    <Chip
                      style={[
                        styles.statusChip,
                        { backgroundColor: Colors.textTertiary + '20' }
                      ]}
                      textStyle={{ 
                        color: Colors.textTertiary,
                        fontSize: 10
                      }}
                    >
                      {booking.status}
                    </Chip>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </Card.Content>
        </Card>
      )}
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
    padding: 32,
  },
  accessDeniedText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  accessDeniedSubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: Colors.textSecondary,
  },
  viewSelector: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    marginBottom: 8,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sectionCard: {
    margin: 16,
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    marginHorizontal: 4,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    backgroundColor: Colors.surface,
  },
  trainerItem: {
    paddingVertical: 8,
  },
  trainerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusChip: {
    marginRight: 8,
  },
}); 