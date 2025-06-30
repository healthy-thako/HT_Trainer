import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Button,
  Avatar,
  List,
  Switch,
  Portal,
  Modal,
  TextInput,
  Chip,
  Divider,
  Title,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';
import { Trainer } from '../../types';
import * as ImagePicker from 'expo-image-picker';

interface UserProfile {
  id: string;
  user_id: string;
  age?: number;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  fitness_level?: string;
  fitness_goals?: string[];
  profile_completed: boolean;
}

export default function ProfileScreen() {
  const { trainer, user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    specialty: '',
    experience: '',
    contact_phone: '',
    contact_email: '',
  });

  // Settings state
  const [notifications, setNotifications] = useState({
    push_enabled: true,
    email_enabled: true,
    booking_updates: true,
    chat_messages: true,
    marketing: false,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        router.push('/auth');
        return;
      }

      // Use trainer from context if available
      if (trainer) {
        setEditForm({
          name: trainer.name || '',
          description: trainer.bio || '',
          specialty: trainer.specialties?.[0] || '',
          experience: trainer.experience?.toString() || '',
          contact_phone: trainer.contact_info?.phone || '',
          contact_email: trainer.contact_info?.email || '',
        });
      }

      // Load user profile
      const { data: userProfileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (userProfileData) {
        setUserProfile(userProfileData);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const handleImageUpload = async () => {
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
        // Here you would implement image upload to Supabase Storage
        // For now, we'll just update the image_url
        const imageUri = result.assets[0].uri;
        
        if (trainer) {
          const { error } = await supabase
            .from('trainers')
            .update({ image_url: imageUri })
            .eq('id', trainer.id);

          if (error) throw error;
          
          Alert.alert('Success', 'Profile picture updated');
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!trainer) return;

      const { error } = await supabase
        .from('trainers')
        .update({
          name: editForm.name,
          bio: editForm.description,
          specialties: editForm.specialty ? [editForm.specialty] : [],
          experience: parseInt(editForm.experience) || 0,
          contact_info: {
            phone: editForm.contact_phone,
            email: editForm.contact_email,
          },
        })
        .eq('id', trainer.id);

      if (error) throw error;

      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.push('/auth');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  // Navigation handlers
  const handleAnalytics = () => router.push('/analytics');
  const handleEarnings = () => router.push('/earnings');
  const handleClients = () => router.push('/clients');
  const handleAvailability = () => router.push('/availability');
  const handleNutrition = () => router.push('/nutrition');
  const handleBookings = () => router.push('/bookings');
  const handleChat = () => router.push('/chat');

  // New navigation handlers
  const handleCompleteSetup = () => router.push('/onboarding/trainer-setup');
  const handleAddClient = () => router.push('/clients/add-client');
  const handleCreateWorkout = () => router.push('/workouts/create-plan');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
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
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <Card.Content style={styles.headerContent}>
            <TouchableOpacity onPress={handleImageUpload}>
              <Avatar.Image
                size={80}
                source={
                  trainer?.image_url
                    ? { uri: trainer.image_url }
                    : require('../../assets/icon.png')
                }
              />
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{trainer?.name || user?.email}</Text>
              <Text style={styles.specialty}>
                {trainer?.specialties?.[0] || 'Personal Trainer'}
              </Text>
              
              <View style={styles.ratingContainer}>
                <Text style={styles.rating}>⭐ {trainer?.rating || '0.0'}</Text>
                <Text style={styles.reviews}>
                  ${trainer?.hourly_rate || 0}/hr
                </Text>
              </View>
              
              <View style={styles.statusContainer}>
                <Chip 
                  mode="outlined" 
                  style={[
                    styles.statusChip,
                    { backgroundColor: trainer?.is_available ? Colors.success : Colors.warning }
                  ]}
                >
                  {trainer?.is_available ? 'Available' : 'Unavailable'}
                </Chip>
              </View>
            </View>
          </Card.Content>
          
          <Card.Actions>
            <Button onPress={() => setEditModalVisible(true)}>
              Edit Profile
            </Button>
            <Button onPress={() => setSettingsModalVisible(true)}>
              Settings
            </Button>
          </Card.Actions>
        </Card>

        {/* Quick Actions Section */}
        <Card style={styles.quickActionsCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Quick Actions</Title>
            <View style={styles.quickActionsGrid}>
              <Button
                mode="contained"
                onPress={handleAddClient}
                icon="account-plus"
                style={styles.quickActionButton}
              >
                Add Client
              </Button>
              <Button
                mode="outlined"
                onPress={handleCreateWorkout}
                icon="dumbbell"
                style={styles.quickActionButton}
              >
                Create Plan
              </Button>
              <Button
                mode="outlined"
                onPress={handleCompleteSetup}
                icon="account-edit"
                style={styles.quickActionButton}
              >
                Update Profile
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Business Tools */}
        <Card style={styles.card}>
          <Card.Title title="Business Tools" />
          <Card.Content>
            <List.Item
              title="Analytics"
              description="View performance insights"
              left={(props) => <List.Icon {...props} icon="chart-line" />}
              onPress={handleAnalytics}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
            <List.Item
              title="Earnings"
              description="Track your income and payments"
              left={(props) => <List.Icon {...props} icon="currency-usd" />}
              onPress={handleEarnings}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
            <List.Item
              title="Nutrition Plans"
              description="Create and manage meal plans"
              left={(props) => <List.Icon {...props} icon="nutrition" />}
              onPress={handleNutrition}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </Card.Content>
        </Card>

        {/* Profile Details */}
        <Card style={styles.card}>
          <Card.Title title="About" />
          <Card.Content>
            <Text style={styles.description}>
              {trainer?.bio || 'No description available'}
            </Text>
            
            {trainer?.experience && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Experience:</Text>
                <Text style={styles.infoValue}>{trainer.experience} years</Text>
              </View>
            )}
            
            {trainer?.certification && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Certification:</Text>
                <Text style={styles.infoValue}>{trainer.certification}</Text>
              </View>
            )}
            
            {trainer?.specialties && trainer.specialties.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Specializations:</Text>
                <View style={styles.chipsContainer}>
                  {trainer.specialties.map((specialty, index) => (
                    <Chip key={index} style={styles.chip}>
                      {specialty}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Account Actions */}
        <Card style={styles.card}>
          <Card.Title title="Account" />
          <Card.Content>
            <List.Item
              title="Logout"
              description="Sign out of your account"
              left={(props) => <List.Icon {...props} icon="logout" />}
              onPress={handleLogout}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </Card.Content>
        </Card>

        {/* Edit Profile Modal */}
        <Portal>
          <Modal
            visible={editModalVisible}
            onDismiss={() => setEditModalVisible(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <ScrollView>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              
              <TextInput
                label="Name"
                value={editForm.name}
                onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                style={styles.input}
              />
              
              <TextInput
                label="Specialty"
                value={editForm.specialty}
                onChangeText={(text) => setEditForm({ ...editForm, specialty: text })}
                style={styles.input}
              />
              
              <TextInput
                label="Experience (years)"
                value={editForm.experience}
                onChangeText={(text) => setEditForm({ ...editForm, experience: text })}
                keyboardType="numeric"
                style={styles.input}
              />
              
              <TextInput
                label="Description"
                value={editForm.description}
                onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                multiline
                numberOfLines={4}
                style={styles.input}
              />
              
              <TextInput
                label="Phone"
                value={editForm.contact_phone}
                onChangeText={(text) => setEditForm({ ...editForm, contact_phone: text })}
                keyboardType="phone-pad"
                style={styles.input}
              />
              
              <TextInput
                label="Email"
                value={editForm.contact_email}
                onChangeText={(text) => setEditForm({ ...editForm, contact_email: text })}
                keyboardType="email-address"
                style={styles.input}
              />
              
              <View style={styles.modalActions}>
                <Button onPress={() => setEditModalVisible(false)}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={handleSaveProfile}>
                  Save
                </Button>
              </View>
            </ScrollView>
          </Modal>
        </Portal>

        {/* Settings Modal */}
        <Portal>
          <Modal
            visible={settingsModalVisible}
            onDismiss={() => setSettingsModalVisible(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <Text style={styles.modalTitle}>Settings</Text>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Switch
                value={notifications.push_enabled}
                onValueChange={(value) =>
                  setNotifications({ ...notifications, push_enabled: value })
                }
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Switch
                value={notifications.email_enabled}
                onValueChange={(value) =>
                  setNotifications({ ...notifications, email_enabled: value })
                }
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Booking Updates</Text>
              <Switch
                value={notifications.booking_updates}
                onValueChange={(value) =>
                  setNotifications({ ...notifications, booking_updates: value })
                }
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Chat Messages</Text>
              <Switch
                value={notifications.chat_messages}
                onValueChange={(value) =>
                  setNotifications({ ...notifications, chat_messages: value })
                }
              />
            </View>
            
            <View style={styles.modalActions}>
              <Button onPress={() => setSettingsModalVisible(false)}>
                Close
              </Button>
            </View>
          </Modal>
        </Portal>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  specialty: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  reviews: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  card: {
    margin: 16,
    marginTop: 8,
  },
  description: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  infoRow: {
    marginTop: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  quickActionsCard: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
  },
}); 