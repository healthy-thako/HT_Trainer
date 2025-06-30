import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, Button, List } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import { useAppNavigation } from '../../hooks/useNavigation';

export default function AdminScreen() {
  const navigation = useAppNavigation();

  const adminFeatures = [
    {
      title: 'User Management',
      description: 'Manage trainers and clients',
      icon: 'account-group',
      onPress: () => {
        // Navigate to user management
        console.log('Navigate to user management');
      },
    },
    {
      title: 'Analytics Dashboard',
      description: 'View platform analytics',
      icon: 'chart-line',
      onPress: () => navigation.navigateToAnalytics(),
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: 'cog',
      onPress: () => {
        // Navigate to system settings
        console.log('Navigate to system settings');
      },
    },
    {
      title: 'Reports',
      description: 'Generate and view reports',
      icon: 'file-document',
      onPress: () => {
        // Navigate to reports
        console.log('Navigate to reports');
      },
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>Manage your platform</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          {adminFeatures.map((feature, index) => (
            <List.Item
              key={index}
              title={feature.title}
              description={feature.description}
              left={(props) => <List.Icon {...props} icon={feature.icon} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={feature.onPress}
              style={styles.listItem}
            />
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Platform Overview</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>--</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>--</Text>
              <Text style={styles.statLabel}>Active Trainers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>--</Text>
              <Text style={styles.statLabel}>Total Bookings</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  card: {
    margin: 16,
    backgroundColor: Colors.surface,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  listItem: {
    paddingVertical: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
}); 