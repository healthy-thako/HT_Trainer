import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  TextInput,
  Button,
  Chip,
  ProgressBar,
  Surface,
  RadioButton,
  Switch,
  HelperText,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../hooks/useNavigation';
import { ClientsAPI } from '../../lib/supabase/api/clients';
import { Colors } from '../../constants/Colors';

interface ClientOnboardingData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    age: number;
    gender: 'male' | 'female' | 'other' | '';
    height: number;
    weight: number;
  };
  fitnessInfo: {
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | '';
    fitnessGoals: string[];
    workoutFrequency: number;
    preferredWorkoutTime: string;
    hasGymMembership: boolean;
    homeEquipment: string[];
  };
  healthInfo: {
    medicalConditions: string[];
    injuries: string[];
    medications: string[];
    allergies: string[];
    doctorClearance: boolean;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

const FITNESS_GOALS = [
  'Weight Loss', 'Muscle Building', 'Strength Training', 'Endurance',
  'Flexibility', 'General Fitness', 'Sports Performance', 'Rehabilitation',
  'Stress Relief', 'Better Sleep', 'Increased Energy'
];

const HOME_EQUIPMENT = [
  'Dumbbells', 'Resistance Bands', 'Yoga Mat', 'Pull-up Bar',
  'Kettlebells', 'Treadmill', 'Exercise Bike', 'Rowing Machine',
  'Stability Ball', 'Foam Roller', 'Jump Rope', 'None'
];

const WORKOUT_TIMES = [
  'Early Morning (5-7 AM)', 'Morning (7-10 AM)', 'Late Morning (10-12 PM)',
  'Afternoon (12-3 PM)', 'Late Afternoon (3-6 PM)', 'Evening (6-9 PM)',
  'Night (9-11 PM)', 'Flexible'
];

export default function AddClientScreen() {
  const { trainer } = useAuth();
  const navigation = useAppNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [clientData, setClientData] = useState<ClientOnboardingData>({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      age: 0,
      gender: '',
      height: 0,
      weight: 0,
    },
    fitnessInfo: {
      fitnessLevel: '',
      fitnessGoals: [],
      workoutFrequency: 3,
      preferredWorkoutTime: '',
      hasGymMembership: false,
      homeEquipment: [],
    },
    healthInfo: {
      medicalConditions: [],
      injuries: [],
      medications: [],
      allergies: [],
      doctorClearance: false,
    },
    emergencyContact: {
      name: '',
      phone: '',
      relationship: '',
    },
  });

  const totalSteps = 4;
  const progress = (currentStep + 1) / totalSteps;

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Personal Info
        if (!clientData.personalInfo.name.trim()) {
          newErrors.name = 'Name is required';
        }
        if (!clientData.personalInfo.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(clientData.personalInfo.email)) {
          newErrors.email = 'Please enter a valid email';
        }
        if (!clientData.personalInfo.phone.trim()) {
          newErrors.phone = 'Phone number is required';
        }
        if (clientData.personalInfo.age <= 0) {
          newErrors.age = 'Please enter a valid age';
        }
        if (!clientData.personalInfo.gender) {
          newErrors.gender = 'Please select gender';
        }
        if (clientData.personalInfo.height <= 0) {
          newErrors.height = 'Please enter height in cm';
        }
        if (clientData.personalInfo.weight <= 0) {
          newErrors.weight = 'Please enter weight in kg';
        }
        break;

      case 1: // Fitness Info
        if (!clientData.fitnessInfo.fitnessLevel) {
          newErrors.fitnessLevel = 'Please select fitness level';
        }
        if (clientData.fitnessInfo.fitnessGoals.length === 0) {
          newErrors.fitnessGoals = 'Select at least one fitness goal';
        }
        if (!clientData.fitnessInfo.preferredWorkoutTime) {
          newErrors.workoutTime = 'Please select preferred workout time';
        }
        break;

      case 2: // Health Info - Optional but validate if provided
        // Health info is mostly optional, just validate format if provided
        break;

      case 3: // Emergency Contact
        if (!clientData.emergencyContact.name.trim()) {
          newErrors.emergencyName = 'Emergency contact name is required';
        }
        if (!clientData.emergencyContact.phone.trim()) {
          newErrors.emergencyPhone = 'Emergency contact phone is required';
        }
        if (!clientData.emergencyContact.relationship.trim()) {
          newErrors.emergencyRelationship = 'Relationship is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleCreateClient();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleFitnessGoal = (goal: string) => {
    setClientData(prev => ({
      ...prev,
      fitnessInfo: {
        ...prev.fitnessInfo,
        fitnessGoals: prev.fitnessInfo.fitnessGoals.includes(goal)
          ? prev.fitnessInfo.fitnessGoals.filter(g => g !== goal)
          : [...prev.fitnessInfo.fitnessGoals, goal],
      },
    }));
  };

  const toggleEquipment = (equipment: string) => {
    setClientData(prev => ({
      ...prev,
      fitnessInfo: {
        ...prev.fitnessInfo,
        homeEquipment: prev.fitnessInfo.homeEquipment.includes(equipment)
          ? prev.fitnessInfo.homeEquipment.filter(e => e !== equipment)
          : [...prev.fitnessInfo.homeEquipment, equipment],
      },
    }));
  };

  const addHealthItem = (category: keyof typeof clientData.healthInfo, item: string) => {
    if (!item.trim()) return;
    
    setClientData(prev => ({
      ...prev,
      healthInfo: {
        ...prev.healthInfo,
        [category]: [...(prev.healthInfo[category] as string[]), item.trim()],
      },
    }));
  };

  const removeHealthItem = (category: keyof typeof clientData.healthInfo, index: number) => {
    setClientData(prev => ({
      ...prev,
      healthInfo: {
        ...prev.healthInfo,
        [category]: (prev.healthInfo[category] as string[]).filter((_, i) => i !== index),
      },
    }));
  };

  const handleCreateClient = async () => {
    if (!trainer) {
      Alert.alert('Error', 'Trainer information not found');
      return;
    }

    try {
      setLoading(true);

      const onboardingData = {
        personal_info: {
          name: clientData.personalInfo.name,
          email: clientData.personalInfo.email,
          phone_number: clientData.personalInfo.phone,
          age: clientData.personalInfo.age,
          gender: clientData.personalInfo.gender,
          height_cm: clientData.personalInfo.height,
          weight_kg: clientData.personalInfo.weight,
        },
        fitness_info: {
          fitness_level: clientData.fitnessInfo.fitnessLevel,
          fitness_goals: clientData.fitnessInfo.fitnessGoals,
          workout_frequency_per_week: clientData.fitnessInfo.workoutFrequency,
          preferred_workout_time: clientData.fitnessInfo.preferredWorkoutTime,
          has_gym_membership: clientData.fitnessInfo.hasGymMembership,
          available_equipment: clientData.fitnessInfo.homeEquipment,
        },
        health_info: {
          medical_conditions: clientData.healthInfo.medicalConditions,
          injuries: clientData.healthInfo.injuries,
          medications: clientData.healthInfo.medications,
          allergies: clientData.healthInfo.allergies,
          doctor_clearance: clientData.healthInfo.doctorClearance,
        },
        emergency_contact: clientData.emergencyContact,
      };

      const newClient = await ClientsAPI.createClientFromOnboarding(trainer.id, onboardingData);

      Alert.alert(
        'Client Added Successfully!',
        `${newClient.name} has been added to your client list. You can now create workout plans and start training sessions.`,
        [
          {
            text: 'View Client',
            onPress: () => navigation.navigate('clients/[id]', { id: newClient.id }),
          },
          {
            text: 'Add Another',
            onPress: () => {
              setCurrentStep(0);
              setClientData({
                personalInfo: {
                  name: '',
                  email: '',
                  phone: '',
                  age: 0,
                  gender: '',
                  height: 0,
                  weight: 0,
                },
                fitnessInfo: {
                  fitnessLevel: '',
                  fitnessGoals: [],
                  workoutFrequency: 3,
                  preferredWorkoutTime: '',
                  hasGymMembership: false,
                  homeEquipment: [],
                },
                healthInfo: {
                  medicalConditions: [],
                  injuries: [],
                  medications: [],
                  allergies: [],
                  doctorClearance: false,
                },
                emergencyContact: {
                  name: '',
                  phone: '',
                  relationship: '',
                },
              });
            },
          },
          {
            text: 'Back to Clients',
            onPress: () => navigation.navigateToClients(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating client:', error);
      Alert.alert('Error', 'Failed to create client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPersonalInfoStep = () => (
    <View style={styles.stepContainer}>
      <Title style={styles.stepTitle}>Personal Information</Title>
      <Paragraph style={styles.stepDescription}>
        Basic information about your new client
      </Paragraph>

      <TextInput
        label="Full Name *"
        value={clientData.personalInfo.name}
        onChangeText={(text) =>
          setClientData(prev => ({
            ...prev,
            personalInfo: { ...prev.personalInfo, name: text },
          }))
        }
        error={!!errors.name}
        style={styles.input}
      />
      <HelperText type="error" visible={!!errors.name}>
        {errors.name}
      </HelperText>

      <TextInput
        label="Email Address *"
        value={clientData.personalInfo.email}
        onChangeText={(text) =>
          setClientData(prev => ({
            ...prev,
            personalInfo: { ...prev.personalInfo, email: text },
          }))
        }
        keyboardType="email-address"
        autoCapitalize="none"
        error={!!errors.email}
        style={styles.input}
      />
      <HelperText type="error" visible={!!errors.email}>
        {errors.email}
      </HelperText>

      <TextInput
        label="Phone Number *"
        value={clientData.personalInfo.phone}
        onChangeText={(text) =>
          setClientData(prev => ({
            ...prev,
            personalInfo: { ...prev.personalInfo, phone: text },
          }))
        }
        keyboardType="phone-pad"
        error={!!errors.phone}
        style={styles.input}
      />
      <HelperText type="error" visible={!!errors.phone}>
        {errors.phone}
      </HelperText>

      <View style={styles.row}>
        <TextInput
          label="Age *"
          value={clientData.personalInfo.age > 0 ? clientData.personalInfo.age.toString() : ''}
          onChangeText={(text) =>
            setClientData(prev => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, age: parseInt(text) || 0 },
            }))
          }
          keyboardType="numeric"
          error={!!errors.age}
          style={[styles.input, styles.halfInput]}
        />
        <View style={[styles.halfInput, { marginLeft: 8 }]}>
          <Paragraph style={styles.radioLabel}>Gender *</Paragraph>
          <RadioButton.Group
            onValueChange={(value) =>
              setClientData(prev => ({
                ...prev,
                personalInfo: { ...prev.personalInfo, gender: value as any },
              }))
            }
            value={clientData.personalInfo.gender}
          >
            <View style={styles.radioRow}>
              <RadioButton.Item label="Male" value="male" />
              <RadioButton.Item label="Female" value="female" />
              <RadioButton.Item label="Other" value="other" />
            </View>
          </RadioButton.Group>
        </View>
      </View>
      <HelperText type="error" visible={!!errors.age || !!errors.gender}>
        {errors.age || errors.gender}
      </HelperText>

      <View style={styles.row}>
        <TextInput
          label="Height (cm) *"
          value={clientData.personalInfo.height > 0 ? clientData.personalInfo.height.toString() : ''}
          onChangeText={(text) =>
            setClientData(prev => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, height: parseFloat(text) || 0 },
            }))
          }
          keyboardType="numeric"
          error={!!errors.height}
          style={[styles.input, styles.halfInput]}
        />
        <TextInput
          label="Weight (kg) *"
          value={clientData.personalInfo.weight > 0 ? clientData.personalInfo.weight.toString() : ''}
          onChangeText={(text) =>
            setClientData(prev => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, weight: parseFloat(text) || 0 },
            }))
          }
          keyboardType="numeric"
          error={!!errors.weight}
          style={[styles.input, styles.halfInput, { marginLeft: 8 }]}
        />
      </View>
      <HelperText type="error" visible={!!errors.height || !!errors.weight}>
        {errors.height || errors.weight}
      </HelperText>
    </View>
  );

  const renderFitnessInfoStep = () => (
    <View style={styles.stepContainer}>
      <Title style={styles.stepTitle}>Fitness Information</Title>
      <Paragraph style={styles.stepDescription}>
        Understanding your client's fitness background and goals
      </Paragraph>

      <View style={styles.section}>
        <Paragraph style={styles.sectionTitle}>Current Fitness Level *</Paragraph>
        <RadioButton.Group
          onValueChange={(value) =>
            setClientData(prev => ({
              ...prev,
              fitnessInfo: { ...prev.fitnessInfo, fitnessLevel: value as any },
            }))
          }
          value={clientData.fitnessInfo.fitnessLevel}
        >
          <RadioButton.Item label="Beginner - New to exercise" value="beginner" />
          <RadioButton.Item label="Intermediate - Some experience" value="intermediate" />
          <RadioButton.Item label="Advanced - Very experienced" value="advanced" />
        </RadioButton.Group>
        <HelperText type="error" visible={!!errors.fitnessLevel}>
          {errors.fitnessLevel}
        </HelperText>
      </View>

      <View style={styles.section}>
        <Paragraph style={styles.sectionTitle}>Fitness Goals *</Paragraph>
        <View style={styles.chipContainer}>
          {FITNESS_GOALS.map((goal) => (
            <Chip
              key={goal}
              selected={clientData.fitnessInfo.fitnessGoals.includes(goal)}
              onPress={() => toggleFitnessGoal(goal)}
              style={styles.chip}
            >
              {goal}
            </Chip>
          ))}
        </View>
        <HelperText type="error" visible={!!errors.fitnessGoals}>
          {errors.fitnessGoals}
        </HelperText>
      </View>

      <TextInput
        label="Preferred Workout Frequency (per week)"
        value={clientData.fitnessInfo.workoutFrequency.toString()}
        onChangeText={(text) =>
          setClientData(prev => ({
            ...prev,
            fitnessInfo: { ...prev.fitnessInfo, workoutFrequency: parseInt(text) || 3 },
          }))
        }
        keyboardType="numeric"
        style={styles.input}
      />

      <View style={styles.section}>
        <Paragraph style={styles.sectionTitle}>Preferred Workout Time *</Paragraph>
        <RadioButton.Group
          onValueChange={(value) =>
            setClientData(prev => ({
              ...prev,
              fitnessInfo: { ...prev.fitnessInfo, preferredWorkoutTime: value },
            }))
          }
          value={clientData.fitnessInfo.preferredWorkoutTime}
        >
          {WORKOUT_TIMES.map((time) => (
            <RadioButton.Item key={time} label={time} value={time} />
          ))}
        </RadioButton.Group>
        <HelperText type="error" visible={!!errors.workoutTime}>
          {errors.workoutTime}
        </HelperText>
      </View>

      <View style={styles.switchContainer}>
        <Paragraph>Has Gym Membership</Paragraph>
        <Switch
          value={clientData.fitnessInfo.hasGymMembership}
          onValueChange={(value) =>
            setClientData(prev => ({
              ...prev,
              fitnessInfo: { ...prev.fitnessInfo, hasGymMembership: value },
            }))
          }
        />
      </View>

      <View style={styles.section}>
        <Paragraph style={styles.sectionTitle}>Available Home Equipment</Paragraph>
        <View style={styles.chipContainer}>
          {HOME_EQUIPMENT.map((equipment) => (
            <Chip
              key={equipment}
              selected={clientData.fitnessInfo.homeEquipment.includes(equipment)}
              onPress={() => toggleEquipment(equipment)}
              style={styles.chip}
            >
              {equipment}
            </Chip>
          ))}
        </View>
      </View>
    </View>
  );

  const renderHealthInfoStep = () => {
    const [newCondition, setNewCondition] = useState('');
    const [newInjury, setNewInjury] = useState('');
    const [newMedication, setNewMedication] = useState('');
    const [newAllergy, setNewAllergy] = useState('');

    return (
      <View style={styles.stepContainer}>
        <Title style={styles.stepTitle}>Health Information</Title>
        <Paragraph style={styles.stepDescription}>
          Important health details for safe training (Optional but recommended)
        </Paragraph>

        <View style={styles.section}>
          <Paragraph style={styles.sectionTitle}>Medical Conditions</Paragraph>
          <View style={styles.addItemContainer}>
            <TextInput
              label="Add medical condition"
              value={newCondition}
              onChangeText={setNewCondition}
              style={styles.addItemInput}
            />
            <Button
              mode="outlined"
              onPress={() => {
                addHealthItem('medicalConditions', newCondition);
                setNewCondition('');
              }}
              disabled={!newCondition.trim()}
            >
              Add
            </Button>
          </View>
          <View style={styles.chipContainer}>
            {clientData.healthInfo.medicalConditions.map((condition, index) => (
              <Chip
                key={index}
                onClose={() => removeHealthItem('medicalConditions', index)}
                style={styles.chip}
              >
                {condition}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Paragraph style={styles.sectionTitle}>Previous Injuries</Paragraph>
          <View style={styles.addItemContainer}>
            <TextInput
              label="Add injury"
              value={newInjury}
              onChangeText={setNewInjury}
              style={styles.addItemInput}
            />
            <Button
              mode="outlined"
              onPress={() => {
                addHealthItem('injuries', newInjury);
                setNewInjury('');
              }}
              disabled={!newInjury.trim()}
            >
              Add
            </Button>
          </View>
          <View style={styles.chipContainer}>
            {clientData.healthInfo.injuries.map((injury, index) => (
              <Chip
                key={index}
                onClose={() => removeHealthItem('injuries', index)}
                style={styles.chip}
              >
                {injury}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Paragraph style={styles.sectionTitle}>Current Medications</Paragraph>
          <View style={styles.addItemContainer}>
            <TextInput
              label="Add medication"
              value={newMedication}
              onChangeText={setNewMedication}
              style={styles.addItemInput}
            />
            <Button
              mode="outlined"
              onPress={() => {
                addHealthItem('medications', newMedication);
                setNewMedication('');
              }}
              disabled={!newMedication.trim()}
            >
              Add
            </Button>
          </View>
          <View style={styles.chipContainer}>
            {clientData.healthInfo.medications.map((medication, index) => (
              <Chip
                key={index}
                onClose={() => removeHealthItem('medications', index)}
                style={styles.chip}
              >
                {medication}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Paragraph style={styles.sectionTitle}>Allergies</Paragraph>
          <View style={styles.addItemContainer}>
            <TextInput
              label="Add allergy"
              value={newAllergy}
              onChangeText={setNewAllergy}
              style={styles.addItemInput}
            />
            <Button
              mode="outlined"
              onPress={() => {
                addHealthItem('allergies', newAllergy);
                setNewAllergy('');
              }}
              disabled={!newAllergy.trim()}
            >
              Add
            </Button>
          </View>
          <View style={styles.chipContainer}>
            {clientData.healthInfo.allergies.map((allergy, index) => (
              <Chip
                key={index}
                onClose={() => removeHealthItem('allergies', index)}
                style={styles.chip}
              >
                {allergy}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.switchContainer}>
          <Paragraph>Has Doctor's Clearance for Exercise</Paragraph>
          <Switch
            value={clientData.healthInfo.doctorClearance}
            onValueChange={(value) =>
              setClientData(prev => ({
                ...prev,
                healthInfo: { ...prev.healthInfo, doctorClearance: value },
              }))
            }
          />
        </View>
      </View>
    );
  };

  const renderEmergencyContactStep = () => (
    <View style={styles.stepContainer}>
      <Title style={styles.stepTitle}>Emergency Contact</Title>
      <Paragraph style={styles.stepDescription}>
        Emergency contact information for safety purposes
      </Paragraph>

      <TextInput
        label="Emergency Contact Name *"
        value={clientData.emergencyContact.name}
        onChangeText={(text) =>
          setClientData(prev => ({
            ...prev,
            emergencyContact: { ...prev.emergencyContact, name: text },
          }))
        }
        error={!!errors.emergencyName}
        style={styles.input}
      />
      <HelperText type="error" visible={!!errors.emergencyName}>
        {errors.emergencyName}
      </HelperText>

      <TextInput
        label="Emergency Contact Phone *"
        value={clientData.emergencyContact.phone}
        onChangeText={(text) =>
          setClientData(prev => ({
            ...prev,
            emergencyContact: { ...prev.emergencyContact, phone: text },
          }))
        }
        keyboardType="phone-pad"
        error={!!errors.emergencyPhone}
        style={styles.input}
      />
      <HelperText type="error" visible={!!errors.emergencyPhone}>
        {errors.emergencyPhone}
      </HelperText>

      <TextInput
        label="Relationship *"
        value={clientData.emergencyContact.relationship}
        onChangeText={(text) =>
          setClientData(prev => ({
            ...prev,
            emergencyContact: { ...prev.emergencyContact, relationship: text },
          }))
        }
        error={!!errors.emergencyRelationship}
        style={styles.input}
        placeholder="e.g., Spouse, Parent, Sibling, Friend"
      />
      <HelperText type="error" visible={!!errors.emergencyRelationship}>
        {errors.emergencyRelationship}
      </HelperText>

      <Surface style={styles.summaryContainer}>
        <Title style={styles.summaryTitle}>Client Summary</Title>
        <Paragraph><strong>Name:</strong> {clientData.personalInfo.name}</Paragraph>
        <Paragraph><strong>Email:</strong> {clientData.personalInfo.email}</Paragraph>
        <Paragraph><strong>Age:</strong> {clientData.personalInfo.age} years</Paragraph>
        <Paragraph><strong>Fitness Level:</strong> {clientData.fitnessInfo.fitnessLevel}</Paragraph>
        <Paragraph><strong>Primary Goals:</strong> {clientData.fitnessInfo.fitnessGoals.slice(0, 3).join(', ')}</Paragraph>
        <Paragraph><strong>Workout Frequency:</strong> {clientData.fitnessInfo.workoutFrequency}x per week</Paragraph>
      </Surface>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderPersonalInfoStep();
      case 1:
        return renderFitnessInfoStep();
      case 2:
        return renderHealthInfoStep();
      case 3:
        return renderEmergencyContactStep();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.header}>
          <Title style={styles.title}>Add New Client</Title>
          <ProgressBar progress={progress} color={Colors.primary} style={styles.progressBar} />
          <Paragraph style={styles.stepIndicator}>
            Step {currentStep + 1} of {totalSteps}
          </Paragraph>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.card}>
            {renderCurrentStep()}
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonContainer}>
            {currentStep > 0 && (
              <Button
                mode="outlined"
                onPress={handleBack}
                style={styles.backButton}
                disabled={loading}
              >
                Back
              </Button>
            )}
            <Button
              mode="contained"
              onPress={handleNext}
              loading={loading}
              disabled={loading}
              style={styles.nextButton}
            >
              {currentStep === totalSteps - 1 ? 'Create Client' : 'Next'}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  stepIndicator: {
    textAlign: 'center',
    color: Colors.onSurfaceVariant,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 16,
  },
  stepContainer: {
    gap: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  stepDescription: {
    textAlign: 'center',
    color: Colors.onSurfaceVariant,
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  halfInput: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 8,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  radioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addItemInput: {
    flex: 1,
  },
  summaryContainer: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.outline,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
}); 