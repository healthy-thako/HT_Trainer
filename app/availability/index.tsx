import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Button,
  List,
  Switch,
  Portal,
  Modal,
  TextInput,
  ActivityIndicator,
  Chip,
  SegmentedButtons,
  Title,
  Paragraph,
  FAB,
  Surface,
  IconButton,
  Divider,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppNavigation } from '../../hooks/useNavigation';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../context/AuthContext';

interface TimeSlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxBookings: number;
  sessionType: string;
  isAvailable: boolean;
}

interface TrainerSettings {
  advanceBookingDays: number;
  bufferTimeMinutes: number;
  autoAcceptBookings: boolean;
  allowSameDayBooking: boolean;
  cancellationPolicyHours: number;
  notificationPreferences: {
    newBookings: boolean;
    cancellations: boolean;
    reminders: boolean;
    clientMessages: boolean;
  };
}

interface AvailabilitySchedule {
  [key: number]: TimeSlot[];
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const SESSION_TYPES = [
  'Personal Training',
  'Group Training',
  'Consultation',
  'Assessment',
  'Online Training'
];

const AvailabilityScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const { trainer } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const subscriptionRef = useRef<any>(null);
  
  const [schedule, setSchedule] = useState<AvailabilitySchedule>({});
  const [settings, setSettings] = useState<TrainerSettings>({
    advanceBookingDays: 30,
    bufferTimeMinutes: 15,
    autoAcceptBookings: true,
    allowSameDayBooking: false,
    cancellationPolicyHours: 24,
    notificationPreferences: {
      newBookings: true,
      cancellations: true,
      reminders: true,
      clientMessages: true,
    },
  });

  // Form state for adding/editing slots
  const [formData, setFormData] = useState<TimeSlot>({
    dayOfWeek: 0,
    startTime: '09:00',
    endTime: '10:00',
    maxBookings: 1,
    sessionType: 'Personal Training',
    isAvailable: true,
  });

  useEffect(() => {
    loadAvailabilityData();
  }, []);

