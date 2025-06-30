import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Button, TextInput, Card, Title, Paragraph, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { GradientBackground, GradientButton } from '../../components/ui/GradientBackground';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Registration form state - Enhanced to match database schema
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [description, setDescription] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [sessionPackageRate, setSessionPackageRate] = useState('');
  const [certification, setCertification] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  // Predefined specialties for easy selection
  const commonSpecialties = [
    'Weight Training', 'Cardio', 'Yoga', 'Pilates', 'CrossFit', 
    'Personal Training', 'Group Fitness', 'Nutrition Coaching',
    'Strength Training', 'HIIT', 'Functional Training', 'Sports Training'
  ];

  // Common certifications
  const commonCertifications = [
    'NASM', 'ACE', 'ACSM', 'NSCA', 'ISSA', 'NCSF', 'NFPT', 'AFAA'
  ];

  const handleLogin = async () => {
    console.log('🔘 Login button pressed');
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      console.log('🔐 Attempting login with:', email);
      await signIn(email, password);
    } catch (error: any) {
      console.error('❌ Login error:', error);
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    console.log('🔘 Register button pressed');
    if (!email || !password || !name || !description || !location) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Email, Password, Description, Location)');
      return;
    }

    try {
      setLoading(true);
      console.log('📝 Attempting registration for:', email);
      
      // Prepare trainer data according to database schema
      const trainerData = {
        name,
        bio,
        description, // Professional description
        specialty: specialties.length > 0 ? specialties[0] : specialty, // Primary specialty
        specialties: specialties.length > 0 ? specialties : specialty.split(',').map(s => s.trim()).filter(s => s),
        experience: experience ? `${experience} years` : '0 years',
        pricing: {
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : 0,
          session_packages: sessionPackageRate ? [
            {
              sessions: 4,
              price: parseFloat(sessionPackageRate) * 4 * 0.9, // 10% discount for package
              description: '4-session package (10% discount)'
            },
            {
              sessions: 8,
              price: parseFloat(sessionPackageRate) * 8 * 0.85, // 15% discount for larger package
              description: '8-session package (15% discount)'
            }
          ] : []
        },
        certifications: certifications.length > 0 ? certifications : (certification ? [certification] : []),
        contact_phone: phone,
        contact_email: email,
        location,
        status: 'active' // Set as active since email verification is disabled
      };

      await signUp(email, password, trainerData);
      Alert.alert('Success', 'Account created successfully! Welcome to Healthy Thako!');
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setBio('');
    setDescription('');
    setSpecialty('');
    setSpecialties([]);
    setExperience('');
    setHourlyRate('');
    setSessionPackageRate('');
    setCertification('');
    setCertifications([]);
    setPhone('');
    setLocation('');
  };

  const toggleMode = () => {
    console.log('🔄 Toggle button pressed, switching to:', !isLogin ? 'login' : 'register');
    setIsLogin(!isLogin);
    resetForm();
  };

  // Helper functions for specialty and certification management
  const addSpecialty = (specialtyToAdd: string) => {
    if (!specialties.includes(specialtyToAdd) && specialties.length < 5) {
      setSpecialties([...specialties, specialtyToAdd]);
    }
  };

  const removeSpecialty = (specialtyToRemove: string) => {
    setSpecialties(specialties.filter(s => s !== specialtyToRemove));
  };

  const addCertification = (certToAdd: string) => {
    if (!certifications.includes(certToAdd) && certifications.length < 10) {
      setCertifications([...certifications, certToAdd]);
    }
  };

  const removeCertification = (certToRemove: string) => {
    setCertifications(certifications.filter(c => c !== certToRemove));
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Logo */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>HT</Text>
              </View>
              <Text style={styles.appTitle}>Healthy Thako</Text>
              <Text style={styles.subtitle}>
                Professional Fitness Training Platform
              </Text>
            </View>
          </View>

          {/* Auth Card */}
          <Card style={styles.authCard}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Title style={styles.cardTitle}>
                  {isLogin ? 'Welcome Back' : 'Join as Trainer'}
                </Title>
                <Text style={styles.cardSubtitle}>
                  {isLogin 
                    ? 'Sign in to your trainer account' 
                    : 'Create your professional trainer profile'
                  }
                </Text>
              </View>
              
              {isLogin ? (
                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Email Address"
                      value={email}
                      onChangeText={setEmail}
                      mode="outlined"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.input}
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                      left={<TextInput.Icon icon="email" />}
                    />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Password"
                      value={password}
                      onChangeText={setPassword}
                      mode="outlined"
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                      left={<TextInput.Icon icon="lock" />}
                      right={
                        <TextInput.Icon 
                          icon={showPassword ? "eye-off" : "eye"} 
                          onPress={() => setShowPassword(!showPassword)}
                        />
                      }
                    />
                  </View>

                  <GradientButton
                    onPress={handleLogin}
                    disabled={loading}
                    style={styles.primaryButton}
                  >
                    <View style={styles.buttonContent}>
                      {loading ? (
                        <Text style={styles.buttonText}>Signing In...</Text>
                      ) : (
                        <>
                          <Ionicons name="log-in" size={20} color={Colors.white} />
                          <Text style={styles.buttonText}>Sign In</Text>
                        </>
                      )}
                    </View>
                  </GradientButton>
                </View>
              ) : (
                <View style={styles.form}>
                  {/* Basic Information */}
                  <Text style={styles.sectionTitle}>Basic Information</Text>
                  
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Full Name *"
                      value={name}
                      onChangeText={setName}
                      mode="outlined"
                      style={styles.input}
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                      left={<TextInput.Icon icon="account" />}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Email Address *"
                      value={email}
                      onChangeText={setEmail}
                      mode="outlined"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.input}
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                      left={<TextInput.Icon icon="email" />}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Password *"
                      value={password}
                      onChangeText={setPassword}
                      mode="outlined"
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                      left={<TextInput.Icon icon="lock" />}
                      right={
                        <TextInput.Icon 
                          icon={showPassword ? "eye-off" : "eye"} 
                          onPress={() => setShowPassword(!showPassword)}
                        />
                      }
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Phone Number"
                      value={phone}
                      onChangeText={setPhone}
                      mode="outlined"
                      keyboardType="phone-pad"
                      style={styles.input}
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                      left={<TextInput.Icon icon="phone" />}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Location *"
                      value={location}
                      onChangeText={setLocation}
                      mode="outlined"
                      placeholder="e.g., New York, NY or Online"
                      style={styles.input}
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                      left={<TextInput.Icon icon="map-marker" />}
                    />
                  </View>

                  {/* Professional Information */}
                  <Text style={styles.sectionTitle}>Professional Information</Text>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Professional Description *"
                      value={description}
                      onChangeText={setDescription}
                      mode="outlined"
                      multiline
                      numberOfLines={3}
                      placeholder="Describe your training approach, experience, and what makes you unique..."
                      style={[styles.input, styles.textArea]}
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                      left={<TextInput.Icon icon="text-box" />}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Experience (years)"
                      value={experience}
                      onChangeText={setExperience}
                      mode="outlined"
                      keyboardType="numeric"
                      placeholder="e.g., 5"
                      style={styles.input}
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                      left={<TextInput.Icon icon="trophy" />}
                    />
                  </View>

                  {/* Specialties Section */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.fieldLabel}>Specialties</Text>
                    <Text style={styles.fieldHint}>Select up to 5 specialties</Text>
                    <View style={styles.chipContainer}>
                      {commonSpecialties.map((spec) => (
                        <Chip
                          key={spec}
                          mode={specialties.includes(spec) ? 'flat' : 'outlined'}
                          selected={specialties.includes(spec)}
                          onPress={() => specialties.includes(spec) ? removeSpecialty(spec) : addSpecialty(spec)}
                          style={[
                            styles.chip,
                            specialties.includes(spec) && styles.selectedChip
                          ]}
                          textStyle={specialties.includes(spec) && styles.selectedChipText}
                        >
                          {spec}
                        </Chip>
                      ))}
                    </View>
                    {specialties.length > 0 && (
                      <View style={styles.selectedContainer}>
                        <Text style={styles.selectedLabel}>Selected:</Text>
                        <View style={styles.selectedChips}>
                          {specialties.map((spec) => (
                            <Chip
                              key={spec}
                              mode="flat"
                              onClose={() => removeSpecialty(spec)}
                              style={styles.selectedChip}
                              textStyle={styles.selectedChipText}
                            >
                              {spec}
                            </Chip>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Certifications Section */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.fieldLabel}>Certifications</Text>
                    <Text style={styles.fieldHint}>Select your certifications</Text>
                    <View style={styles.chipContainer}>
                      {commonCertifications.map((cert) => (
                        <Chip
                          key={cert}
                          mode={certifications.includes(cert) ? 'flat' : 'outlined'}
                          selected={certifications.includes(cert)}
                          onPress={() => certifications.includes(cert) ? removeCertification(cert) : addCertification(cert)}
                          style={[
                            styles.chip,
                            certifications.includes(cert) && styles.selectedChip
                          ]}
                          textStyle={certifications.includes(cert) && styles.selectedChipText}
                        >
                          {cert}
                        </Chip>
                      ))}
                    </View>
                    {certifications.length > 0 && (
                      <View style={styles.selectedContainer}>
                        <Text style={styles.selectedLabel}>Selected:</Text>
                        <View style={styles.selectedChips}>
                          {certifications.map((cert) => (
                            <Chip
                              key={cert}
                              mode="flat"
                              onClose={() => removeCertification(cert)}
                              style={styles.selectedChip}
                              textStyle={styles.selectedChipText}
                            >
                              {cert}
                            </Chip>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Pricing Information */}
                  <Text style={styles.sectionTitle}>Pricing Information</Text>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Hourly Rate ($)"
                      value={hourlyRate}
                      onChangeText={setHourlyRate}
                      mode="outlined"
                      keyboardType="numeric"
                      placeholder="e.g., 75"
                      style={styles.input}
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                      left={<TextInput.Icon icon="cash" />}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Session Package Rate ($)"
                      value={sessionPackageRate}
                      onChangeText={setSessionPackageRate}
                      mode="outlined"
                      keyboardType="numeric"
                      placeholder="e.g., 70 (per session in packages)"
                      style={styles.input}
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                      left={<TextInput.Icon icon="package-variant" />}
                    />
                    <Text style={styles.fieldHint}>
                      Optional: Rate per session when sold in packages (usually lower than hourly rate)
                    </Text>
                  </View>

                  {/* Personal Bio */}
                  <Text style={styles.sectionTitle}>Personal Touch</Text>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Personal Bio"
                      value={bio}
                      onChangeText={setBio}
                      mode="outlined"
                      multiline
                      numberOfLines={3}
                      placeholder="Share something personal about yourself, your fitness journey, or what motivates you..."
                      style={[styles.input, styles.textArea]}
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                      left={<TextInput.Icon icon="heart" />}
                    />
                  </View>

                  <GradientButton
                    onPress={handleRegister}
                    disabled={loading}
                    style={styles.primaryButton}
                  >
                    <View style={styles.buttonContent}>
                      {loading ? (
                        <Text style={styles.buttonText}>Creating Account...</Text>
                      ) : (
                        <>
                          <Ionicons name="person-add" size={20} color={Colors.white} />
                          <Text style={styles.buttonText}>Create Account</Text>
                        </>
                      )}
                    </View>
                  </GradientButton>
                </View>
              )}

              {/* Toggle Mode */}
              <View style={styles.toggleContainer}>
                <Text style={styles.toggleText}>
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                </Text>
                <TouchableOpacity onPress={toggleMode}>
                  <Text style={styles.toggleButton}>
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  authCard: {
    borderRadius: 24,
    elevation: 8,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    marginBottom: 20,
  },
  cardContent: {
    padding: 24,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.surface,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
  },
  primaryButton: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
  },
  toggleText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  toggleButton: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 24,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    marginBottom: 4,
  },
  selectedChip: {
    backgroundColor: Colors.primary,
  },
  selectedChipText: {
    color: Colors.white,
  },
  selectedContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
}); 