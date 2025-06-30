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
  Chip,
  List,
  Searchbar,
  FAB,
  Surface,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../hooks/useNavigation';
import { supabase } from '../../lib/supabase/client';
import { Colors } from '../../constants/Colors';

interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  duration_weeks: number;
  days_per_week: number;
  is_template: boolean;
  client_id?: string;
  created_at: string;
  updated_at: string;
  client_name?: string;
  total_exercises: number;
  avg_duration: number;
  exercises?: any; // JSONB field
  estimated_duration_minutes?: number;
  focus_areas?: string[];
}

export default function WorkoutsScreen() {
  const { trainer } = useAuth();
  const navigation = useAppNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<WorkoutPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (trainer) {
      loadWorkoutPlans();
    }
  }, [trainer]);

  useEffect(() => {
    filterPlans();
  }, [searchQuery, activeFilter, workoutPlans]);

  const loadWorkoutPlans = async () => {
    if (!trainer) return;

    try {
      setLoading(true);
      
      // Fetch workout plans with client information
      const { data: plansData, error: plansError } = await supabase
        .from('trainer_workout_plans')
        .select(`
          *,
          client:client_id (
            full_name
          )
        `)
        .eq('trainer_id', trainer.id)
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      // Get additional stats for each plan
      const plansWithStats = await Promise.all(
        (plansData || []).map(async (plan) => {
          // Get workout days and exercises count
          const { data: daysData } = await supabase
            .from('workout_plan_days')
            .select(`
              id,
              estimated_duration_minutes,
              workout_plan_exercises (
                id
              )
            `)
            .eq('workout_plan_id', plan.id);

          const totalExercises = daysData?.reduce((sum, day) => 
            sum + (day.workout_plan_exercises?.length || 0), 0) || 0;
          
          const avgDuration = daysData && daysData.length > 0
            ? Math.round(daysData.reduce((sum, day) => 
                sum + day.estimated_duration_minutes, 0) / daysData.length)
            : 0;

          return {
            ...plan,
            client_name: plan.client?.full_name || null,
            total_exercises: totalExercises,
            avg_duration: avgDuration,
          };
        })
      );

      setWorkoutPlans(plansWithStats);
    } catch (error) {
      console.error('Error loading workout plans:', error);
      Alert.alert('Error', 'Failed to load workout plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterPlans = () => {
    let filtered = workoutPlans;

    // Filter by type
    if (activeFilter === 'templates') {
      filtered = filtered.filter(plan => plan.is_template);
    } else if (activeFilter === 'assigned') {
      filtered = filtered.filter(plan => plan.client_id);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(plan =>
        plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPlans(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkoutPlans();
  };

  const handleCreatePlan = () => {
    navigation.navigate('workouts/create-plan');
  };

  const handlePlanPress = (planId: string) => {
    navigation.navigate('workouts/[id]', { id: planId });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return Colors.success;
      case 'intermediate': return Colors.warning;
      case 'advanced': return Colors.error;
      default: return Colors.outline;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Paragraph style={styles.loadingText}>Loading workout plans...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.headerTitle}>Workout Plans</Title>
            <Paragraph style={styles.headerSubtitle}>
              Manage your workout plans and templates
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search workout plans..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <SegmentedButtons
            value={activeFilter}
            onValueChange={setActiveFilter}
            buttons={[
              { value: 'all', label: `All (${workoutPlans.length})` },
              { value: 'assigned', label: `Assigned (${workoutPlans.filter(p => p.client_id).length})` },
              { value: 'templates', label: `Templates (${workoutPlans.filter(p => p.is_template).length})` },
            ]}
          />
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <Surface style={styles.statCard}>
            <Title style={styles.statNumber}>{workoutPlans.length}</Title>
            <Paragraph style={styles.statLabel}>Total Plans</Paragraph>
          </Surface>
          <Surface style={styles.statCard}>
            <Title style={styles.statNumber}>
              {workoutPlans.filter(p => p.is_template).length}
            </Title>
            <Paragraph style={styles.statLabel}>Templates</Paragraph>
          </Surface>
          <Surface style={styles.statCard}>
            <Title style={styles.statNumber}>
              {workoutPlans.filter(p => p.client_id).length}
            </Title>
            <Paragraph style={styles.statLabel}>Assigned</Paragraph>
          </Surface>
        </View>

        {/* Workout Plans List */}
        <View style={styles.plansSection}>
          {filteredPlans.length > 0 ? (
            filteredPlans.map((plan) => (
              <Card key={plan.id} style={styles.planCard}>
                <Card.Content>
                  <View style={styles.planHeader}>
                    <View style={styles.planInfo}>
                      <Title style={styles.planName}>{plan.name}</Title>
                      {plan.description && (
                        <Paragraph style={styles.planDescription} numberOfLines={2}>
                          {plan.description}
                        </Paragraph>
                      )}
                      <View style={styles.planMeta}>
                        <Chip
                          style={[
                            styles.difficultyChip,
                            { backgroundColor: getDifficultyColor(plan.difficulty_level) + '20' }
                          ]}
                          textStyle={{ color: getDifficultyColor(plan.difficulty_level) }}
                        >
                          {plan.difficulty_level.charAt(0).toUpperCase() + plan.difficulty_level.slice(1)}
                        </Chip>
                        <Chip style={styles.metaChip}>
                          {plan.duration_weeks} weeks
                        </Chip>
                        <Chip style={styles.metaChip}>
                          {plan.days_per_week} days/week
                        </Chip>
                        {plan.is_template && (
                          <Chip style={styles.templateChip} icon="content-copy">
                            Template
                          </Chip>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.planStats}>
                    <View style={styles.statItem}>
                      <Paragraph style={styles.statValue}>{plan.total_exercises}</Paragraph>
                      <Paragraph style={styles.statLabel}>Exercises</Paragraph>
                    </View>
                    <View style={styles.statItem}>
                      <Paragraph style={styles.statValue}>{plan.avg_duration}min</Paragraph>
                      <Paragraph style={styles.statLabel}>Avg Duration</Paragraph>
                    </View>
                    <View style={styles.statItem}>
                      <Paragraph style={styles.statValue}>{formatDate(plan.created_at)}</Paragraph>
                      <Paragraph style={styles.statLabel}>Created</Paragraph>
                    </View>
                  </View>

                  {plan.client_name && (
                    <View style={styles.assignmentInfo}>
                      <Chip icon="account" style={styles.clientChip}>
                        Assigned to {plan.client_name}
                      </Chip>
                    </View>
                  )}
                </Card.Content>
                <Card.Actions>
                  <Button onPress={() => handlePlanPress(plan.id)}>
                    View Details
                  </Button>
                </Card.Actions>
              </Card>
            ))
          ) : (
            <Surface style={styles.emptyState}>
              <Title style={styles.emptyTitle}>
                {searchQuery || activeFilter !== 'all' 
                  ? 'No plans found' 
                  : 'No workout plans yet'
                }
              </Title>
              <Paragraph style={styles.emptyText}>
                {searchQuery || activeFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first workout plan to get started'
                }
              </Paragraph>
              {!searchQuery && activeFilter === 'all' && (
                <Button
                  mode="contained"
                  onPress={handleCreatePlan}
                  icon="plus"
                  style={styles.emptyButton}
                >
                  Create First Plan
                </Button>
              )}
            </Surface>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreatePlan}
        label="Create Plan"
      />
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
  headerCard: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBar: {
    backgroundColor: Colors.surface,
  },
  filterContainer: {
    marginBottom: 16,
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
  plansSection: {
    marginBottom: 80, // Space for FAB
  },
  planCard: {
    marginBottom: 16,
  },
  planHeader: {
    marginBottom: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  planDescription: {
    color: Colors.onSurfaceVariant,
    marginBottom: 12,
    lineHeight: 20,
  },
  planMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  difficultyChip: {
    height: 28,
  },
  metaChip: {
    height: 28,
  },
  templateChip: {
    height: 28,
    backgroundColor: Colors.info + '20',
  },
  planStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  assignmentInfo: {
    marginTop: 8,
  },
  clientChip: {
    backgroundColor: Colors.success + '20',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
  },
}); 