import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import {
  Badge,
  Card,
  Text,
  IconButton,
  Button,
  Divider,
  Avatar,
  Chip,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';
import { Colors } from '../constants/Colors';
import { Notification } from '../lib/supabase/api/notifications';

interface NotificationBellProps {
  size?: number;
  color?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  size = 24,
  color = Colors.primary,
}) => {
  const { unreadCount } = useNotifications();
  const [showModal, setShowModal] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setShowModal(true)}>
        <View style={styles.bellContainer}>
          <Ionicons name="notifications-outline" size={size} color={color} />
          {unreadCount > 0 && (
            <Badge
              size={18}
              style={styles.badge}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </View>
      </TouchableOpacity>

      <NotificationModal
        visible={showModal}
        onDismiss={() => setShowModal(false)}
      />
    </View>
  );
};

interface NotificationModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onDismiss,
}) => {
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return 'calendar';
      case 'payment':
        return 'card';
      case 'message':
        return 'chatbubble';
      case 'review':
        return 'star';
      case 'goal':
        return 'trophy';
      case 'workout':
        return 'fitness';
      case 'meal_plan':
        return 'restaurant';
      case 'system':
        return 'settings';
      default:
        return 'notifications';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return Colors.error;
      case 'high':
        return Colors.warning;
      case 'medium':
        return Colors.primary;
      case 'low':
        return Colors.textSecondary;
      default:
        return Colors.textSecondary;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <Card
      style={[
        styles.notificationCard,
        !item.read && styles.unreadNotification,
      ]}
    >
      <Card.Content style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationIcon}>
            <Avatar.Icon
              size={40}
              icon={getNotificationIcon(item.type)}
              style={{
                backgroundColor: getPriorityColor(item.priority),
              }}
            />
          </View>
          
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.notificationMessage} numberOfLines={3}>
              {item.message}
            </Text>
            
            <View style={styles.notificationMeta}>
              <Text style={styles.notificationTime}>
                {formatTime(item.created_at)}
              </Text>
              <Chip
                mode="outlined"
                compact
                style={styles.typeChip}
                textStyle={styles.typeChipText}
              >
                {item.type}
              </Chip>
            </View>
          </View>

          <View style={styles.notificationActions}>
            {!item.read && (
              <IconButton
                icon="check"
                size={20}
                onPress={() => handleMarkAsRead(item.id)}
              />
            )}
            <IconButton
              icon="close"
              size={20}
              onPress={() => handleDelete(item.id)}
            />
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Notifications</Text>
          <View style={styles.modalActions}>
            {notifications.some(n => !n.read) && (
              <Button
                mode="text"
                onPress={handleMarkAllAsRead}
                style={styles.markAllButton}
              >
                Mark All Read
              </Button>
            )}
            <IconButton
              icon="close"
              onPress={onDismiss}
            />
          </View>
        </View>

        <Divider />

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              You'll see updates about bookings, messages, and more here
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.notificationsList}
            showsVerticalScrollIndicator={false}
            onRefresh={refreshNotifications}
            refreshing={loading}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  bellContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.error,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllButton: {
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  notificationsList: {
    padding: 16,
  },
  notificationCard: {
    marginBottom: 12,
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  notificationContent: {
    paddingVertical: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  typeChip: {
    height: 24,
  },
  typeChipText: {
    fontSize: 10,
  },
  notificationActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
}); 