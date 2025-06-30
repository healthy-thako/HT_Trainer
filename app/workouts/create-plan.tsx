import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  TextInput,
  Button,
  Chip,
  List,
  IconButton,
  Surface,
  RadioButton,
  Searchbar,
  Modal,
  Portal,
  Divider,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../hooks/useNavigation';
import { WorkoutsAPI, Exercise, WorkoutPlan } from '../../lib/supabase/api/workouts';
import { ClientsAPI } from '../../lib/supabase/api/clients';
import { Colors } from '../../constants/Colors';

interface WorkoutDay {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
  focusAreas: string[];
  estimatedDuration: number;
}

interface WorkoutExercise {
  exercise: Exercise;
  sets: number;
  reps: string; // Can be "8-12" or "30 seconds"
  weight?: number;
  restSeconds: number;
  notes?: string;
  isSuperset?: boolean;
  supersetGroup?: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  fitnessLevel: string;
  fitnessGoals: string[];
}

const FOCUS_AREAS = [
  'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Core', 'Cardio',
  'Full Body', 'Upper Body', 'Lower Body', 'Flexibility', 'Balance'
];

const DIFFICULTY_LEVELS = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

export default function CreateWorkoutPlanScreen() {
  const { trainer } = useAuth();
  const navigation = useAppNavigation();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [clientSelectModalVisible, setClientSelectModalVisible] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // Plan data
  const [planData, setPlanData] = useState({
    name: '',
    description: '',
    difficultyLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    durationWeeks: 4,
    daysPerWeek: 3,
    isTemplate: false,
    assignedClientId: '',
  });

  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([
    {
      id: '1',
      name: 'Day 1 - Upper Body',
      exercises: [],
      focusAreas: ['Chest', 'Back', 'Shoulders'],
      estimatedDuration: 60,
    },
    {
      id: '2',
      name: 'Day 2 - Lower Body',
      exercises: [],
      focusAreas: ['Legs', 'Glutes'],
      estimatedDuration: 60,
    },
    {
      id: '3',
      name: 'Day 3 - Full Body',
      exercises: [],
      focusAreas: ['Full Body'],
      estimatedDuration: 60,
    },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [searchQuery, exercises]);

  const loadInitialData = async () => {
    if (!trainer) return;

    try {
      setLoading(true);
      
      // Load clients
      const clientsData = await ClientsAPI.getTrainerClients(trainer.id);
      setClients(clientsData);

      // Load exercises
      const exercisesData = await WorkoutsAPI.getExerciseLibrary();
      setExercises(exercisesData);
      setFilteredExercises(exercisesData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = () => {
    if (!searchQuery.trim()) {
      setFilteredExercises(exercises);
      return;
    }

    const filtered = exercises.filter(exercise =>
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.muscle_groups.some(muscle => 
        muscle.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      exercise.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredExercises(filtered);
  };

  const validatePlan = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!planData.name.trim()) {
      newErrors.name = 'Plan name is required';
    }

    if (workoutDays.every(day => day.exercises.length === 0)) {
      newErrors.exercises = 'Add at least one exercise to any workout day';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addExerciseToDay = (exercise: Exercise) => {
    const newExercise: WorkoutExercise = {
      exercise,
      sets: 3,
      reps: exercise.category === 'cardio' ? '30 seconds' : '8-12',
      restSeconds: exercise.category === 'cardio' ? 30 : 60,
      notes: '',
    };

    setWorkoutDays(prev => prev.map((day, index) => 
      index === currentDayIndex 
        ? { ...day, exercises: [...day.exercises, newExercise] }
        : day
    ));

    setExerciseModalVisible(false);
  };

  const removeExerciseFromDay = (dayIndex: number, exerciseIndex: number) => {
    setWorkoutDays(prev => prev.map((day, index) => 
      index === dayIndex 
        ? { ...day, exercises: day.exercises.filter((_, i) => i !== exerciseIndex) }
        : day
    ));
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, updates: Partial<WorkoutExercise>) => {
    setWorkoutDays(prev => prev.map((day, index) => 
      index === dayIndex 
        ? {
            ...day,
            exercises: day.exercises.map((exercise, i) => 
              i === exerciseIndex ? { ...exercise, ...updates } : exercise
            )
          }
        : day
    ));
  };

  const addWorkoutDay = () => {
    const newDay: WorkoutDay = {
      id: (workoutDays.length + 1).toString(),
      name: `Day ${workoutDays.length + 1}`,
      exercises: [],
      focusAreas: [],
      estimatedDuration: 60,
    };
    setWorkoutDays([...workoutDays, newDay]);
  };

  const removeWorkoutDay = (index: number) => {
    if (workoutDays.length <= 1) {
      Alert.alert('Error', 'You must have at least one workout day');
      return;
    }
    setWorkoutDays(workoutDays.filter((_, i) => i !== index));
  };

  const updateWorkoutDay = (index: number, updates: Partial<WorkoutDay>) => {
    setWorkoutDays(prev => prev.map((day, i) => 
      i === index ? { ...day, ...updates } : day
    ));
  };

  const handleCreatePlan = async () => {
    if (!trainer || !validatePlan()) return;

    try {
      setLoading(true);

      // Create the workout plan
      const newPlan = await WorkoutsAPI.createWorkoutPlan({
        trainer_id: trainer.id,
        client_user_id: planData.assignedClientId || undefined,
        name: planData.name,
        description: planData.description,
        difficulty_level: planData.difficultyLevel,
        duration_weeks: planData.durationWeeks,
        days_per_week: planData.daysPerWeek,
        is_template: planData.isTemplate,
        is_active: true,
      });

      // Add workout days and exercises
      for (let i = 0; i < workoutDays.length; i++) {
        const day = workoutDays[i];
        
        const workoutDay = await WorkoutsAPI.addWorkoutDay({
          plan_id: newPlan.id,
          day_of_week: i + 1,
          name: day.name,
          description: `Focus: ${day.focusAreas.join(', ')}`,
          estimated_duration_minutes: day.estimatedDuration,
          focus_areas: day.focusAreas,
        });

        // Add exercises to the day
        for (let j = 0; j < day.exercises.length; j++) {
          const exercise = day.exercises[j];
          
          await WorkoutsAPI.addExerciseToDay({
            day_id: workoutDay.id,
            exercise_id: exercise.exercise.id,
            order_index: j,
            sets: exercise.sets,
            reps: exercise.reps,
            weight_kg: exercise.weight,
            rest_seconds: exercise.restSeconds,
            notes: exercise.notes,
            is_superset: exercise.isSuperset || false,
            superset_group: exercise.supersetGroup,
          });
        }
      }

      const successMessage = planData.assignedClientId 
        ? `Workout plan "${planData.name}" has been created and assigned to the client!`
        : `Workout plan "${planData.name}" has been created as a ${planData.isTemplate ? 'template' : 'plan'}!`;

      Alert.alert(
        'Success!',
        successMessage,
        [
          {
            text: 'View Plan',
            onPress: () => navigation.navigate('workouts/[id]', { id: newPlan.id }),
          },
          {
            text: 'Create Another',
            onPress: () => {
              // Reset form
              setPlanData({
                name: '',
                description: '',
                difficultyLevel: 'intermediate',
                durationWeeks: 4,
                daysPerWeek: 3,
                isTemplate: false,
                assignedClientId: '',
              });
              setWorkoutDays([
                {
                  id: '1',
                  name: 'Day 1 - Upper Body',
                  exercises: [],
                  focusAreas: ['Chest', 'Back', 'Shoulders'],
                  estimatedDuration: 60,
                },
                {
                  id: '2',
                  name: 'Day 2 - Lower Body',
                  exercises: [],
                  focusAreas: ['Legs', 'Glutes'],
                  estimatedDuration: 60,
                },
                {
                  id: '3',
                  name: 'Day 3 - Full Body',
                  exercises: [],
                  focusAreas: ['Full Body'],
                  estimatedDuration: 60,
                },
              ]);
            },
          },
          {
            text: 'Back to Workouts',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating workout plan:', error);
      Alert.alert('Error', 'Failed to create workout plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderExerciseItem = ({ item: exercise }: { item: Exercise }) => (
    <List.Item
      title={exercise.name}
      description={`${exercise.muscle_groups.join(', ')} • ${exercise.category}`}
      left={(props) => <List.Icon {...props} icon="dumbbell" />}
      right={(props) => (
        <IconButton
          {...props}
          icon="plus"
          onPress={() => addExerciseToDay(exercise)}
        />
      )}
      onPress={() => addExerciseToDay(exercise)}
    />
  );

  const renderWorkoutExercise = (exercise: WorkoutExercise, dayIndex: number, exerciseIndex: number) => (
    <Card key={exerciseIndex} style={styles.exerciseCard}>
      <Card.Content>
        <View style={styles.exerciseHeader}>
          <Title style={styles.exerciseName}>{exercise.exercise.name}</Title>
          <IconButton
            icon="close"
            size={20}
            onPress={() => removeExerciseFromDay(dayIndex, exerciseIndex)}
          />
        </View>
        
        <Paragraph style={styles.exerciseDescription}>
          {exercise.exercise.muscle_groups.join(', ')}
        </Paragraph>

        <View style={styles.exerciseParams}>
          <View style={styles.paramRow}>
            <TextInput
              label="Sets"
              value={exercise.sets.toString()}
              onChangeText={(text) => 
                updateExercise(dayIndex, exerciseIndex, { sets: parseInt(text) || 1 })
              }
              keyboardType="numeric"
              style={styles.paramInput}
            />
            <TextInput
              label="Reps/Duration"
              value={exercise.reps}
              onChangeText={(text) => 
                updateExercise(dayIndex, exerciseIndex, { reps: text })
              }
              style={styles.paramInput}
              placeholder="8-12 or 30 seconds"
            />
          </View>
          
          <View style={styles.paramRow}>
            <TextInput
              label="Weight (kg)"
              value={exercise.weight?.toString() || ''}
              onChangeText={(text) => 
                updateExercise(dayIndex, exerciseIndex, { weight: parseFloat(text) || undefined })
              }
              keyboardType="numeric"
              style={styles.paramInput}
            />
            <TextInput
              label="Rest (seconds)"
              value={exercise.restSeconds.toString()}
              onChangeText={(text) => 
                updateExercise(dayIndex, exerciseIndex, { restSeconds: parseInt(text) || 60 })
              }
              keyboardType="numeric"
              style={styles.paramInput}
            />
          </View>

          <TextInput
            label="Notes"
            value={exercise.notes || ''}
            onChangeText={(text) => 
              updateExercise(dayIndex, exerciseIndex, { notes: text })
            }
            multiline
            style={styles.notesInput}
          />
        </View>
      </Card.Content>
    </Card>
  );

  const renderWorkoutDay = (day: WorkoutDay, index: number) => (
    <Card key={day.id} style={styles.dayCard}>
      <Card.Content>
        <View style={styles.dayHeader}>
          <TextInput
            label="Day Name"
            value={day.name}
            onChangeText={(text) => updateWorkoutDay(index, { name: text })}
            style={styles.dayNameInput}
          />
          <IconButton
            icon="delete"
            onPress={() => removeWorkoutDay(index)}
            disabled={workoutDays.length <= 1}
          />
        </View>

        <View style={styles.focusAreasContainer}>
          <Paragraph style={styles.sectionLabel}>Focus Areas:</Paragraph>
          <View style={styles.chipContainer}>
            {FOCUS_AREAS.map((area) => (
              <Chip
                key={area}
                selected={day.focusAreas.includes(area)}
                onPress={() => {
                  const newFocusAreas = day.focusAreas.includes(area)
                    ? day.focusAreas.filter(a => a !== area)
                    : [...day.focusAreas, area];
                  updateWorkoutDay(index, { focusAreas: newFocusAreas });
                }}
                style={styles.chip}
              >
                {area}
              </Chip>
            ))}
          </View>
        </View>

        <TextInput
          label="Estimated Duration (minutes)"
          value={day.estimatedDuration.toString()}
          onChangeText={(text) => 
            updateWorkoutDay(index, { estimatedDuration: parseInt(text) || 60 })
          }
          keyboardType="numeric"
          style={styles.durationInput}
        />

        <Divider style={styles.divider} />

        <View style={styles.exercisesSection}>
          <View style={styles.exercisesHeader}>
            <Title style={styles.exercisesTitle}>Exercises ({day.exercises.length})</Title>
            <Button
              mode="outlined"
              onPress={() => {
                setCurrentDayIndex(index);
                setExerciseModalVisible(true);
              }}
              icon="plus"
            >
              Add Exercise
            </Button>
          </View>

          {day.exercises.map((exercise, exerciseIndex) =>
            renderWorkoutExercise(exercise, index, exerciseIndex)
          )}

          {day.exercises.length === 0 && (
            <Surface style={styles.emptyExercises}>
              <Paragraph style={styles.emptyText}>No exercises added yet</Paragraph>
              <Button
                mode="contained"
                onPress={() => {
                  setCurrentDayIndex(index);
                  setExerciseModalVisible(true);
                }}
                icon="plus"
              >
                Add First Exercise
              </Button>
            </Surface>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.planInfoCard}>
          <Card.Content>
            <Title style={styles.cardTitle}>Plan Information</Title>
            
            <TextInput
              label="Plan Name *"
              value={planData.name}
              onChangeText={(text) => setPlanData(prev => ({ ...prev, name: text }))}
              error={!!errors.name}
              style={styles.input}
            />
            <HelperText type="error" visible={!!errors.name}>
              {errors.name}
            </HelperText>

            <TextInput
              label="Description"
              value={planData.description}
              onChangeText={(text) => setPlanData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Paragraph style={styles.radioLabel}>Difficulty Level</Paragraph>
                <RadioButton.Group
                  onValueChange={(value) => 
                    setPlanData(prev => ({ ...prev, difficultyLevel: value as any }))
                  }
                  value={planData.difficultyLevel}
                >
                  {DIFFICULTY_LEVELS.map((level) => (
                    <RadioButton.Item key={level.value} label={level.label} value={level.value} />
                  ))}
                </RadioButton.Group>
              </View>

              <View style={styles.halfInput}>
                <TextInput
                  label="Duration (weeks)"
                  value={planData.durationWeeks.toString()}
                  onChangeText={(text) => 
                    setPlanData(prev => ({ ...prev, durationWeeks: parseInt(text) || 4 }))
                  }
                  keyboardType="numeric"
                  style={styles.input}
                />
                
                <TextInput
                  label="Days per week"
                  value={planData.daysPerWeek.toString()}
                  onChangeText={(text) => 
                    setPlanData(prev => ({ ...prev, daysPerWeek: parseInt(text) || 3 }))
                  }
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.assignmentSection}>
              <Button
                mode="outlined"
                onPress={() => setClientSelectModalVisible(true)}
                icon="account"
                style={styles.clientButton}
              >
                {planData.assignedClientId 
                  ? `Assigned to: ${clients.find(c => c.id === planData.assignedClientId)?.name}`
                  : 'Assign to Client (Optional)'
                }
              </Button>
              
              <Button
                mode={planData.isTemplate ? 'contained' : 'outlined'}
                onPress={() => setPlanData(prev => ({ ...prev, isTemplate: !prev.isTemplate }))}
                icon="content-copy"
                style={styles.templateButton}
              >
                {planData.isTemplate ? 'Template Plan' : 'Make Template'}
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.workoutDaysSection}>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Workout Days</Title>
            <Button mode="outlined" onPress={addWorkoutDay} icon="plus">
              Add Day
            </Button>
          </View>

          {workoutDays.map((day, index) => renderWorkoutDay(day, index))}
          
          <HelperText type="error" visible={!!errors.exercises}>
            {errors.exercises}
          </HelperText>
        </View>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleCreatePlan}
            loading={loading}
            disabled={loading}
            style={styles.createButton}
            icon="check"
          >
            Create Workout Plan
          </Button>
        </View>
      </ScrollView>

      {/* Exercise Selection Modal */}
      <Portal>
        <Modal
          visible={exerciseModalVisible}
          onDismiss={() => setExerciseModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title style={styles.modalTitle}>Add Exercise</Title>
          
          <Searchbar
            placeholder="Search exercises..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />

          <FlatList
            data={filteredExercises}
            renderItem={renderExerciseItem}
            keyExtractor={(item) => item.id}
            style={styles.exerciseList}
            showsVerticalScrollIndicator={false}
          />

          <Button
            mode="outlined"
            onPress={() => setExerciseModalVisible(false)}
            style={styles.modalButton}
          >
            Cancel
          </Button>
        </Modal>
      </Portal>

      {/* Client Selection Modal */}
      <Portal>
        <Modal
          visible={clientSelectModalVisible}
          onDismiss={() => setClientSelectModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title style={styles.modalTitle}>Assign to Client</Title>
          
          <FlatList
            data={[{ id: '', name: 'No Assignment (Template)', email: '', fitnessLevel: '', fitnessGoals: [] }, ...clients]}
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                description={item.email}
                left={(props) => <List.Icon {...props} icon="account" />}
                onPress={() => {
                  setPlanData(prev => ({ 
                    ...prev, 
                    assignedClientId: item.id,
                    isTemplate: item.id === '',
                  }));
                  setClientSelectModalVisible(false);
                }}
              />
            )}
            keyExtractor={(item) => item.id || 'template'}
            style={styles.clientList}
          />

          <Button
            mode="outlined"
            onPress={() => setClientSelectModalVisible(false)}
            style={styles.modalButton}
          >
            Cancel
          </Button>
        </Modal>
      </Portal>
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
  planInfoCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfInput: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  assignmentSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  clientButton: {
    flex: 2,
  },
  templateButton: {
    flex: 1,
  },
  workoutDaysSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dayCard: {
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayNameInput: {
    flex: 1,
    marginRight: 8,
  },
  focusAreasContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 8,
  },
  durationInput: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  exercisesSection: {
    marginTop: 8,
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exercisesTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseCard: {
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  exerciseDescription: {
    color: Colors.onSurfaceVariant,
    marginBottom: 12,
  },
  exerciseParams: {
    gap: 12,
  },
  paramRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paramInput: {
    flex: 1,
  },
  notesInput: {
    marginTop: 8,
  },
  emptyExercises: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 8,
  },
  emptyText: {
    marginBottom: 16,
    color: Colors.onSurfaceVariant,
  },
  footer: {
    marginTop: 24,
    marginBottom: 32,
  },
  createButton: {
    paddingVertical: 8,
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    margin: 20,
    borderRadius: 8,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchbar: {
    marginBottom: 16,
  },
  exerciseList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  clientList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  modalButton: {
    marginTop: 8,
  },
}); 