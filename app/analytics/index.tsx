import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Chip,
  Avatar,
  List,
  SegmentedButtons,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppNavigation } from '../../hooks/useNavigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase/client';

interface AnalyticsData {
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalClients: number;
  bookingsByType: { [key: string]: number };
  topClients: Array<{
    id: string;
    name: string;
    bookings: number;
    spent: number;
  }>;
  recentReviews: Array<{
    id: string;
    client_name: string;
    rating: number;
    comment: string;
    date: string;
  }>;
}

export default function AnalyticsScreen() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('3months');

  const navigation = useAppNavigation();
  const { trainer } = useAuth();

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      if (!trainer?.id) {
        throw new Error('Trainer ID not found');
      }

      // Fetch real analytics data from database
      const [bookingsData, reviewsData, clientsData] = await Promise.all([
        // Get bookings data
        supabase
          .from('trainer_bookings')
          .select('*')
          .eq('trainer_id', trainer.id),
        
        // Get reviews data
        supabase
          .from('trainer_reviews')
          .select(`
            *,
            user:user_id (
              full_name
            )
          `)
          .eq('trainer_id', trainer.id)
          .order('created_at', { ascending: false })
          .limit(10),
        
        // Get clients data
        supabase
          .from('trainer_clients')
          .select('*')
          .eq('trainer_id', trainer.id)
          .order('total_spent', { ascending: false })
          .limit(5)
      ]);

      if (bookingsData.error) throw bookingsData.error;
      if (reviewsData.error) throw reviewsData.error;
      if (clientsData.error) throw clientsData.error;

      // Calculate analytics
      const bookings = bookingsData.data || [];
      const reviews = reviewsData.data || [];
      const clients = clientsData.data || [];

      const totalBookings = bookings.length;
      const completedBookings = bookings.filter(b => b.status === 'completed');
      const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const averageRating = reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0;

      // Group bookings by type (using session_type or default)
      const bookingsByType: { [key: string]: number } = {};
      bookings.forEach(booking => {
        const type = booking.session_type || 'Personal Training';
        bookingsByType[type] = (bookingsByType[type] || 0) + 1;
      });

      const analyticsData: AnalyticsData = {
        totalBookings,
        totalRevenue,
        averageRating: Math.round(averageRating * 10) / 10,
        totalClients: clients.length,
        bookingsByType,
        topClients: clients.map((client: any) => ({
          id: client.client_id,
          name: client.client_name,
          bookings: client.total_sessions || 0,
          spent: client.total_spent || 0,
        })),
        recentReviews: reviews.map((review: any) => ({
          id: review.id,
          client_name: review.user?.full_name || 'Anonymous',
          rating: review.rating,
          comment: review.comment || '',
          date: review.created_at,
        })),
      };

      setData(analyticsData);

    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Time Range Selector */}
        <Card style={styles.card}>
          <Card.Content>
            <SegmentedButtons
              value={timeRange}
              onValueChange={setTimeRange}
              buttons={[
                { value: '1month', label: '1M' },
                { value: '3months', label: '3M' },
                { value: '6months', label: '6M' },
                { value: '1year', label: '1Y' },
              ]}
            />
          </Card.Content>
        </Card>

        {/* Key Metrics */}
        <View style={styles.metricsRow}>
          <Surface style={styles.metricCard}>
            <Text style={styles.metricValue}>{data?.totalBookings || 0}</Text>
            <Text style={styles.metricLabel}>Total Bookings</Text>
          </Surface>
          
          <Surface style={styles.metricCard}>
            <Text style={styles.metricValue}>${(data?.totalRevenue || 0).toFixed(0)}</Text>
            <Text style={styles.metricLabel}>Total Revenue</Text>
          </Surface>
          
          <Surface style={styles.metricCard}>
            <Text style={styles.metricValue}>{(data?.averageRating || 0).toFixed(1)}⭐</Text>
            <Text style={styles.metricLabel}>Avg Rating</Text>
          </Surface>
          
          <Surface style={styles.metricCard}>
            <Text style={styles.metricValue}>{data?.totalClients || 0}</Text>
            <Text style={styles.metricLabel}>Active Clients</Text>
          </Surface>
        </View>

        {/* Performance Summary */}
        <Card style={styles.card}>
          <Card.Title title="Performance Summary" />
          <Card.Content>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Monthly Growth:</Text>
              <Text style={styles.summaryValue}>+12%</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Client Retention:</Text>
              <Text style={styles.summaryValue}>89%</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Average Session Rate:</Text>
              <Text style={styles.summaryValue}>$50</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Booking Types */}
        <Card style={styles.card}>
          <Card.Title title="Booking Types" />
          <Card.Content>
            {data && Object.keys(data.bookingsByType).length > 0 ? (
              <View style={styles.chipContainer}>
                {Object.entries(data.bookingsByType).map(([type, count]) => (
                  <Chip key={type} style={styles.typeChip}>
                    {type}: {count}
                  </Chip>
                ))}
              </View>
            ) : (
              <Text style={styles.noDataText}>No booking type data available</Text>
            )}
          </Card.Content>
        </Card>

        {/* Top Clients */}
        <Card style={styles.card}>
          <Card.Title title="Top Clients" />
          <Card.Content>
            {data && data.topClients.length > 0 ? (
              <>
                {data.topClients.map((client, index) => (
                  <List.Item
                    key={client.id}
                    title={client.name}
                    description={`${client.bookings} bookings • $${client.spent.toFixed(0)} spent`}
                    left={() => (
                      <Avatar.Text
                        size={40}
                        label={(index + 1).toString()}
                        style={{ backgroundColor: index < 3 ? '#4CAF50' : '#9E9E9E' }}
                      />
                    )}
                  />
                ))}
              </>
            ) : (
              <Text style={styles.noDataText}>No client data available</Text>
            )}
          </Card.Content>
        </Card>

        {/* Recent Reviews */}
        <Card style={styles.card}>
          <Card.Title title="Recent Reviews" />
          <Card.Content>
            {data && data.recentReviews.length > 0 ? (
              <>
                {data.recentReviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewerName}>{review.client_name}</Text>
                      <Text style={styles.reviewRating}>{'⭐'.repeat(review.rating)}</Text>
                    </View>
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.noDataText}>No reviews available</Text>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Title title="Quick Actions" />
          <Card.Content>
            <List.Item
              title="View Detailed Reports"
              description="Access comprehensive analytics"
              left={(props) => <List.Icon {...props} icon="chart-box" />}
              onPress={() => Alert.alert('Coming Soon', 'Detailed reports feature coming soon!')}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
            <List.Item
              title="Export Data"
              description="Download your analytics data"
              left={(props) => <List.Icon {...props} icon="download" />}
              onPress={() => Alert.alert('Coming Soon', 'Export feature coming soon!')}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
            <List.Item
              title="Set Goals"
              description="Define your performance targets"
              left={(props) => <List.Icon {...props} icon="target" />}
              onPress={() => Alert.alert('Coming Soon', 'Goal setting feature coming soon!')}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  card: {
    margin: 16,
    marginVertical: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  metricCard: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
    elevation: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  reviewRating: {
    fontSize: 14,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
}); 