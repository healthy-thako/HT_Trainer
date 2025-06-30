import React, { useEffect, useState, useRef } from 'react';
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
  Avatar,
  Chip,
  Searchbar,
  FAB,
  Badge,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../hooks/useNavigation';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase/client';

interface MockConversation {
  id: string;
  user: {
    full_name: string;
    avatar_url?: string | null;
  };
  last_message?: {
    message_text: string;
  } | null;
  last_message_at: string;
  unread_count: number;
  booking?: {
    status: string;
  } | null;
}

export default function ChatIndexScreen() {
  const { trainer } = useAuth();
  const navigation = useAppNavigation();
  const [conversations, setConversations] = useState<MockConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<MockConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConversations();
  }, [trainer]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!trainer?.id) return;

    const subscription = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          console.log('Real-time message update:', payload);
          // Refresh conversations when new messages arrive
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [trainer?.id]);

  useEffect(() => {
    // Filter conversations based on search query
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.last_message?.message_text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  const fetchConversations = async () => {
    if (!trainer?.id) return;

    try {
      setLoading(true);
      
      // Fetch real conversations from database
      const { data: conversationsData, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          user:user_id (
            full_name,
            avatar_url
          ),
          last_message:chat_messages (
            message_text,
            created_at
          ),
          booking:trainer_bookings (
            status
          )
        `)
        .eq('trainer_id', trainer.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Transform data and calculate unread counts
      const transformedConversations: MockConversation[] = await Promise.all(
        (conversationsData || []).map(async (conv: any) => {
          // Get unread message count
          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('sender_type', 'user')
            .is('read_at', null);

          return {
            id: conv.id,
            user: {
              full_name: conv.user?.full_name || 'Unknown User',
              avatar_url: conv.user?.avatar_url,
            },
                         last_message: conv.last_message?.[0] ? {
               message_text: conv.last_message[0].message_text,
             } : null,
            last_message_at: conv.last_message_at || conv.created_at,
            unread_count: unreadCount || 0,
                         booking: conv.booking?.[0] ? {
               status: conv.booking[0].status,
             } : null,
          };
        })
      );

      setConversations(transformedConversations);
      setFilteredConversations(transformedConversations);
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

  const handleConversationPress = (conversationId: string) => {
    navigation.navigateToChatDetail(conversationId);
  };

  const handleNewConversation = () => {
    // Navigate to client selection for new conversation
    navigation.navigateToClients();
  };

  const formatLastMessageTime = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const getConversationStatus = (conversation: MockConversation) => {
    if (conversation.booking) {
      switch (conversation.booking.status) {
        case 'pending':
          return { label: 'Booking Pending', color: Colors.warning };
        case 'confirmed':
          return { label: 'Booking Confirmed', color: Colors.success };
        case 'completed':
          return { label: 'Session Complete', color: Colors.info };
        case 'cancelled':
          return { label: 'Booking Cancelled', color: Colors.error };
        default:
          return null;
      }
    }
    return null;
  };

  const renderConversation = ({ item }: { item: MockConversation }) => {
    const status = getConversationStatus(item);
    const hasUnreadMessages = item.unread_count > 0;

    return (
      <TouchableOpacity onPress={() => handleConversationPress(item.id)}>
        <Card style={[styles.conversationCard, hasUnreadMessages && styles.unreadCard]}>
          <Card.Content style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Avatar.Text
                size={50}
                label={item.user.full_name.split(' ').map(n => n[0]).join('')}
                style={styles.avatar}
              />
              <View style={styles.conversationInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.clientName, hasUnreadMessages && styles.unreadText]}>
                    {item.user.full_name}
                  </Text>
                  {hasUnreadMessages && (
                    <Badge size={20} style={styles.unreadBadge}>
                      {item.unread_count}
                    </Badge>
                  )}
                </View>
                
                {status && (
                  <Chip
                    style={[styles.statusChip, { backgroundColor: status.color + '20' }]}
                    textStyle={[styles.statusText, { color: status.color }]}
                    compact
                  >
                    {status.label}
                  </Chip>
                )}
                
                {item.last_message && (
                  <Text style={styles.lastMessage} numberOfLines={2}>
                    {item.last_message.message_text}
                  </Text>
                )}
              </View>
              
              <View style={styles.conversationMeta}>
                <Text style={styles.timeText}>
                  {formatLastMessageTime(item.last_message_at)}
                </Text>
                {item.booking && (
                  <Ionicons 
                    name="calendar-outline" 
                    size={16} 
                    color={Colors.textSecondary} 
                    style={styles.bookingIcon}
                  />
                )}
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        Start chatting with your clients to provide better support
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search conversations..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* New Conversation FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleNewConversation}
        label="New Chat"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    elevation: 2,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  conversationCard: {
    marginBottom: 12,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  conversationContent: {
    padding: 16,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    backgroundColor: Colors.primary,
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
    color: Colors.primary,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  conversationMeta: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  bookingIcon: {
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
  },
}); 