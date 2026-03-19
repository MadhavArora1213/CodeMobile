import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Code, Terminal, GitBranch, MessageSquare } from 'lucide-react-native';

import EditorScreen from './src/screens/EditorScreen';
import TerminalScreen from './src/screens/TerminalScreen';
import GitScreen from './src/screens/GitScreen';
import AIScreen from './src/screens/AIScreen';
import LoginScreen from './src/screens/LoginScreen';
import { useAuthStore } from './src/store/useAuthStore';
import { useFileStore } from './src/store/useFileStore';

const Tab = createBottomTabNavigator();

export default function App() {
  const { user, initialize, loading } = useAuthStore();
  const { setUserId, loadFiles } = useFileStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (user) {
      setUserId(user.uid);
      loadFiles();
    } else {
      setUserId(null);
    }
  }, [user]);

  if (loading) return null;

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      {!user ? (
        <LoginScreen />
      ) : (
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#252526',
              borderTopColor: '#1e1e1e',
              height: 52,
              paddingBottom: 4,
            },
            tabBarActiveTintColor: '#fff',
            tabBarInactiveTintColor: '#858585',
            tabBarLabelStyle: {
              fontSize: 10,
            },
          }}
        >
          <Tab.Screen 
            name="Editor" 
            component={EditorScreen}
            options={{
              tabBarIcon: ({ color, size }) => <Code color={color} size={size} />,
            }}
          />
          <Tab.Screen 
            name="Terminal" 
            component={TerminalScreen}
            options={{
              tabBarIcon: ({ color, size }) => <Terminal color={color} size={size} />,
            }}
          />
          <Tab.Screen 
            name="Git" 
            component={GitScreen}
            options={{
              tabBarIcon: ({ color, size }) => <GitBranch color={color} size={size} />,
            }}
          />
          <Tab.Screen 
            name="AI" 
            component={AIScreen}
            options={{
              tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
            }}
          />
        </Tab.Navigator>
      )}
    </NavigationContainer>
  );
}
