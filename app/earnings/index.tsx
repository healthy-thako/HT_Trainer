import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Chip,
  FAB,
  Searchbar,
  List,
  Avatar,
  IconButton,
  Text,
  Divider,
  Surface,
  Button,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppNavigation } from '../../hooks/useNavigation';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../context/AuthContext';

interface EarningsData {
  totalEarnings: number;
  monthlyEarnings: number;
  pendingPayments: number;
  averageSessionRate: number;
  totalSessions: number;
  thisMonthSessions: number;
}

interface PaymentTransaction {
  id: string;
  amount: number;
  netAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
  clientName: string;
  sessionDate: string;
  paymentMethod?: string;
  paidAt?: string;
  sessionType: string;
}

const EarningsScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const { trainer } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '3m' | '1y'>('30d');
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalEarnings: 0,
    monthlyEarnings: 0,
    pendingPayments: 0,
    averageSessionRate: 0,
    totalSessions: 0,
    thisMonthSessions: 0,
  });
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    loadEarningsData();
    
    if (trainer) {
      subscribeToEarningsUpdates();
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [selectedPeriod, trainer]);

  const subscribeToEarningsUpdates = () => {
    if (!trainer) return;

    // Subscribe to earnings updates for real-time data
    subscriptionRef.current = supabase
      .channel(`trainer_earnings_${trainer.id}`)
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
          // Refresh earnings data when earnings change
          await loadEarningsData();
        }
      )
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
          // Refresh earnings when bookings change (affects session counts)
          await loadEarningsData();
        }
      )
      .subscribe();
  };

  const loadEarningsData = async () => {
    if (!trainer) return;
    
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '3m':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Get earnings data with period filter
      const { data: earnings } = await supabase
        .from('trainer_earnings')
        .select(`
          *,
          trainer_bookings!inner(
            session_date,
            session_type,
            user:user_id(full_name)
          )
        `)
        .eq('trainer_id', trainer.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      // Get current month earnings
      const monthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      const { data: monthlyEarnings } = await supabase
        .from('trainer_earnings')
        .select('net_amount')
        .eq('trainer_id', trainer.id)
        .eq('status', 'paid')
        .gte('created_at', monthStart.toISOString());

      // Get pending payments
      const { data: pendingPayments } = await supabase
        .from('trainer_earnings')
        .select('net_amount')
        .eq('trainer_id', trainer.id)
        .eq('status', 'pending');

      // Get total sessions this month
      const { data: monthlyBookings } = await supabase
        .from('trainer_bookings')
        .select('id, total_amount')
        .eq('trainer_id', trainer.id)
        .gte('session_date', monthStart.toISOString())
        .eq('status', 'completed');

      // Calculate total earnings from all paid earnings
      const { data: allEarnings } = await supabase
        .from('trainer_earnings')
        .select('net_amount')
        .eq('trainer_id', trainer.id)
        .eq('status', 'paid');
      
      const totalEarnings = allEarnings?.reduce((sum, e) => sum + (e.net_amount || 0), 0) || 0;
      const monthlyEarningsSum = monthlyEarnings?.reduce((sum, e) => sum + (e.net_amount || 0), 0) || 0;
      const pendingPaymentsSum = pendingPayments?.reduce((sum, p) => sum + (p.net_amount || 0), 0) || 0;
      const totalSessions = earnings?.length || 0;
      const thisMonthSessions = monthlyBookings?.length || 0;
      const averageSessionRate = totalSessions > 0 ? totalEarnings / totalSessions : 0;

      setEarningsData({
        totalEarnings,
        monthlyEarnings: monthlyEarningsSum,
        pendingPayments: pendingPaymentsSum,
        averageSessionRate,
        totalSessions,
        thisMonthSessions,
      });

      // Format transactions
      const formattedTransactions: PaymentTransaction[] = earnings?.map(earning => ({
        id: earning.id,
        amount: earning.amount,
        netAmount: earning.net_amount,
        status: earning.status,
        clientName: earning.trainer_bookings?.user?.full_name || 'Unknown Client',
        sessionDate: earning.trainer_bookings?.session_date || '',
        paymentMethod: earning.payment_method,
        paidAt: earning.paid_at,
        sessionType: earning.trainer_bookings?.session_type || 'Personal Training',
      })) || [];

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error loading earnings:', error);
      Alert.alert('Error', 'Failed to load earnings data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEarningsData();
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Export earnings data to CSV or PDF?',
      [
        { text: 'CSV', onPress: () => console.log('Export CSV') },
        { text: 'PDF', onPress: () => console.log('Export PDF') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRequestPayout = () => {
    Alert.alert(
      'Request Payout',
      `Request payout for pending earnings of $${earningsData.pendingPayments.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request', onPress: () => console.log('Request payout') },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.sessionType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading earnings data...</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <Title>Earnings Dashboard</Title>
          <Paragraph>Track your training income and payments</Paragraph>
        </View>

        {/* Period Selection */}
        <View style={styles.periodContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: '7d', label: '7 Days' },
              { key: '30d', label: '30 Days' },
              { key: '3m', label: '3 Months' },
              { key: '1y', label: '1 Year' },
            ].map(period => (
              <Chip
                key={period.key}
                mode={selectedPeriod === period.key ? 'flat' : 'outlined'}
                selected={selectedPeriod === period.key}
                onPress={() => setSelectedPeriod(period.key as any)}
                style={styles.periodChip}
              >
                {period.label}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricsRow}>
            <Card style={styles.metricCard}>
              <Card.Content>
                <Title style={styles.metricValue}>
                  ${earningsData.totalEarnings.toFixed(2)}
                </Title>
                <Paragraph style={styles.metricLabel}>Total Earnings</Paragraph>
              </Card.Content>
            </Card>
            <Card style={styles.metricCard}>
              <Card.Content>
                <Title style={styles.metricValue}>
                  ${earningsData.monthlyEarnings.toFixed(2)}
                </Title>
                <Paragraph style={styles.metricLabel}>This Month</Paragraph>
              </Card.Content>
            </Card>
          </View>
          
          <View style={styles.metricsRow}>
            <Card style={styles.metricCard}>
              <Card.Content>
                <Title style={styles.metricValue}>
                  ${earningsData.pendingPayments.toFixed(2)}
                </Title>
                <Paragraph style={styles.metricLabel}>Pending</Paragraph>
              </Card.Content>
            </Card>
            <Card style={styles.metricCard}>
              <Card.Content>
                <Title style={styles.metricValue}>
                  ${earningsData.averageSessionRate.toFixed(2)}
                </Title>
                <Paragraph style={styles.metricLabel}>Avg/Session</Paragraph>
              </Card.Content>
            </Card>
          </View>

          <View style={styles.metricsRow}>
            <Card style={styles.metricCard}>
              <Card.Content>
                <Title style={styles.metricValue}>
                  {earningsData.totalSessions}
                </Title>
                <Paragraph style={styles.metricLabel}>Total Sessions</Paragraph>
              </Card.Content>
            </Card>
            <Card style={styles.metricCard}>
              <Card.Content>
                <Title style={styles.metricValue}>
                  {earningsData.thisMonthSessions}
                </Title>
                <Paragraph style={styles.metricLabel}>This Month</Paragraph>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* Quick Actions */}
        <Surface style={styles.actionsContainer}>
          <Title style={styles.actionsTitle}>Quick Actions</Title>
          <View style={styles.actionsRow}>
            <Button
              mode="contained"
              onPress={handleRequestPayout}
              disabled={earningsData.pendingPayments <= 0}
              style={styles.actionButton}
              icon="bank-transfer"
            >
              Request Payout
            </Button>
            <Button
              mode="outlined"
              onPress={handleExportData}
              style={styles.actionButton}
              icon="download"
            >
              Export Data
            </Button>
          </View>
        </Surface>

        {/* Search */}
        <Searchbar
          placeholder="Search transactions..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        {/* Transactions List */}
        <Card style={styles.transactionsCard}>
          <Card.Content>
            <Title>Recent Transactions</Title>
            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text>No transactions found</Text>
              </View>
            ) : (
              filteredTransactions.map((transaction) => (
                <View key={transaction.id}>
                  <List.Item
                    title={transaction.clientName}
                    description={`${transaction.sessionType} • ${new Date(transaction.sessionDate).toLocaleDateString()}`}
                    left={(props) => (
                      <Avatar.Icon
                        {...props}
                        icon="currency-usd"
                        style={{ backgroundColor: getStatusColor(transaction.status) }}
                      />
                    )}
                    right={() => (
                      <View style={styles.transactionRight}>
                        <Text style={styles.transactionAmount}>
                          ${transaction.netAmount.toFixed(2)}
                        </Text>
                        <Chip
                          mode="outlined"
                          textStyle={{ fontSize: 10 }}
                          style={[
                            styles.statusChip,
                            { borderColor: getStatusColor(transaction.status) }
                          ]}
                        >
                          {transaction.status.toUpperCase()}
                        </Chip>
                      </View>
                    )}
                  />
                  <Divider />
                </View>
              ))
            )}
          </Card.Content>
        </Card>

      </ScrollView>

      <FAB
        icon="chart-line"
        style={styles.fab}
        onPress={() => navigation.navigateToAnalytics()}
        label="Analytics"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  periodContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  periodChip: {
    marginRight: 10,
  },
  metricsContainer: {
    padding: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  metricCard: {
    flex: 1,
    marginHorizontal: 5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
  },
  actionsContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  actionsTitle: {
    marginBottom: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  searchBar: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  transactionsCard: {
    margin: 20,
    marginBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusChip: {
    height: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default EarningsScreen; 