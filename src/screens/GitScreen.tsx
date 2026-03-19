import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GitView from '../components/GitView';

const GitScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <GitView />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
});

export default GitScreen;