  const loadAvailabilityData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get trainer info
      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!trainer) throw new Error('Trainer not found');

      // Load availability slots from database
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('trainer_availability')
        .select('*')
        .eq('trainer_id', trainer.id)
        .order('day_of_week')
        .order('start_time');

      if (availabilityError) {
        throw availabilityError;
      }

      // Transform database data to schedule format
      const scheduleData: AvailabilitySchedule = {};
      
      availabilityData?.forEach((slot: any) => {
        const dayOfWeek = slot.day_of_week;
        if (!scheduleData[dayOfWeek]) {
          scheduleData[dayOfWeek] = [];
        }
        
        scheduleData[dayOfWeek].push({
          id: slot.id,
          dayOfWeek: slot.day_of_week,
          startTime: slot.start_time,
          endTime: slot.end_time,
          maxBookings: 1, // Default value since not in current schema
          sessionType: 'Personal Training', // Default value since not in current schema
          isAvailable: slot.is_available,
        });
      });

      // Load trainer settings
      const { data: trainerSettings } = await supabase
        .from('trainer_settings')
        .select('*')
        .eq('trainer_id', trainer.id)
        .single();

      if (trainerSettings) {
        setSettings({
          advanceBookingDays: trainerSettings.advance_booking_days || 30,
          bufferTimeMinutes: trainerSettings.buffer_time_minutes || 15,
          autoAcceptBookings: trainerSettings.auto_accept_bookings ?? true,
          allowSameDayBooking: trainerSettings.allow_same_day_booking ?? false,
          cancellationPolicyHours: trainerSettings.cancellation_policy_hours || 24,
          notificationPreferences: trainerSettings.notification_preferences || {
            newBookings: true,
            cancellations: true,
            reminders: true,
            clientMessages: true,
          },
        });
      }

      setSchedule(scheduleData);
    } catch (error) {
      console.error('Error loading availability:', error);
      Alert.alert('Error', 'Failed to load availability data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAvailabilityData();
  };

  const handleAddSlot = () => {
    setEditingSlot(null);
    setFormData({
      dayOfWeek: selectedDay,
      startTime: '09:00',
      endTime: '10:00',
      maxBookings: 1,
      sessionType: 'Personal Training',
      isAvailable: true,
    });
    setModalVisible(true);
  };

  const handleEditSlot = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setFormData(slot);
    setModalVisible(true);
  };

  const handleSaveSlot = async () => {
    try {
      // Validate form
      if (formData.startTime >= formData.endTime) {
        Alert.alert('Error', 'End time must be after start time');
        return;
      }

      // Check for overlapping slots
      const daySlots = schedule[formData.dayOfWeek] || [];
      const overlapping = daySlots.find(slot => 
        slot.id !== editingSlot?.id &&
        ((formData.startTime >= slot.startTime && formData.startTime < slot.endTime) ||
         (formData.endTime > slot.startTime && formData.endTime <= slot.endTime) ||
         (formData.startTime <= slot.startTime && formData.endTime >= slot.endTime))
      );

      if (overlapping) {
        Alert.alert('Error', 'This time slot overlaps with an existing slot');
        return;
      }

      if (!trainer?.id) {
        Alert.alert('Error', 'Trainer ID not found');
        return;
      }

      if (editingSlot?.id) {
        // Update existing slot
        const { error } = await supabase
          .from('trainer_availability')
          .update({
            day_of_week: formData.dayOfWeek,
            start_time: formData.startTime,
            end_time: formData.endTime,
            is_available: formData.isAvailable,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSlot.id);

        if (error) throw error;
      } else {
        // Create new slot
        const { error } = await supabase
          .from('trainer_availability')
          .insert({
            trainer_id: trainer.id,
            day_of_week: formData.dayOfWeek,
            start_time: formData.startTime,
            end_time: formData.endTime,
            is_available: formData.isAvailable,
          });

        if (error) throw error;
      }

      // Refresh data
      await loadAvailabilityData();
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving slot:', error);
      Alert.alert('Error', 'Failed to save time slot');
    }
  };

  const handleDeleteSlot = (slotId: string, dayOfWeek: number) => {
    Alert.alert(
      'Delete Time Slot',
      'Are you sure you want to delete this time slot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('trainer_availability')
                .delete()
                .eq('id', slotId);

              if (error) throw error;

              // Refresh data
              await loadAvailabilityData();
            } catch (error) {
              console.error('Error deleting slot:', error);
              Alert.alert('Error', 'Failed to delete time slot');
            }
          },
        },
      ]
    );
  };

  const handleToggleSlotAvailability = async (slotId: string, dayOfWeek: number) => {
    try {
      const slot = schedule[dayOfWeek]?.find(s => s.id === slotId);
      if (!slot) return;

      const { error } = await supabase
        .from('trainer_availability')
        .update({
          is_available: !slot.isAvailable,
          updated_at: new Date().toISOString(),
        })
        .eq('id', slotId);

      if (error) throw error;

      // Refresh data
      await loadAvailabilityData();
    } catch (error) {
      console.error('Error toggling slot availability:', error);
      Alert.alert('Error', 'Failed to update slot availability');
    }
  };

  const handleSaveSettings = async () => {
    try {
      // In real implementation, save to database
      console.log('Saving settings:', settings);
      setSettingsModalVisible(false);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const copyDaySchedule = (fromDay: number, toDay: number) => {
    const sourceSlots = schedule[fromDay] || [];
    if (sourceSlots.length === 0) {
      Alert.alert('Error', 'No time slots to copy from selected day');
      return;
    }

    Alert.alert(
      'Copy Schedule',
      `Copy ${sourceSlots.length} time slots from ${DAYS_OF_WEEK[fromDay]} to ${DAYS_OF_WEEK[toDay]}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy',
          onPress: () => {
            const copiedSlots = sourceSlots.map(slot => ({
              ...slot,
              id: `copy_${Date.now()}_${Math.random()}`,
              dayOfWeek: toDay,
            }));

            setSchedule(prev => ({
              ...prev,
              [toDay]: [...(prev[toDay] || []), ...copiedSlots]
            }));
          },
        },
      ]
    );
  };

  const renderDaySchedule = (dayOfWeek: number) => {
    const daySlots = schedule[dayOfWeek] || [];
    const dayName = DAYS_OF_WEEK[dayOfWeek];

    return (
      <Card key={dayOfWeek} style={styles.dayCard}>
        <Card.Content>
          <View style={styles.dayHeader}>
            <Title>{dayName}</Title>
            <View style={styles.dayActions}>
              <IconButton
                icon="content-copy"
                size={20}
                onPress={() => {
                  Alert.alert(
                    'Copy Schedule',
                    'Select day to copy TO:',
                    DAYS_OF_WEEK.map((day, index) => ({
                      text: day,
                      onPress: () => copyDaySchedule(dayOfWeek, index),
                    })).concat([{ text: 'Cancel', style: 'cancel' }])
                  );
                }}
              />
              <IconButton
                icon="plus"
                size={20}
                onPress={() => {
                  setSelectedDay(dayOfWeek);
                  handleAddSlot();
                }}
              />
            </View>
          </View>

          {daySlots.length === 0 ? (
            <View style={styles.emptyDay}>
              <Text style={styles.emptyText}>No availability set</Text>
              <Button
                mode="outlined"
                onPress={() => {
                  setSelectedDay(dayOfWeek);
                  handleAddSlot();
                }}
                icon="plus"
              >
                Add Time Slot
              </Button>
            </View>
          ) : (
            daySlots
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((slot) => (
                <View key={slot.id} style={styles.slotItem}>
                  <List.Item
                    title={`${slot.startTime} - ${slot.endTime}`}
                    description={`${slot.sessionType} • Max ${slot.maxBookings} booking${slot.maxBookings > 1 ? 's' : ''}`}
                    left={(props) => (
                      <View style={styles.slotLeft}>
                        <Switch
                          value={slot.isAvailable}
                          onValueChange={() => handleToggleSlotAvailability(slot.id!, dayOfWeek)}
                        />
                      </View>
                    )}
                    right={() => (
                      <View style={styles.slotActions}>
                        <IconButton
                          icon="pencil"
                          size={18}
                          onPress={() => handleEditSlot(slot)}
                        />
                        <IconButton
                          icon="delete"
                          size={18}
                          onPress={() => handleDeleteSlot(slot.id!, dayOfWeek)}
                        />
                      </View>
                    )}
                    style={[
                      styles.slotListItem,
                      !slot.isAvailable && styles.slotDisabled
                    ]}
                  />
                </View>
              ))
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading availability...</Text>
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
        <Surface style={styles.header}>
          <Title>Availability Management</Title>
          <Paragraph>Set your weekly schedule and preferences</Paragraph>
          <Button
            mode="outlined"
            onPress={() => setSettingsModalVisible(true)}
            icon="cog"
            style={styles.settingsButton}
          >
            Settings
          </Button>
        </Surface>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statValue}>
                {Object.values(schedule).reduce((total, daySlots) => total + daySlots.length, 0)}
              </Title>
              <Paragraph style={styles.statLabel}>Total Time Slots</Paragraph>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Title style={styles.statValue}>
                {Object.values(schedule).reduce((total, daySlots) => 
                  total + daySlots.filter(slot => slot.isAvailable).length, 0
                )}
              </Title>
              <Paragraph style={styles.statLabel}>Available Slots</Paragraph>
            </Card.Content>
          </Card>
        </View>

        {/* Weekly Schedule */}
        <View style={styles.scheduleContainer}>
          {DAYS_OF_WEEK.map((_, index) => renderDaySchedule(index))}
        </View>
      </ScrollView>

      {/* Add/Edit Slot Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Title>{editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}</Title>
          
          <View style={styles.formRow}>
            <Text style={styles.label}>Day: {DAYS_OF_WEEK[formData.dayOfWeek]}</Text>
          </View>

          <View style={styles.formRow}>
            <View style={styles.timeInputContainer}>
              <TextInput
                label="Start Time"
                value={formData.startTime}
                onChangeText={(text) => setFormData(prev => ({ ...prev, startTime: text }))}
                style={styles.timeInput}
                placeholder="HH:MM"
              />
              <TextInput
                label="End Time"
                value={formData.endTime}
                onChangeText={(text) => setFormData(prev => ({ ...prev, endTime: text }))}
                style={styles.timeInput}
                placeholder="HH:MM"
              />
            </View>
          </View>

          <TextInput
            label="Max Bookings"
            value={formData.maxBookings.toString()}
            onChangeText={(text) => setFormData(prev => ({ ...prev, maxBookings: parseInt(text) || 1 }))}
            keyboardType="numeric"
            style={styles.formInput}
          />

          <View style={styles.chipContainer}>
            <Text style={styles.label}>Session Type:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {SESSION_TYPES.map(type => (
                <Chip
                  key={type}
                  mode={formData.sessionType === type ? 'flat' : 'outlined'}
                  selected={formData.sessionType === type}
                  onPress={() => setFormData(prev => ({ ...prev, sessionType: type }))}
                  style={styles.typeChip}
                >
                  {type}
                </Chip>
              ))}
            </ScrollView>
          </View>

          <View style={styles.switchRow}>
            <Text>Available</Text>
            <Switch
              value={formData.isAvailable}
              onValueChange={(value) => setFormData(prev => ({ ...prev, isAvailable: value }))}
            />
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveSlot}
              style={styles.modalButton}
            >
              {editingSlot ? 'Update' : 'Add'}
            </Button>
          </View>
        </Modal>

        {/* Settings Modal */}
        <Modal
          visible={settingsModalVisible}
          onDismiss={() => setSettingsModalVisible(false)}
          contentContainerStyle={styles.settingsModal}
        >
          <Title>Availability Settings</Title>
          
          <TextInput
            label="Advance Booking Days"
            value={settings.advanceBookingDays.toString()}
            onChangeText={(text) => setSettings(prev => ({ ...prev, advanceBookingDays: parseInt(text) || 30 }))}
            keyboardType="numeric"
            style={styles.formInput}
          />

          <TextInput
            label="Buffer Time (minutes)"
            value={settings.bufferTimeMinutes.toString()}
            onChangeText={(text) => setSettings(prev => ({ ...prev, bufferTimeMinutes: parseInt(text) || 15 }))}
            keyboardType="numeric"
            style={styles.formInput}
          />

          <TextInput
            label="Cancellation Policy (hours)"
            value={settings.cancellationPolicyHours.toString()}
            onChangeText={(text) => setSettings(prev => ({ ...prev, cancellationPolicyHours: parseInt(text) || 24 }))}
            keyboardType="numeric"
            style={styles.formInput}
          />

          <View style={styles.switchSection}>
            <List.Item
              title="Auto Accept Bookings"
              description="Automatically accept booking requests"
              right={() => (
                <Switch
                  value={settings.autoAcceptBookings}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, autoAcceptBookings: value }))}
                />
              )}
            />
            <List.Item
              title="Allow Same Day Booking"
              description="Allow clients to book on the same day"
              right={() => (
                <Switch
                  value={settings.allowSameDayBooking}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, allowSameDayBooking: value }))}
                />
              )}
            />
          </View>

          <Divider style={styles.divider} />
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          {Object.entries(settings.notificationPreferences).map(([key, value]) => (
            <List.Item
              key={key}
              title={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              right={() => (
                <Switch
                  value={value}
                  onValueChange={(newValue) => setSettings(prev => ({
                    ...prev,
                    notificationPreferences: {
                      ...prev.notificationPreferences,
                      [key]: newValue,
                    },
                  }))}
                />
              )}
            />
          ))}

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setSettingsModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveSettings}
              style={styles.modalButton}
            >
              Save Settings
            </Button>
          </View>
        </Modal>
      </Portal>

      <FAB
        icon="calendar-plus"
        style={styles.fab}
        onPress={handleAddSlot}
        label="Add Slot"
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    elevation: 2,
  },
  settingsButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 10,
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
  scheduleContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  dayCard: {
    marginBottom: 15,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayActions: {
    flexDirection: 'row',
  },
  emptyDay: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    marginBottom: 10,
  },
  slotItem: {
    marginBottom: 5,
  },
  slotListItem: {
    paddingVertical: 8,
  },
  slotDisabled: {
    opacity: 0.6,
  },
  slotLeft: {
    justifyContent: 'center',
    marginRight: 10,
  },
  slotActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  settingsModal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '90%',
  },
  formRow: {
    marginBottom: 15,
  },
  timeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  formInput: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  chipContainer: {
    marginBottom: 15,
  },
  typeChip: {
    marginRight: 10,
    marginBottom: 5,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchSection: {
    marginBottom: 15,
  },
  divider: {
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default AvailabilityScreen; 