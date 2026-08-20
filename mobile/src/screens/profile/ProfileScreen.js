import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Appbar, Text, ActivityIndicator } from 'react-native-paper';
import { Button } from '../../components/ui/Button';
const ProfileScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch logic goes here
      setData([]);
    } catch (e) {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Action icon="menu" onPress={() => navigation.openDrawer && navigation.openDrawer()} />
        <Appbar.Content title="Profile" />
      </Appbar.Header>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
      {error && (
        <View style={styles.center}>
          <Text style={{ color: 'red' }}>{error}</Text>
          <Button onPress={loadData}>Retry</Button>
        </View>
      )}

      {!loading && !error && data.length === 0 && (
        <View style={styles.center}>
          <Text>No data available.</Text>
        </View>
      )}

      <FlatList
        data={data}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <Text>{JSON.stringify(item)}</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
});

export default ProfileScreen;
