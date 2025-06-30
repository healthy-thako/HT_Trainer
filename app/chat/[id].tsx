import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Avatar,
  Card,
  IconButton,
  Chip,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { chatApi } from '../../lib/supabase/api';
import { supabase } from '../../lib/supabase/client';
import { Colors } from '../../constants/Colors';
import { ChatMessage, ChatConversationWithDetails } from '../../types';
import { useAppNavigation } from '../../hooks/useNavigation';
import { BookingFromChatButton } from '../../components/navigation/NavigationButtons';

interface ChatMessageWithSender extends ChatMessage {
  sender: {
    id: string;
    name: string;
    avatar_url?: string;
    type: 'user' | 'trainer';
  };
}

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { trainer } = useAuth();
  const { navigateToBookingFromChat } = useAppNavigation();
  const { id: conversationId } = route.params as { id: string };
  
  const [conversation, setConversation] = useState<ChatConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchConversationData();
    
    // Set up real-time subscription
    const subscription = subscribeToMessages();
    
    return () => {
      subscription?.unsubscribe();
    };
  }, [conversationId, trainer]);

  useEffect(() => {
    // Mark messages as read when screen is focused
    if (trainer && conversationId) {
      markMessagesAsRead();
    }
  }, [trainer, conversationId]);

  useEffect(() => {
    // Update navigation header when conversation is loaded
    if (conversation) {
      navigation.setOptions({
        title: conversation.user.full_name,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {conversation.booking && (
              <IconButton
                icon="calendar"
                size={24}
                onPress={handleViewBooking}
                iconColor={Colors.primary}
              />
            )}
          </View>
        ),
      });
    }
  }, [conversation, navigation]);

  const fetchConversationData = async () => {
    if (!trainer) return;

    try {
      setLoading(true);
      
      // Get conversation details
      const convData = await chatApi.getConversationById(conversationId);
      if (!convData) {
        Alert.alert('Error', 'Conversation not found');
        navigation.goBack();
        return;
      }
      
      setConversation(convData);

      // Get messages
      const messagesData = await chatApi.getConversationMessages(conversationId);
      
      // Transform messages to include sender info
      const messagesWithSenders = await Promise.all(
        messagesData.map(async (message) => {
          let sender;
          if (message.sender_type === 'user') {
            const { data: user } = await supabase
              .from('users')
              .select('id, full_name, avatar_url')
              .eq('id', message.sender_id)
              .single();
            
            sender = {
              id: user?.id || message.sender_id,
              name: user?.full_name || 'Unknown User',
              avatar_url: user?.avatar_url,
              type: 'user' as const,
            };
          } else {
            const { data: trainerData } = await supabase
              .from('trainers')
              .select('id, name, image_url')
              .eq('user_id', message.sender_id)
              .single();
            
            sender = {
              id: trainerData?.id || message.sender_id,
              name: trainerData?.name || 'Unknown Trainer',
              avatar_url: trainerData?.image_url,
              type: 'trainer' as const,
            };
          }

          return {
            ...message,
            sender,
          };
        })
      );
      
      setMessages(messagesWithSenders);
      
    } catch (error) {
      console.error('Error fetching conversation data:', error);
      Alert.alert('Error', 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBooking = async () => {
    if (!conversation?.booking?.id) return;
    
    try {
      await navigateToBookingFromChat(conversationId);
    } catch (error) {
      console.error('Error navigating to booking:', error);
      Alert.alert('Error', 'Unable to view booking details');
    }
  };

  const subscribeToMessages = () => {
    return supabase
      .channel(`conversation_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Get sender details
          let sender;
          if (newMessage.sender_type === 'user') {
            const { data: user } = await supabase
              .from('users')
              .select('id, full_name, avatar_url')
              .eq('id', newMessage.sender_id)
              .single();
            
            sender = {
              id: user?.id || newMessage.sender_id,
              name: user?.full_name || 'Unknown User',
              avatar_url: user?.avatar_url,
              type: 'user' as const,
            };
          } else {
            const { data: trainer } = await supabase
              .from('trainers')
              .select('id, name, image_url')
              .eq('user_id', newMessage.sender_id)
              .single();
            
            sender = {
              id: trainer?.id || newMessage.sender_id,
              name: trainer?.name || 'Unknown Trainer',
              avatar_url: trainer?.image_url,
              type: 'trainer' as const,
            };
          }

          const messageWithSender = {
            ...newMessage,
            sender,
          };

          setMessages(prev => [...prev, messageWithSender]);
          
          // Auto-scroll to bottom
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();
  };

  const markMessagesAsRead = async () => {
    if (!trainer) return;
    
    try {
      await chatApi.markMessagesAsRead(conversationId, trainer.user_id);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !trainer || sending) return;

    try {
      setSending(true);
      await chatApi.sendMessage(
        conversationId,
        trainer.user_id,
        'trainer',
        newMessage.trim()
      );
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const isToday = messageDate.toDateString() === now.toDateString();
    
    if (isToday) {
      return messageDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  };

  const renderMessage = ({ item, index }: { item: ChatMessageWithSender; index: number }) => {
    const isTrainer = item.sender_type === 'trainer';
    const isConsecutive = index > 0 && 
      messages[index - 1].sender_id === item.sender_id &&
      new Date(item.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() < 300000; // 5 minutes

    return (
      <View style={[
        styles.messageContainer,
        isTrainer ? styles.trainerMessage : styles.userMessage,
        isConsecutive && styles.consecutiveMessage,
      ]}>
        {!isTrainer && !isConsecutive && (
          <Avatar.Text
            size={32}
            label={item.sender.name.split(' ').map(n => n[0]).join('')}
            style={styles.messageAvatar}
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isTrainer ? styles.trainerBubble : styles.userBubble,
          isConsecutive && styles.consecutiveBubble,
        ]}>
          {!isConsecutive && !isTrainer && (
            <Text style={styles.senderName}>{item.sender.name}</Text>
          )}
          
          <Text style={[
            styles.messageText,
            isTrainer ? styles.trainerMessageText : styles.userMessageText,
          ]}>
            {item.message_text}
          </Text>
          
          <Text style={[
            styles.messageTime,
            isTrainer ? styles.trainerMessageTime : styles.userMessageTime,
          ]}>
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
        
        {isTrainer && !isConsecutive && (
          <Avatar.Image
            size={32}
            source={
              trainer?.image_url
                ? { uri: trainer.image_url }
                : require('../../assets/icon.png')
            }
            style={styles.messageAvatar}
          />
        )}
      </View>
    );
  };

  const renderHeader = () => {
    if (!conversation) return null;

    return (
      <Card style={styles.conversationHeader}>
        <Card.Content style={styles.headerContent}>
          <Avatar.Text
            size={40}
            label={conversation.user.full_name.split(' ').map(n => n[0]).join('')}
            style={styles.headerAvatar}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{conversation.user.full_name}</Text>
            <Text style={styles.headerEmail}>{conversation.user.email}</Text>
            {conversation.booking && (
              <View style={styles.bookingInfo}>
                <Ionicons name="calendar" size={14} color={Colors.primary} />
                <Text style={styles.bookingText}>
                  Session: {new Date(conversation.booking.session_date).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading conversation...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {renderHeader()}
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          mode="outlined"
          multiline
          maxLength={1000}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <IconButton
          icon="send"
          size={24}
          iconColor={newMessage.trim() ? Colors.primary : Colors.textTertiary}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
          style={styles.sendButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationHeader: {
    margin: 16,
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    backgroundColor: Colors.primary,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  headerEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
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
  messagesContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  trainerMessage: {
    justifyContent: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-start',
  },
  consecutiveMessage: {
    marginBottom: 4,
  },
  messageAvatar: {
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  trainerBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  userBubble: {
    backgroundColor: Colors.messageReceived,
    borderBottomLeftRadius: 4,
  },
  consecutiveBubble: {
    marginTop: 2,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  trainerMessageText: {
    color: 'white',
  },
  userMessageText: {
    color: Colors.text,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  trainerMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  userMessageTime: {
    color: Colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    margin: 0,
  },
}); 