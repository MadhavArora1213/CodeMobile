import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Plus, Layout, Trash2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Terminal from '../components/Terminal';

const TerminalScreen = () => {
  const [terminals, setTerminals] = React.useState([{ id: '1' }]);
  const [activeTerminal, setActiveTerminal] = React.useState('1');

  const addTerminal = () => {
    const newId = Math.random().toString(36).substring(7);
    setTerminals([...terminals, { id: newId }]);
    setActiveTerminal(newId);
  };

  const splitTerminal = () => {
    addTerminal();
  };

  const deleteTerminal = (id: string) => {
    if (terminals.length > 1) {
      const newTerms = terminals.filter(t => t.id !== id);
      setTerminals(newTerms);
      if (activeTerminal === id) {
        setActiveTerminal(newTerms[0].id);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerText}>TERMINAL</Text>
          <View style={styles.tabContainer}>
            {terminals.map((term, idx) => (
              <TouchableOpacity 
                key={term.id} 
                onPress={() => setActiveTerminal(term.id)}
                style={[styles.terminalTab, activeTerminal === term.id && styles.activeTab]}
              >
                <Text style={[styles.tabText, activeTerminal === term.id && styles.activeTabText]}>
                  {idx + 1}: bash
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={addTerminal}>
            <Plus size={16} color="#858585" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={splitTerminal}>
            <Layout size={16} color="#858585" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => deleteTerminal(activeTerminal)}>
            <Trash2 size={16} color="#858585" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.terminalContainer}>
        {terminals.map(term => (
          <View key={term.id} style={{ flex: 1, display: activeTerminal === term.id ? 'flex' : 'none' }}>
            <Terminal onClose={() => deleteTerminal(term.id)} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
  header: { 
    height: 36, 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12, 
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: { 
    color: '#BBBBBB', 
    fontSize: 11, 
    fontWeight: '600',
    letterSpacing: 1,
    marginRight: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  terminalTab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    borderRadius: 4,
  },
  activeTab: {
    backgroundColor: '#37373D',
  },
  tabText: {
    color: '#858585',
    fontSize: 11,
  },
  activeTabText: {
    color: '#CCCCCC',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 6,
    marginLeft: 4,
  },
  terminalContainer: { flex: 1 },
});

export default TerminalScreen;
