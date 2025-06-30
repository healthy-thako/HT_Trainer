import React, { useState, useEffect } from 'react';
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
  Button,
  List,
  FAB,
  Chip,
  Searchbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppNavigation } from '../../hooks/useNavigation';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase/client';

interface MealPlan {
  id: string;
  name: string;
  description: string;
  client_name: string;
  goal: string;
  daily_calories: number;
  created_at: string;
}

export default function NutritionScreen() {
  const { trainer } = useAuth();
  const navigation = useAppNavigation();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMealPlans();
  }, []);

  const loadMealPlans = async () => {
    try {
      setLoading(true);
      
      if (!trainer?.id) {
        throw new Error('Trainer ID not found');
      }

      // Fetch real meal plans from database
      const { data: mealPlansData, error } = await supabase
        .from('meal_plans')
        .select(`
          *,
          client:client_user_id (
            full_name
          )
        `)
        .eq('trainer_id', trainer.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform data to match interface
      const transformedPlans: MealPlan[] = (mealPlansData || []).map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        client_name: plan.client?.full_name || 'Template',
        goal: getGoalFromCalories(plan.target_calories_per_day),
        daily_calories: plan.target_calories_per_day,
        created_at: plan.created_at,
      }));

      setMealPlans(transformedPlans);
    } catch (error) {
      console.error('Error loading meal plans:', error);
      Alert.alert('Error', 'Failed to load meal plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper function to determine goal from calories
  const getGoalFromCalories = (calories: number): string => {
    if (calories < 2000) return 'weight_loss';
    if (calories > 2400) return 'muscle_gain';
    return 'maintenance';
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMealPlans();
  };

  const handleCreatePlan = () => {
    Alert.alert('Create Plan', 'Meal plan creation feature coming soon!');
  };

  const handlePlanPress = (planId: string) => {
    Alert.alert('Plan Details', `View details for plan ${planId} - Coming soon!`);
  };

  const getGoalColor = (goal: string) => {
    switch (goal) {
      case 'weight_loss':
        return Colors.warning;
      case 'muscle_gain':
        return Colors.success;
      case 'maintenance':
        return Colors.info;
      default:
        return Colors.primary;
    }
  };

  const getGoalLabel = (goal: string) => {
    switch (goal) {
      case 'weight_loss':
        return 'Weight Loss';
      case 'muscle_gain':
        return 'Muscle Gain';
      case 'maintenance':
        return 'Maintenance';
      default:
        return 'General';
    }
  };

  const filteredPlans = mealPlans.filter(plan =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text>Loading nutrition plans...</Text>
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
          <Title style={styles.title}>Nutrition Plans</Title>
          <Text style={styles.subtitle}>
            Create and manage meal plans for your clients
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search meal plans..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
        </View>

        {/* Quick Stats */}
        <Card style={styles.statsCard}>
          <Card.Content>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{mealPlans.length}</Text>
                <Text style={styles.statLabel}>Total Plans</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {mealPlans.filter(p => p.goal === 'weight_loss').length}
                </Text>
                <Text style={styles.statLabel}>Weight Loss</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {mealPlans.filter(p => p.goal === 'muscle_gain').length}
                </Text>
                <Text style={styles.statLabel}>Muscle Gain</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Meal Plans List */}
        <Card style={styles.card}>
          <Card.Title title="Meal Plans" />
          <Card.Content>
            {filteredPlans.length > 0 ? (
              filteredPlans.map((plan) => (
                <List.Item
                  key={plan.id}
                  title={plan.name}
                  description={`${plan.client_name} • ${plan.daily_calories} cal/day`}
                  left={(props) => <List.Icon {...props} icon="nutrition" />}
                  right={() => (
                    <View style={styles.planActions}>
                      <Chip
                        style={[
                          styles.goalChip,
                          { backgroundColor: getGoalColor(plan.goal) + '20' }
                        ]}
                        textStyle={{ color: getGoalColor(plan.goal) }}
                      >
                        {getGoalLabel(plan.goal)}
                      </Chip>
                    </View>
                  )}
                  onPress={() => handlePlanPress(plan.id)}
                  style={styles.planItem}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No meal plans found</Text>
                <Text style={styles.emptySubtext}>
                  Create your first meal plan to get started
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Title title="Quick Actions" />
          <Card.Content>
            <List.Item
              title="Food Database"
              description="Browse nutrition information"
              left={(props) => <List.Icon {...props} icon="database" />}
              onPress={() => Alert.alert('Food Database', 'Coming soon!')}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
            <List.Item
              title="Meal Templates"
              description="Pre-made meal combinations"
              left={(props) => <List.Icon {...props} icon="food" />}
              onPress={() => Alert.alert('Meal Templates', 'Coming soon!')}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
            <List.Item
              title="Nutrition Guidelines"
              description="Dietary recommendations"
              left={(props) => <List.Icon {...props} icon="book-open" />}
              onPress={() => Alert.alert('Guidelines', 'Coming soon!')}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </Card.Content>
        </Card>
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
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: Colors.surface,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
  },
  searchbar: {
    backgroundColor: Colors.surface,
  },
  statsCard: {
    margin: 16,
    marginTop: 0,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  card: {
    margin: 16,
    marginTop: 8,
  },
  planItem: {
    paddingVertical: 8,
  },
  planActions: {
    justifyContent: 'center',
  },
  goalChip: {
    alignSelf: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
  },
}); 