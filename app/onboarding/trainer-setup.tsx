import React, { useState, useEffect } from 'react';
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
  Avatar,
  ProgressBar,
  Surface,
  Divider,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../hooks/useNavigation';
import { Colors } from '../../constants/Colors';
import * as ImagePicker from 'expo-image-picker';

interface TrainerOnboardingData {
  personalInfo: {
    name: string;
    bio: string;
    phone: string;
    location: string;
    profileImage?: string | undefined;
  };
  professionalInfo: {
    specializations: string[];
    certifications: string[];
    experienceYears: number;
    hourlyRate: number;
  };
  availability: {
    daysAvailable: number[];
    startTime: string;
    endTime: string;
    sessionDuration: number;
  };
}

const SPECIALIZATIONS = [
  'Weight Loss', 'Muscle Building', 'Strength Training', 'Cardio',
  'Yoga', 'Pilates', 'CrossFit', 'Bodybuilding', 'Functional Training',
  'Sports Performance', 'Rehabilitation', 'Senior Fitness', 'Youth Training'
];

const DAYS_OF_WEEK = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
];

export default function TrainerSetupScreen() {
  const { trainer, updateTrainerProfile } = useAuth();
  const navigation = useAppNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [onboardingData, setOnboardingData] = useState<TrainerOnboardingData>({
    personalInfo: {
      name: trainer?.name || '',
      bio: trainer?.bio || '',
      phone: trainer?.contact_info?.phone || '',
      location: '', // location not in Trainer interface
      profileImage: trainer?.image_url || undefined,
    },
    professionalInfo: {
      specializations: trainer?.specialties || [],
      certifications: trainer?.certification ? [trainer.certification] : [],
      experienceYears: trainer?.experience || 0,
      hourlyRate: trainer?.hourly_rate || 50,
    },
    availability: {
      daysAvailable: [1, 2, 3, 4, 5], // Default Mon-Fri
      startTime: '09:00',
      endTime: '18:00',
      sessionDuration: 60,
    },
  });

  const totalSteps = 3;
  const progress = (currentStep + 1) / totalSteps;

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Personal Info
        if (!onboardingData.personalInfo.name.trim()) {
          newErrors.name = 'Name is required';
        }
        if (!onboardingData.personalInfo.bio.trim()) {
          newErrors.bio = 'Bio is required';
        }
        if (!onboardingData.personalInfo.phone.trim()) {
          newErrors.phone = 'Phone number is required';
        }
        if (!onboardingData.personalInfo.location.trim()) {
          newErrors.location = 'Location is required';
        }
        break;

      case 1: // Professional Info
        if (onboardingData.professionalInfo.specializations.length === 0) {
          newErrors.specializations = 'Select at least one specialization';
        }
        if (onboardingData.professionalInfo.experienceYears < 0) {
          newErrors.experience = 'Experience years must be 0 or greater';
        }
        if (onboardingData.professionalInfo.hourlyRate <= 0) {
          newErrors.hourlyRate = 'Hourly rate must be greater than 0';
        }
        break;

      case 2: // Availability
        if (onboardingData.availability.daysAvailable.length === 0) {
          newErrors.availability = 'Select at least one available day';
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
        handleComplete();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setOnboardingData(prev => ({
          ...prev,
          personalInfo: {
            ...prev.personalInfo,
            profileImage: result.assets[0].uri,
          },
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const toggleSpecialization = (specialization: string) => {
    setOnboardingData(prev => ({
      ...prev,
      professionalInfo: {
        ...prev.professionalInfo,
        specializations: prev.professionalInfo.specializations.includes(specialization)
          ? prev.professionalInfo.specializations.filter(s => s !== specialization)
          : [...prev.professionalInfo.specializations, specialization],
      },
    }));
  };

  const toggleDay = (day: number) => {
    setOnboardingData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        daysAvailable: prev.availability.daysAvailable.includes(day)
          ? prev.availability.daysAvailable.filter(d => d !== day)
          : [...prev.availability.daysAvailable, day],
      },
    }));
  };

  const handleComplete = async () => {
    try {
      setLoading(true);

      // Update trainer profile
      await updateTrainerProfile({
        name: onboardingData.personalInfo.name,
        bio: onboardingData.personalInfo.bio,
        contact_info: {
          phone: onboardingData.personalInfo.phone,
          email: trainer?.contact_info?.email || '',
        },
        image_url: onboardingData.personalInfo.profileImage,
        specialties: onboardingData.professionalInfo.specializations,
        certification: onboardingData.professionalInfo.certifications.join(', '),
        experience: onboardingData.professionalInfo.experienceYears,
        hourly_rate: onboardingData.professionalInfo.hourlyRate,
      });

      Alert.alert(
        'Welcome to HT Trainer!',
        'Your profile has been set up successfully. You can now start managing clients and bookings.',
        [
          {
            text: 'Get Started',
            onPress: () => navigation.navigateToDashboard(),
          },
        ]
      );
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPersonalInfoStep = () => (
    <View style={styles.stepContainer}>
      <Title style={styles.stepTitle}>Personal Information</Title>
      <Paragraph style={styles.stepDescription}>
        Let's start with your basic information
      </Paragraph>

      <Surface style={styles.avatarContainer}>
        <Avatar.Image
          size={80}
          source={
            onboardingData.personalInfo.profileImage
              ? { uri: onboardingData.personalInfo.profileImage }
              : require('../../assets/images/default-avatar.png')
          }
        />
        <Button mode="outlined" onPress={handleImagePicker} style={styles.avatarButton}>
          Upload Photo
        </Button>
      </Surface>

      <TextInput
        label="Full Name *"
        value={onboardingData.personalInfo.name}
        onChangeText={(text) =>
          setOnboardingData(prev => ({
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
        label="Bio *"
        value={onboardingData.personalInfo.bio}
        onChangeText={(text) =>
          setOnboardingData(prev => ({
            ...prev,
            personalInfo: { ...prev.personalInfo, bio: text },
          }))
        }
        multiline
        numberOfLines={3}
        error={!!errors.bio}
        style={styles.input}
      />
      <HelperText type="error" visible={!!errors.bio}>
        {errors.bio}
      </HelperText>

      <TextInput
        label="Phone Number *"
        value={onboardingData.personalInfo.phone}
        onChangeText={(text) =>
          setOnboardingData(prev => ({
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

      <TextInput
        label="Location *"
        value={onboardingData.personalInfo.location}
        onChangeText={(text) =>
          setOnboardingData(prev => ({
            ...prev,
            personalInfo: { ...prev.personalInfo, location: text },
          }))
        }
        error={!!errors.location}
        style={styles.input}
      />
      <HelperText type="error" visible={!!errors.location}>
        {errors.location}
      </HelperText>
    </View>
  );

  const renderProfessionalInfoStep = () => (
    <View style={styles.stepContainer}>
      <Title style={styles.stepTitle}>Professional Information</Title>
      <Paragraph style={styles.stepDescription}>
        Tell us about your expertise and experience
      </Paragraph>

      <View style={styles.section}>
        <Paragraph style={styles.sectionTitle}>Specializations *</Paragraph>
        <View style={styles.chipContainer}>
          {SPECIALIZATIONS.map((spec) => (
            <Chip
              key={spec}
              selected={onboardingData.professionalInfo.specializations.includes(spec)}
              onPress={() => toggleSpecialization(spec)}
              style={styles.chip}
            >
              {spec}
            </Chip>
          ))}
        </View>
        <HelperText type="error" visible={!!errors.specializations}>
          {errors.specializations}
        </HelperText>
      </View>

      <TextInput
        label="Years of Experience *"
        value={onboardingData.professionalInfo.experienceYears.toString()}
        onChangeText={(text) =>
          setOnboardingData(prev => ({
            ...prev,
            professionalInfo: {
              ...prev.professionalInfo,
              experienceYears: parseInt(text) || 0,
            },
          }))
        }
        keyboardType="numeric"
        error={!!errors.experience}
        style={styles.input}
      />
      <HelperText type="error" visible={!!errors.experience}>
        {errors.experience}
      </HelperText>

      <TextInput
        label="Hourly Rate ($) *"
        value={onboardingData.professionalInfo.hourlyRate.toString()}
        onChangeText={(text) =>
          setOnboardingData(prev => ({
            ...prev,
            professionalInfo: {
              ...prev.professionalInfo,
              hourlyRate: parseFloat(text) || 0,
            },
          }))
        }
        keyboardType="numeric"
        error={!!errors.hourlyRate}
        style={styles.input}
      />
      <HelperText type="error" visible={!!errors.hourlyRate}>
        {errors.hourlyRate}
      </HelperText>

      <TextInput
        label="Certifications (comma separated)"
        value={onboardingData.professionalInfo.certifications.join(', ')}
        onChangeText={(text) =>
          setOnboardingData(prev => ({
            ...prev,
            professionalInfo: {
              ...prev.professionalInfo,
              certifications: text.split(',').map(cert => cert.trim()).filter(cert => cert),
            },
          }))
        }
        multiline
        style={styles.input}
      />
    </View>
  );

  const renderAvailabilityStep = () => (
    <View style={styles.stepContainer}>
      <Title style={styles.stepTitle}>Availability</Title>
      <Paragraph style={styles.stepDescription}>
        Set your default availability schedule
      </Paragraph>

      <View style={styles.section}>
        <Paragraph style={styles.sectionTitle}>Available Days *</Paragraph>
        <View style={styles.chipContainer}>
          {DAYS_OF_WEEK.map((day) => (
            <Chip
              key={day.value}
              selected={onboardingData.availability.daysAvailable.includes(day.value)}
              onPress={() => toggleDay(day.value)}
              style={styles.chip}
            >
              {day.label}
            </Chip>
          ))}
        </View>
        <HelperText type="error" visible={!!errors.availability}>
          {errors.availability}
        </HelperText>
      </View>

      <View style={styles.timeContainer}>
        <TextInput
          label="Start Time"
          value={onboardingData.availability.startTime}
          onChangeText={(text) =>
            setOnboardingData(prev => ({
              ...prev,
              availability: { ...prev.availability, startTime: text },
            }))
          }
          style={[styles.input, styles.timeInput]}
        />
        <TextInput
          label="End Time"
          value={onboardingData.availability.endTime}
          onChangeText={(text) =>
            setOnboardingData(prev => ({
              ...prev,
              availability: { ...prev.availability, endTime: text },
            }))
          }
          style={[styles.input, styles.timeInput]}
        />
      </View>

      <TextInput
        label="Session Duration (minutes)"
        value={onboardingData.availability.sessionDuration.toString()}
        onChangeText={(text) =>
          setOnboardingData(prev => ({
            ...prev,
            availability: {
              ...prev.availability,
              sessionDuration: parseInt(text) || 60,
            },
          }))
        }
        keyboardType="numeric"
        style={styles.input}
      />
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderPersonalInfoStep();
      case 1:
        return renderProfessionalInfoStep();
      case 2:
        return renderAvailabilityStep();
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
          <Title style={styles.title}>Complete Your Profile</Title>
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
              {currentStep === totalSteps - 1 ? 'Complete Setup' : 'Next'}
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
  avatarContainer: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  avatarButton: {
    marginTop: 12,
  },
  input: {
    marginBottom: 8,
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
  timeContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  timeInput: {
    flex: 1,
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