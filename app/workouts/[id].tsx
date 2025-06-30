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
  Surface,
  Divider,
  IconButton,
  ActivityIndicator,
  Avatar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../hooks/useNavigation';
import { WorkoutsAPI, WorkoutPlan } from '../../lib/supabase/api/workouts';
import { Colors } from '../../constants/Colors';

interface WorkoutPlanDetails {
  plan: WorkoutPlan;
  days: Array<{
    id: string;
    day_of_week: number;
    name: string;
    description?: string;
    estimated_duration_minutes: number;
    focus_areas: string[];
    exercises: Array<{
      id: string;
      exercise_id: string;
      exercise_name: string;
      sets: number;
      reps: string;
      weight_kg?: number;
      rest_seconds: number;
      notes?: string;
      order_index: number;
    }>;
  }>;
}

export default function WorkoutPlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trainer } = useAuth();
  const navigation = useAppNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planDetails, setPlanDetails] = useState<WorkoutPlanDetails | null>(null);

  useEffect(() => {
    if (id && trainer) {
      loadPlanDetails();
    }
  }, [id, trainer]);

  const loadPlanDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const details = await WorkoutsAPI.getWorkoutPlanDetails(id);
      setPlanDetails(details);
    } catch (error) {
      console.error('Error loading workout plan details:', error);
      Alert.alert('Error', 'Failed to load workout plan details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPlanDetails();
  };

  const handleEditPlan = () => {
    // Navigate to edit screen (would be implemented)
    Alert.alert('Edit Plan', 'Edit functionality would be implemented here');
  };

  const handleDuplicatePlan = async () => {
    if (!planDetails || !trainer) return;

    try {
      const newPlan = await WorkoutsAPI.cloneWorkoutPlanAsTemplate(
        planDetails.plan.id,
        trainer.id,
        `${planDetails.plan.name} (Copy)`
      );
      
      Alert.alert(
        'Plan Duplicated',
        'The workout plan has been duplicated successfully.',
        [
          {
            text: 'View Copy',
            onPress: () => navigation.navigate('workouts/[id]', { id: newPlan.id }),
          },
          { text: 'OK' },
        ]
      );
    } catch (error) {
      console.error('Error duplicating plan:', error);
      Alert.alert('Error', 'Failed to duplicate workout plan');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return Colors.success;
      case 'intermediate': return Colors.warning;
      case 'advanced': return Colors.error;
      default: return Colors.outline;
    }
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || `Day ${dayOfWeek}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Paragraph style={styles.loadingText}>Loading workout plan...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  if (!planDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Title>Plan Not Found</Title>
          <Paragraph>The requested workout plan could not be found.</Paragraph>
          <Button mode="contained" onPress={() => navigation.goBack()}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const { plan, days } = planDetails;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.planHeader}>
              <View style={styles.planInfo}>
                <Title style={styles.planName}>{plan.name}</Title>
                {plan.description && (
                  <Paragraph style={styles.planDescription}>{plan.description}</Paragraph>
                )}
                <View style={styles.planMeta}>
                  <Chip
                    style={[styles.difficultyChip, { backgroundColor: getDifficultyColor(plan.difficulty_level) + '20' }]}
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

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={handleEditPlan}
                icon="pencil"
                style={styles.actionButton}
              >
                Edit Plan
              </Button>
              <Button
                mode="outlined"
                onPress={handleDuplicatePlan}
                icon="content-copy"
                style={styles.actionButton}
              >
                Duplicate
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Plan Statistics */}
        <View style={styles.statsContainer}>
          <Surface style={styles.statCard}>
            <Title style={styles.statNumber}>{days.length}</Title>
            <Paragraph style={styles.statLabel}>Workout Days</Paragraph>
          </Surface>
          <Surface style={styles.statCard}>
            <Title style={styles.statNumber}>
              {days.reduce((total, day) => total + day.exercises.length, 0)}
            </Title>
            <Paragraph style={styles.statLabel}>Total Exercises</Paragraph>
          </Surface>
          <Surface style={styles.statCard}>
            <Title style={styles.statNumber}>
              {Math.round(days.reduce((total, day) => total + day.estimated_duration_minutes, 0) / days.length)}
            </Title>
            <Paragraph style={styles.statLabel}>Avg Duration (min)</Paragraph>
          </Surface>
        </View>

        {/* Workout Days */}
        <View style={styles.workoutDaysSection}>
          <Title style={styles.sectionTitle}>Workout Days ({days.length})</Title>
          
          {days
            .sort((a, b) => a.day_of_week - b.day_of_week)
            .map((day, index) => (
              <Card key={day.id} style={styles.dayCard}>
                <Card.Content>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayInfo}>
                      <Title style={styles.dayName}>{day.name}</Title>
                      <Paragraph style={styles.dayMeta}>
                        {getDayName(day.day_of_week)} • {day.estimated_duration_minutes} min • {day.exercises.length} exercises
                      </Paragraph>
                    </View>
                  </View>

                  {day.focus_areas.length > 0 && (
                    <View style={styles.focusAreas}>
                      <Paragraph style={styles.focusLabel}>Focus Areas:</Paragraph>
                      <View style={styles.focusChips}>
                        {day.focus_areas.map((area, areaIndex) => (
                          <Chip key={areaIndex} style={styles.focusChip}>
                            {area}
                          </Chip>
                        ))}
                      </View>
                    </View>
                  )}

                  <Divider style={styles.divider} />

                  {/* Exercises */}
                  <View style={styles.exercisesSection}>
                    <Title style={styles.exercisesTitle}>Exercises</Title>
                    {day.exercises
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((exercise, exerciseIndex) => (
                        <View key={exercise.id} style={styles.exerciseItem}>
                          <View style={styles.exerciseHeader}>
                            <Avatar.Text
                              size={32}
                              label={(exerciseIndex + 1).toString()}
                              style={styles.exerciseNumber}
                            />
                            <View style={styles.exerciseInfo}>
                              <Title style={styles.exerciseName}>{exercise.exercise_name}</Title>
                              <View style={styles.exerciseParams}>
                                <Paragraph style={styles.exerciseParam}>
                                  {exercise.sets} sets × {exercise.reps}
                                </Paragraph>
                                {exercise.weight_kg && (
                                  <Paragraph style={styles.exerciseParam}>
                                    {exercise.weight_kg} kg
                                  </Paragraph>
                                )}
                                <Paragraph style={styles.exerciseParam}>
                                  {exercise.rest_seconds}s rest
                                </Paragraph>
                              </View>
                              {exercise.notes && (
                                <Paragraph style={styles.exerciseNotes}>
                                  Note: {exercise.notes}
                                </Paragraph>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                  </View>
                </Card.Content>
              </Card>
            ))}
        </View>

        {/* Client Assignment Info */}
        {plan.client_user_id && (
          <Card style={styles.assignmentCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Assignment</Title>
              <List.Item
                title="Assigned to Client"
                description="View client progress and feedback"
                left={(props) => <List.Icon {...props} icon="account" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => navigation.navigate('clients/[id]', { id: plan.client_user_id! })}
              />
            </Card.Content>
          </Card>
        )}
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
  planHeader: {
    marginBottom: 20,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  planDescription: {
    color: Colors.onSurfaceVariant,
    marginBottom: 16,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
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
  workoutDaysSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dayCard: {
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayMeta: {
    color: Colors.onSurfaceVariant,
    fontSize: 14,
  },
  focusAreas: {
    marginBottom: 16,
  },
  focusLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: Colors.onSurfaceVariant,
  },
  focusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  focusChip: {
    height: 24,
  },
  divider: {
    marginVertical: 16,
  },
  exercisesSection: {
    marginTop: 8,
  },
  exercisesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  exerciseItem: {
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  exerciseNumber: {
    marginRight: 12,
    backgroundColor: Colors.primary + '20',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  exerciseParams: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 4,
  },
  exerciseParam: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  exerciseNotes: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: 4,
  },
  assignmentCard: {
    marginBottom: 16,
  },
}); 