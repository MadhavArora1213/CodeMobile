import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AIChat from '../components/AIChat';
import { useFileStore } from '../store/useFileStore';

const AIScreen = () => {
  const { activeFile } = useFileStore();
  
  return (
    <SafeAreaView style={styles.container}>
      <AIChat currentCode={activeFile?.content || ''} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
});

export default AIScreen;
