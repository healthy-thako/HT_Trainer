import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button, Card, Title, Paragraph } from 'react-native-paper';
import { authApi } from '../lib/supabase/api';

export default function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setConnectionStatus('testing');
    setErrorMessage('');
    
    try {
      const result = await authApi.testConnection();
      
      if (result.success) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
        setErrorMessage(result.error || 'Unknown error');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      setErrorMessage(error.message || 'Connection failed');
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'testing': return '#FFA500';
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'testing': return 'Testing connection...';
      case 'success': return 'Connected successfully!';
      case 'error': return 'Connection failed';
      default: return 'Unknown status';
    }
  };

  const showSetupInstructions = () => {
    Alert.alert(
      'Setup Instructions',
      'If connection failed:\n\n' +
      '1. Check SUPABASE_SETUP.md for detailed instructions\n' +
      '2. Update lib/supabase/client.ts with your credentials\n' +
      '3. Ensure your Supabase project is active\n' +
      '4. Verify your API keys are correct',
      [{ text: 'OK' }]
    );
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Supabase Connection Test</Title>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
        
        {errorMessage ? (
          <Paragraph style={styles.errorText}>
            Error: {errorMessage}
          </Paragraph>
        ) : null}
        
        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined" 
            onPress={testConnection}
            style={styles.button}
          >
            Test Again
          </Button>
          
          <Button 
            mode="contained" 
            onPress={showSetupInstructions}
            style={styles.button}
          >
            Setup Help
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#F44336',
    marginTop: 8,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
}); 