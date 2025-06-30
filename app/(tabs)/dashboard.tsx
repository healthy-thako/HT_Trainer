import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
  Divider,
  Surface,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../hooks/useNavigation';
import { trainerApi, bookingsApi } from '../../lib/supabase/api';
import { supabase } from '../../lib/supabase/client';
import { Colors } from '../../constants/Colors';
import { GradientBackground, GradientCard, GradientButton } from '../../components/ui/GradientBackground';
import {
  TrainerStats,
  TrainerBookingWithDetails,
} from '../../types';

export default function DashboardScreen() {
  const { trainer, user } = useAuth();
  const navigation = useAppNavigation();
  const [stats, setStats] = useState<TrainerStats | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<TrainerBookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    fetchDashboardData();
    
    if (trainer) {
      // Set up real-time subscriptions
      subscribeToRealTimeUpdates();
    }

    return () => {
      // Cleanup subscriptions
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [trainer]);

  const fetchDashboardData = async () => {
    if (!trainer) return;

    try {
      const [statsData, bookingsData] = await Promise.all([
        trainerApi.getTrainerStats(trainer.id),
        bookingsApi.getTrainerBookings(trainer.id, {
          status: 'confirmed',
          from_date: new Date().toISOString().split('T')[0],
        }),
      ]);

      setStats(statsData);
      setUpcomingBookings(bookingsData.slice(0, 3)); // Show only next 3 bookings
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const subscribeToRealTimeUpdates = () => {
    if (!trainer) return;

    // Subscribe to booking changes for real-time updates
    subscriptionRef.current = supabase
      .channel(`trainer_dashboard_${trainer.id}`)
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
          // Refresh dashboard data when bookings change
          await fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trainer_earnings',
          filter: `trainer_id=eq.${trainer.id}`,
        },
        async (payload) => {
          console.log('Earnings update received:', payload);
          // Refresh stats when earnings change
          await fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trainer_reviews',
          filter: `trainer_id=eq.${trainer.id}`,
        },
        async (payload) => {
          console.log('Review update received:', payload);
          // Refresh stats when reviews change
          await fetchDashboardData();
        }
      )
      .subscribe();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const getTimeUntilSession = (sessionDate: string, sessionTime: string) => {
    const sessionDateTime = new Date(`${sessionDate}T${sessionTime}`);
    const now = new Date();
    const timeDiff = sessionDateTime.getTime() - now.getTime();
    
    if (timeDiff < 0) return 'Past';
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `in ${days}d ${hours}h`;
    if (hours > 0) return `in ${hours}h`;
    return 'Soon';
  };

  const handleBookingPress = (bookingId: string) => {
    navigation.navigateToBookingDetail(bookingId);
  };

  const handleChatWithClient = async (clientId: string) => {
    try {
      await navigation.getOrCreateConversationForClient(clientId);
    } catch (error) {
      Alert.alert('Error', 'Failed to open chat with client');
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color = Colors.primary,
    subtitle,
    onPress,
    useGradient = false
  }: {
    title: string;
    value: string | number;
    icon: string;
    color?: string;
    subtitle?: string;
    onPress?: () => void;
    useGradient?: boolean;
  }) => {
    const CardComponent = useGradient ? GradientCard : Card;
    const cardStyle = useGradient ? styles.gradientStatCard : styles.statCard;
    const textColor = useGradient ? Colors.white : Colors.text;
    const subtitleColor = useGradient ? Colors.white : Colors.textSecondary;

    return (
      <TouchableOpacity onPress={onPress} disabled={!onPress} style={styles.statCardContainer}>
        <CardComponent style={cardStyle}>
          <View style={styles.statContent}>
            <View style={styles.statHeader}>
              <View style={[styles.iconContainer, { backgroundColor: useGradient ? 'rgba(255,255,255,0.2)' : `${color}15` }]}>
                <Ionicons name={icon as any} size={24} color={useGradient ? Colors.white : color} />
              </View>
              <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
            </View>
            <Text style={[styles.statTitle, { color: textColor }]}>{title}</Text>
            {subtitle && <Text style={[styles.statSubtitle, { color: subtitleColor }]}>{subtitle}</Text>}
          </View>
        </CardComponent>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.centerContainer}>
          <Text style={[styles.loadingText, { color: Colors.white }]}>Loading dashboard...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={Colors.white}
            colors={[Colors.white]}
          />
        }
      >
        {/* Welcome Header */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeHeader}>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>
                Welcome back, {trainer?.name}!
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Here's your training overview
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigateToProfile()}>
              <Avatar.Image
                size={60}
                source={
                  trainer?.image_url
                    ? { uri: trainer.image_url }
                    : require('../../assets/icon.png')
                }
                style={styles.profileAvatar}
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.statusRow}>
            <View style={styles.statusChip}>
              <Ionicons name="star" size={16} color={Colors.warning} />
              <Text style={styles.statusText}>
                {stats?.average_rating.toFixed(1) || '0.0'} Rating
              </Text>
            </View>
            <View style={styles.statusChip}>
              <Ionicons name="trophy" size={16} color={Colors.success} />
              <Text style={styles.statusText}>
                {stats?.completed_sessions || 0} Sessions
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Earnings"
            value={formatCurrency(stats?.total_earnings || 0)}
            icon="cash"
            color={Colors.success}
            onPress={() => navigation.navigateToEarnings()}
            useGradient={true}
          />
          <StatCard
            title="This Month"
            value={stats?.total_bookings || 0}
            icon="calendar"
            color={Colors.primary}
            subtitle="bookings"
            onPress={() => navigation.navigateToBookings()}
          />
          <StatCard
            title="Active Chats"
            value={stats?.active_conversations || 0}
            icon="chatbubbles"
            color={Colors.info}
            onPress={() => navigation.navigateToChat()}
          />
          <StatCard
            title="Reviews"
            value={stats?.total_reviews || 0}
            icon="star"
            color={Colors.warning}
            onPress={() => navigation.navigateToAnalytics()}
          />
        </View>

        {/* Upcoming Sessions */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Upcoming Sessions</Title>
              <Button 
                mode="text" 
                onPress={() => navigation.navigateToBookings()}
                textColor={Colors.primary}
              >
                View All
              </Button>
            </View>
            
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking, index) => (
                <View key={booking.id}>
                  <TouchableOpacity 
                    style={styles.bookingItem}
                    onPress={() => handleBookingPress(booking.id)}
                  >
                    <Avatar.Text
                      size={48}
                      label={booking.user.full_name.split(' ').map(n => n[0]).join('')}
                      style={styles.userAvatar}
                      labelStyle={styles.avatarLabel}
                    />
                    <View style={styles.bookingInfo}>
                      <Text style={styles.clientName}>{booking.user.full_name}</Text>
                      <Text style={styles.bookingTime}>
                        {new Date(booking.session_date).toLocaleDateString()} at {booking.session_time}
                      </Text>
                      <Text style={styles.bookingDuration}>
                        {booking.duration_minutes} min • {formatCurrency(booking.total_amount)}
                      </Text>
                    </View>
                    <View style={styles.bookingActions}>
                      <Text style={styles.timeUntil}>
                        {getTimeUntilSession(booking.session_date, booking.session_time)}
                      </Text>
                      <TouchableOpacity 
                        style={styles.chatButton}
                        onPress={() => handleChatWithClient(booking.user.id)}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                  {index < upcomingBookings.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>No upcoming sessions</Text>
                <Text style={styles.emptySubtext}>
                  Your confirmed bookings will appear here
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Quick Actions</Title>
            <View style={styles.actionButtons}>
              <GradientButton
                onPress={() => navigation.navigateToAvailability()}
                style={styles.actionButton}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="calendar" size={20} color={Colors.white} />
                  <Text style={styles.buttonText}>Set Availability</Text>
                </View>
              </GradientButton>
              <Button
                mode="outlined"
                icon="chart-line"
                onPress={() => navigation.navigateToAnalytics()}
                style={[styles.actionButton, styles.outlinedButton]}
                textColor={Colors.primary}
              >
                Analytics
              </Button>
            </View>
            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                icon="account-group"
                onPress={() => navigation.navigateToClients()}
                style={[styles.actionButton, styles.outlinedButton]}
                textColor={Colors.primary}
              >
                Clients
              </Button>
              <Button
                mode="outlined"
                icon="nutrition"
                onPress={() => navigation.navigateToNutrition()}
                style={[styles.actionButton, styles.outlinedButton]}
                textColor={Colors.primary}
              >
                Nutrition
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  profileAvatar: {
    borderWidth: 3,
    borderColor: Colors.white,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCardContainer: {
    width: '48%',
  },
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    elevation: 4,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  gradientStatCard: {
    borderRadius: 16,
    elevation: 6,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  statContent: {
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
  },
  sectionCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  bookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  userAvatar: {
    backgroundColor: Colors.primary,
    marginRight: 12,
  },
  avatarLabel: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  bookingInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  bookingTime: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  bookingDuration: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  bookingActions: {
    alignItems: 'flex-end',
  },
  timeUntil: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 8,
  },
  chatButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}15`,
  },
  divider: {
    marginVertical: 8,
    backgroundColor: Colors.separator,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  outlinedButton: {
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
}); 