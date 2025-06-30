import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import {
  Card,
  Searchbar,
  List,
  Avatar,
  Chip,
  Button,
  FAB,
  Portal,
  Modal,
  TextInput,
  ActivityIndicator,
  Title,
  Paragraph,
  IconButton,
  Surface,
  Menu,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppNavigation } from '../../hooks/useNavigation';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../context/AuthContext';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  age?: number;
  gender?: string;
  fitnessLevel?: string;
  fitnessGoals?: string[];
  totalSessions: number;
  lastSessionDate?: string;
  firstSessionDate?: string;
  averageRating?: number;
  totalSpent: number;
  status: 'active' | 'inactive' | 'paused';
}

interface ClientStats {
  totalClients: number;
  activeClients: number;
  newThisMonth: number;
  averageSessionsPerClient: number;
}

const ClientsScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const { trainer } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'sessions' | 'recent' | 'spending'>('name');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'inactive' | 'new'>('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats>({
    totalClients: 0,
    activeClients: 0,
    newThisMonth: 0,
    averageSessionsPerClient: 0,
  });
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    loadClientsData();
    
    if (trainer) {
      subscribeToClientUpdates();
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [trainer]);

  const subscribeToClientUpdates = () => {
    if (!trainer) return;

    // Subscribe to booking changes that affect client data
    subscriptionRef.current = supabase
      .channel(`trainer_clients_${trainer.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trainer_bookings',
          filter: `trainer_id=eq.${trainer.id}`,
        },
        async (payload) => {
          console.log('Client booking update received:', payload);
          // Refresh client data when bookings change
          await loadClientsData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
        },
        async (payload) => {
          console.log('User profile update received:', payload);
          // Refresh client data when user profiles change
          await loadClientsData();
        }
      )
      .subscribe();
  };

  const loadClientsData = async () => {
    if (!trainer) return;
    
    try {

      // Get clients data from the view we created
      const { data: clientsData } = await supabase
        .from('trainer_clients')
        .select('*')
        .eq('trainer_id', trainer.id);

      // Get additional client status from bookings
      const { data: recentBookings } = await supabase
        .from('trainer_bookings')
        .select('user_id, session_date, status')
        .eq('trainer_id', trainer.id)
        .gte('session_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Process clients data
      const processedClients: Client[] = (clientsData || []).map(client => {
        const recentActivity = recentBookings?.filter(b => b.user_id === client.client_id);
        const hasRecentActivity = recentActivity && recentActivity.length > 0;
        
        return {
          id: client.client_id,
          name: client.client_name || 'Unknown Client',
          email: client.client_email || '',
          phone: client.client_phone,
          avatar: client.client_avatar,
          age: client.age,
          gender: client.gender,
          fitnessLevel: client.fitness_level,
          fitnessGoals: client.fitness_goals ? [client.fitness_goals] : [],
          totalSessions: client.total_sessions || 0,
          lastSessionDate: client.last_session_date,
          firstSessionDate: client.first_session_date,
          averageRating: client.average_rating,
          totalSpent: client.total_spent || 0,
          status: hasRecentActivity ? 'active' : 
                  client.last_session_date && 
                  new Date(client.last_session_date) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) 
                    ? 'inactive' : 'paused',
        };
      });

      // Calculate stats
      const currentMonth = new Date();
      currentMonth.setDate(1);
      
      const newThisMonth = processedClients.filter(client => 
        client.firstSessionDate && new Date(client.firstSessionDate) >= currentMonth
      ).length;

      const activeClients = processedClients.filter(client => client.status === 'active').length;
      const totalSessions = processedClients.reduce((sum, client) => sum + client.totalSessions, 0);

      setStats({
        totalClients: processedClients.length,
        activeClients,
        newThisMonth,
        averageSessionsPerClient: processedClients.length > 0 ? totalSessions / processedClients.length : 0,
      });

      setClients(processedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
      Alert.alert('Error', 'Failed to load clients data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClientsData();
  };

  const handleClientPress = (client: Client) => {
    Alert.alert(
      client.name,
      'Choose an action',
      [
        { text: 'View Progress', onPress: () => viewClientProgress(client) },
        { text: 'Message Client', onPress: () => messageClient(client) },
        { text: 'Book Session', onPress: () => bookSession(client) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const viewClientProgress = (client: Client) => {
    console.log('View progress for:', client.name);
    // Navigate to client progress screen
  };

  const messageClient = async (client: Client) => {
    try {
      // Find or create conversation with client
      const conversation = await navigation.getOrCreateConversationForClient(client.id);
      if (conversation) {
        navigation.navigateToChatDetail(conversation.id);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open chat with client');
    }
  };

  const bookSession = (client: Client) => {
    console.log('Book session for:', client.name);
    // Navigate to booking creation
  };

  const sortClients = (clients: Client[]) => {
    return [...clients].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'sessions':
          return b.totalSessions - a.totalSessions;
        case 'recent':
          if (!a.lastSessionDate && !b.lastSessionDate) return 0;
          if (!a.lastSessionDate) return 1;
          if (!b.lastSessionDate) return -1;
          return new Date(b.lastSessionDate).getTime() - new Date(a.lastSessionDate).getTime();
        case 'spending':
          return b.totalSpent - a.totalSpent;
        default:
          return 0;
      }
    });
  };

  const filterClients = (clients: Client[]) => {
    let filtered = clients;
    
    if (filterBy !== 'all') {
      switch (filterBy) {
        case 'active':
          filtered = clients.filter(c => c.status === 'active');
          break;
        case 'inactive':
          filtered = clients.filter(c => c.status === 'inactive' || c.status === 'paused');
          break;
        case 'new':
          const currentMonth = new Date();
          currentMonth.setDate(1);
          filtered = clients.filter(c => 
            c.firstSessionDate && new Date(c.firstSessionDate) >= currentMonth
          );
          break;
      }
    }

    if (searchQuery) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return sortClients(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'inactive':
        return '#FF9800';
      case 'paused':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const getAvatarContent = (client: Client) => {
    if (client.avatar) {
      return { source: { uri: client.avatar } };
    }
    return { label: client.name.charAt(0).toUpperCase() };
  };

  const filteredClients = filterClients(clients);

  const renderClient = ({ item: client }: { item: Client }) => (
    <Card style={styles.clientCard} onPress={() => handleClientPress(client)}>
      <Card.Content>
        <View style={styles.clientHeader}>
                     <Avatar.Text
             size={50}
             label={client.name.charAt(0).toUpperCase()}
             style={[styles.avatar, { backgroundColor: getStatusColor(client.status) }]}
           />
          <View style={styles.clientInfo}>
            <Title style={styles.clientName}>{client.name}</Title>
            <Paragraph style={styles.clientEmail}>{client.email}</Paragraph>
            <View style={styles.clientStats}>
              <Chip
                icon="dumbbell"
                style={[styles.statusChip, { backgroundColor: getStatusColor(client.status) }]}
              >
                {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
              </Chip>
              <Paragraph style={styles.statText}>
                {client.totalSessions} sessions • ${client.totalSpent.toFixed(0)} spent
              </Paragraph>
            </View>
          </View>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item onPress={() => viewClientProgress(client)} title="View Progress" />
            <Menu.Item onPress={() => messageClient(client)} title="Send Message" />
            <Menu.Item onPress={() => bookSession(client)} title="Book Session" />
            <Divider />
            <Menu.Item onPress={() => {}} title="Create Workout Plan" />
            <Menu.Item onPress={() => {}} title="Assign Nutrition Plan" />
          </Menu>
        </View>

        <View style={styles.clientDetails}>
          <View style={styles.detailRow}>
            <Paragraph style={styles.detailLabel}>Fitness Level:</Paragraph>
            <Paragraph style={styles.detailValue}>{client.fitnessLevel || 'Not set'}</Paragraph>
          </View>
          <View style={styles.detailRow}>
            <Paragraph style={styles.detailLabel}>Goals:</Paragraph>
                         <Paragraph style={styles.detailValue}>
               {client.fitnessGoals?.slice(0, 2).join(', ') || 'Not set'}
             </Paragraph>
          </View>
          <View style={styles.detailRow}>
            <Paragraph style={styles.detailLabel}>Last Session:</Paragraph>
            <Paragraph style={styles.detailValue}>
              {client.lastSessionDate 
                ? new Date(client.lastSessionDate).toLocaleDateString()
                : 'Never'
              }
            </Paragraph>
          </View>
          {client.averageRating && (
            <View style={styles.detailRow}>
              <Paragraph style={styles.detailLabel}>Rating:</Paragraph>
              <View style={styles.ratingContainer}>
                <Paragraph style={styles.detailValue}>{client.averageRating.toFixed(1)}</Paragraph>
                <IconButton icon="star" size={16} iconColor="#FFD700" />
              </View>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading clients...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Surface style={styles.header}>
        <Title>My Clients</Title>
        <Paragraph>Manage your training clients</Paragraph>
      </Surface>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statValue}>{stats.totalClients}</Title>
              <Paragraph style={styles.statLabel}>Total Clients</Paragraph>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statValue}>{stats.activeClients}</Title>
              <Paragraph style={styles.statLabel}>Active</Paragraph>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statValue}>{stats.newThisMonth}</Title>
              <Paragraph style={styles.statLabel}>New This Month</Paragraph>
            </Card.Content>
          </Card>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <Searchbar
          placeholder="Search clients..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <View style={styles.filtersRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'inactive', label: 'Inactive' },
              { key: 'new', label: 'New' },
            ].map(filter => (
              <Chip
                key={filter.key}
                mode={filterBy === filter.key ? 'flat' : 'outlined'}
                selected={filterBy === filter.key}
                onPress={() => setFilterBy(filter.key as any)}
                style={styles.filterChip}
              >
                {filter.label}
              </Chip>
            ))}
          </ScrollView>
          
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="filter-variant"
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              onPress={() => { setFilterBy('all'); setMenuVisible(false); }}
              title="All Clients"
            />
            <Menu.Item
              onPress={() => { setFilterBy('active'); setMenuVisible(false); }}
              title="Active Only"
            />
            <Menu.Item
              onPress={() => { setFilterBy('inactive'); setMenuVisible(false); }}
              title="Inactive Only"
            />
            <Menu.Item
              onPress={() => { setFilterBy('new'); setMenuVisible(false); }}
              title="New This Month"
            />
          </Menu>
        </View>
      </View>

      {/* Clients List */}
      <FlatList
        data={filteredClients}
        renderItem={renderClient}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text>No clients found</Text>
          </View>
        }
      />

      <FAB
        icon="account-plus"
        style={styles.fab}
        onPress={() => console.log('Add new client')}
        label="Add Client"
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
  header: {
    padding: 20,
    elevation: 2,
  },
  statsContainer: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  controlsContainer: {
    paddingHorizontal: 20,
  },
  searchBar: {
    marginBottom: 10,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterChip: {
    marginRight: 10,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  clientCard: {
    marginBottom: 15,
  },
  avatar: {
    backgroundColor: '#2196F3',
  },
  clientRight: {
    alignItems: 'flex-end',
  },
  spentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusChip: {
    height: 20,
  },
  clientDetails: {
    paddingTop: 0,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailChip: {
    marginRight: 10,
  },
  goalsRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  goalsLabel: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  goalsText: {
    flex: 1,
    color: '#666',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 3,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientEmail: {
    color: '#666',
    marginBottom: 8,
  },
  clientStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ClientsScreen; 