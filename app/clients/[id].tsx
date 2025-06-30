import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Avatar,
  Chip,
  List,
  Surface,
  Divider,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../hooks/useNavigation';
import { ClientsAPI, ClientProfile, ClientProgress } from '../../lib/supabase/api/clients';
import { WorkoutsAPI } from '../../lib/supabase/api/workouts';
import { Colors } from '../../constants/Colors';

interface ClientStats {
  totalSessions: number;
  completedSessions: number;
  totalSpent: number;
  averageRating: number;
  workoutPlansCount: number;
  lastSessionDate?: string;
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trainer } = useAuth();
  const navigation = useAppNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);
  const [recentProgress, setRecentProgress] = useState<ClientProgress[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<any[]>([]);

  useEffect(() => {
    if (id && trainer) {
      loadClientData();
    }
  }, [id, trainer]);

  const loadClientData = async () => {
    if (!id || !trainer) return;

    try {
      setLoading(true);

      // Load client profile
      const clientData = await ClientsAPI.getClientProfile(id, trainer.id);
      setClient(clientData);

      // Load client stats
      const stats = await ClientsAPI.getClientStats(id, trainer.id);
      setClientStats(stats);

      // Load recent progress
      const progress = await ClientsAPI.getClientProgress(id, trainer.id, 5);
      setRecentProgress(progress);

      // Load workout plans
      const plans = await WorkoutsAPI.getClientWorkoutPlans(id);
      setWorkoutPlans(plans);

    } catch (error) {
      console.error('Error loading client data:', error);
      Alert.alert('Error', 'Failed to load client information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClientData();
  };

  const handleCreateWorkoutPlan = () => {
    navigation.navigate('workouts/create-plan', { clientId: id });
  };

  const handleViewProgress = () => {
    navigation.navigate('clients/[id]/progress', { id });
  };

  const handleMessageClient = async () => {
    if (!client) return;
    
    try {
      // Create or get existing conversation
      const conversation = await ClientsAPI.getOrCreateConversation(client.id, trainer!.id);
      navigation.navigate('chat/[id]', { id: conversation.id });
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleBookSession = () => {
    navigation.navigate('bookings/create', { clientId: id });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'inactive': return Colors.warning;
      case 'paused': return Colors.error;
      default: return Colors.outline;
    }
  };

  const getClientStatus = () => {
    if (!clientStats) return 'unknown';
    
    const daysSinceLastSession = clientStats.lastSessionDate 
      ? Math.floor((Date.now() - new Date(clientStats.lastSessionDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceLastSession <= 7) return 'active';
    if (daysSinceLastSession <= 30) return 'inactive';
    return 'paused';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Paragraph style={styles.loadingText}>Loading client details...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Title>Client Not Found</Title>
          <Paragraph>The requested client could not be found.</Paragraph>
          <Button mode="contained" onPress={() => navigation.goBack()}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const status = getClientStatus();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Client Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.clientHeader}>
              <Avatar.Text
                size={80}
                label={client.name.charAt(0).toUpperCase()}
                style={[styles.avatar, { backgroundColor: getStatusColor(status) }]}
              />
              <View style={styles.clientInfo}>
                <Title style={styles.clientName}>{client.name}</Title>
                <Paragraph style={styles.clientEmail}>{client.email}</Paragraph>
                <View style={styles.statusContainer}>
                  <Chip
                    icon="dumbbell"
                    style={[styles.statusChip, { backgroundColor: getStatusColor(status) }]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Chip>
                  {client.fitness_level && (
                    <Chip style={styles.levelChip}>
                      {client.fitness_level.charAt(0).toUpperCase() + client.fitness_level.slice(1)}
                    </Chip>
                  )}
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <Button
                mode="contained"
                onPress={handleCreateWorkoutPlan}
                icon="dumbbell"
                style={styles.actionButton}
              >
                Create Plan
              </Button>
              <Button
                mode="outlined"
                onPress={handleMessageClient}
                icon="message"
                style={styles.actionButton}
              >
                Message
              </Button>
              <Button
                mode="outlined"
                onPress={handleBookSession}
                icon="calendar-plus"
                style={styles.actionButton}
              >
                Book Session
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Stats Cards */}
        {clientStats && (
          <View style={styles.statsContainer}>
            <Surface style={styles.statCard}>
              <Title style={styles.statNumber}>{clientStats.totalSessions}</Title>
              <Paragraph style={styles.statLabel}>Total Sessions</Paragraph>
            </Surface>
            <Surface style={styles.statCard}>
              <Title style={styles.statNumber}>{clientStats.completedSessions}</Title>
              <Paragraph style={styles.statLabel}>Completed</Paragraph>
            </Surface>
            <Surface style={styles.statCard}>
              <Title style={styles.statNumber}>${clientStats.totalSpent.toFixed(0)}</Title>
              <Paragraph style={styles.statLabel}>Total Spent</Paragraph>
            </Surface>
            <Surface style={styles.statCard}>
              <Title style={styles.statNumber}>{clientStats.averageRating.toFixed(1)}</Title>
              <Paragraph style={styles.statLabel}>Avg Rating</Paragraph>
            </Surface>
          </View>
        )}

        {/* Personal Information */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Personal Information</Title>
            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <Paragraph style={styles.infoLabel}>Age:</Paragraph>
                <Paragraph style={styles.infoValue}>{client.age || 'Not provided'}</Paragraph>
              </View>
              <View style={styles.infoRow}>
                <Paragraph style={styles.infoLabel}>Gender:</Paragraph>
                <Paragraph style={styles.infoValue}>
                  {client.gender ? client.gender.charAt(0).toUpperCase() + client.gender.slice(1) : 'Not provided'}
                </Paragraph>
              </View>
              <View style={styles.infoRow}>
                <Paragraph style={styles.infoLabel}>Height:</Paragraph>
                <Paragraph style={styles.infoValue}>
                  {client.height_cm ? `${client.height_cm} cm` : 'Not provided'}
                </Paragraph>
              </View>
              <View style={styles.infoRow}>
                <Paragraph style={styles.infoLabel}>Weight:</Paragraph>
                <Paragraph style={styles.infoValue}>
                  {client.weight_kg ? `${client.weight_kg} kg` : 'Not provided'}
                </Paragraph>
              </View>
              <View style={styles.infoRow}>
                <Paragraph style={styles.infoLabel}>Phone:</Paragraph>
                <Paragraph style={styles.infoValue}>{client.phone_number || 'Not provided'}</Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Fitness Goals */}
        {client.fitness_goals && client.fitness_goals.length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Fitness Goals</Title>
              <View style={styles.goalsContainer}>
                {client.fitness_goals.map((goal, index) => (
                  <Chip key={index} style={styles.goalChip}>
                    {goal}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Health Information */}
        {(client.medical_conditions?.length || client.emergency_contact) && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Health & Safety</Title>
              
              {client.medical_conditions && client.medical_conditions.length > 0 && (
                <View style={styles.healthSection}>
                  <Paragraph style={styles.healthLabel}>Medical Conditions:</Paragraph>
                  <View style={styles.healthItems}>
                    {client.medical_conditions.map((condition, index) => (
                      <Chip key={index} style={styles.healthChip}>
                        {condition}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}

              {client.emergency_contact && (
                <View style={styles.healthSection}>
                  <Paragraph style={styles.healthLabel}>Emergency Contact:</Paragraph>
                  <Paragraph style={styles.emergencyText}>
                    {client.emergency_contact.name} ({client.emergency_contact.relationship})
                  </Paragraph>
                  <Paragraph style={styles.emergencyText}>
                    {client.emergency_contact.phone}
                  </Paragraph>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Workout Plans */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Workout Plans ({workoutPlans.length})</Title>
              <IconButton
                icon="plus"
                onPress={handleCreateWorkoutPlan}
              />
            </View>
            
            {workoutPlans.length > 0 ? (
              workoutPlans.map((plan) => (
                <List.Item
                  key={plan.id}
                  title={plan.name}
                  description={`${plan.difficulty_level} • ${plan.duration_weeks} weeks`}
                  left={(props) => <List.Icon {...props} icon="dumbbell" />}
                  right={(props) => <List.Icon {...props} icon="chevron-right" />}
                  onPress={() => navigation.navigate('workouts/[id]', { id: plan.id })}
                />
              ))
            ) : (
              <View style={styles.emptySection}>
                <Paragraph style={styles.emptyText}>No workout plans assigned yet</Paragraph>
                <Button
                  mode="contained"
                  onPress={handleCreateWorkoutPlan}
                  icon="plus"
                  style={styles.emptyButton}
                >
                  Create First Plan
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Recent Progress */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Recent Progress</Title>
              <Button
                mode="outlined"
                onPress={handleViewProgress}
                compact
              >
                View All
              </Button>
            </View>
            
            {recentProgress.length > 0 ? (
              recentProgress.map((progress) => (
                <List.Item
                  key={progress.id}
                  title={new Date(progress.date).toLocaleDateString()}
                  description={
                    progress.weight_kg 
                      ? `Weight: ${progress.weight_kg} kg`
                      : 'Progress entry'
                  }
                  left={(props) => <List.Icon {...props} icon="chart-line" />}
                />
              ))
            ) : (
              <View style={styles.emptySection}>
                <Paragraph style={styles.emptyText}>No progress entries yet</Paragraph>
                <Button
                  mode="outlined"
                  onPress={handleViewProgress}
                  icon="plus"
                  style={styles.emptyButton}
                >
                  Add Progress Entry
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: Colors.onSurfaceVariant,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  headerCard: {
    marginBottom: 16,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    marginRight: 16,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientEmail: {
    color: Colors.onSurfaceVariant,
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    height: 28,
  },
  levelChip: {
    height: 28,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.onSurface,
  },
  goalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalChip: {
    marginBottom: 8,
  },
  healthSection: {
    marginBottom: 16,
  },
  healthLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: Colors.onSurfaceVariant,
  },
  healthItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  healthChip: {
    marginBottom: 8,
  },
  emergencyText: {
    fontSize: 14,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: Colors.onSurfaceVariant,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
}); 