import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Avatar,
  Badge,
  Chip,
  Searchbar,
  Button,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { chatApi } from '../../lib/supabase/api';
import { supabase } from '../../lib/supabase/client';
import { Colors } from '../../constants/Colors';
import { ChatConversationWithDetails } from '../../types';
import { useAppNavigation } from '../../hooks/useNavigation';

export default function ChatListScreen() {
  const { trainer } = useAuth();
  const { navigateToChatDetail, navigateToBookingFromChat } = useAppNavigation();
  const [conversations, setConversations] = useState<ChatConversationWithDetails[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ChatConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const subscriptionRef = useRef<any>(null);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      
      if (trainer) {
        subscribeToConversationUpdates();
      }

      return () => {
        // Cleanup subscription
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
        }
      };
    }, [trainer])
  );

  const fetchConversations = async () => {
    if (!trainer) return;

    try {
      setLoading(true);
      const conversationsData = await chatApi.getTrainerConversations(trainer.id);
      setConversations(conversationsData);
      filterConversations(conversationsData, searchQuery);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const subscribeToConversationUpdates = () => {
    if (!trainer) return;

    // Subscribe to new messages and conversation updates
    subscriptionRef.current = supabase
      .channel(`trainer_conversations_${trainer.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          console.log('New message received:', payload);
          // Refresh conversations to update last message and unread counts
          await fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversations',
          filter: `trainer_id=eq.${trainer.id}`,
        },
        async (payload) => {
          console.log('Conversation updated:', payload);
          // Refresh conversations when conversation details change
          await fetchConversations();
        }
      )
      .subscribe();
  };

  const filterConversations = (
    conversationsList: ChatConversationWithDetails[],
    query: string
  ) => {
    let filtered = conversationsList;

    if (query) {
      filtered = filtered.filter(conversation =>
        conversation.user.full_name.toLowerCase().includes(query.toLowerCase()) ||
        conversation.user.email.toLowerCase().includes(query.toLowerCase()) ||
        conversation.last_message?.message_text.toLowerCase().includes(query.toLowerCase())
      );
    }

    setFilteredConversations(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterConversations(conversations, query);
  };

  const handleConversationPress = (conversationId: string) => {
    navigateToChatDetail(conversationId);
  };

  const handleViewBooking = async (conversationId: string) => {
    try {
      await navigateToBookingFromChat(conversationId);
    } catch (error) {
      console.error('Error navigating to booking:', error);
      Alert.alert('Error', 'Unable to view booking details');
    }
  };

  const formatLastMessageTime = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000);

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
      return messageDate.toLocaleDateString();
    }
  };

  const truncateMessage = (message: string, maxLength: number = 60) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const renderConversationItem = ({ item }: { item: ChatConversationWithDetails }) => (
    <TouchableOpacity onPress={() => handleConversationPress(item.id)}>
      <Card style={styles.conversationCard}>
        <Card.Content style={styles.conversationContent}>
          <View style={styles.avatarSection}>
            <Avatar.Text
              size={56}
              label={item.user.full_name.split(' ').map(n => n[0]).join('')}
              style={styles.avatar}
            />
            {item.unread_count > 0 && (
              <Badge
                size={20}
                style={styles.unreadBadge}
              >
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Badge>
            )}
          </View>

          <View style={styles.conversationInfo}>
            <View style={styles.conversationHeader}>
              <Text style={styles.userName}>{item.user.full_name}</Text>
              <Text style={styles.timestamp}>
                {item.last_message 
                  ? formatLastMessageTime(item.last_message.created_at)
                  : formatLastMessageTime(item.created_at)
                }
              </Text>
            </View>

            <View style={styles.lastMessageSection}>
              {item.last_message ? (
                <Text 
                  style={[
                    styles.lastMessage,
                    item.unread_count > 0 && styles.unreadMessage
                  ]}
                  numberOfLines={2}
                >
                  {item.last_message.sender_type === 'trainer' && 'You: '}
                  {truncateMessage(item.last_message.message_text)}
                </Text>
              ) : (
                <Text style={styles.noMessages}>No messages yet</Text>
              )}
            </View>

            {item.booking && (
              <View style={styles.bookingInfo}>
                <Ionicons name="calendar" size={14} color={Colors.primary} />
                <Text style={styles.bookingText}>
                  Session: {new Date(item.booking.session_date).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.conversationActions}>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={Colors.textTertiary} 
            />
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);

  return (
    <View style={styles.container}>
      {/* Header with Search */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Title style={styles.headerTitle}>Messages</Title>
          {totalUnread > 0 && (
            <Badge style={styles.totalUnreadBadge}>
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </View>
        
        <Searchbar
          placeholder="Search conversations..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversationItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery 
                ? 'No conversations match your search'
                : 'Your client messages will appear here'
              }
            </Text>
          </View>
        }
      />

      {/* Quick Start Chat FAB */}
      <Button
        mode="contained"
        style={styles.fab}
        onPress={() => {
          Alert.alert(
            'Start Conversation',
            'Conversations are automatically created when clients book sessions with you.'
          );
        }}
      >
        Start Conversation
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  totalUnreadBadge: {
    backgroundColor: Colors.error,
  },
  searchBar: {
    marginBottom: 8,
  },
  listContainer: {
    padding: 16,
  },
  conversationCard: {
    marginBottom: 8,
    elevation: 2,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarSection: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    backgroundColor: Colors.primary,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginLeft: 8,
  },
  lastMessageSection: {
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  unreadMessage: {
    fontWeight: '500',
    color: Colors.text,
  },
  noMessages: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  bookingText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  conversationActions: {
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
  },
}); 