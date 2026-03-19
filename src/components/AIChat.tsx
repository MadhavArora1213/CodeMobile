import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Send, Bot, User, Code, Bug, Info, Sparkles } from 'lucide-react-native';
import { askAiProxy } from '../utils/ai';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

const AIChat = ({ currentCode }: { currentCode: string }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', text: 'Hi! I\'m CodeMobile AI (Qwen). Ask me to write code, find bugs, or explain logic — in English or Hindi! 🚀', sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), text: textToSend, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiMsgId, text: '', sender: 'ai' };
    setMessages(prev => [...prev, aiMsg]);

    try {
      let fullResponse = '';
      await askAiProxy(textToSend, currentCode, (token) => {
        fullResponse += token;
        setMessages(prev => 
          prev.map(m => m.id === aiMsgId ? { ...m, text: fullResponse } : m)
        );
      });
    } catch (error) {
       setMessages(prev => 
         prev.map(m => m.id === aiMsgId ? { ...m, text: 'Error connecting to AI backend. Make sure the server and Ollama are running.' } : m)
       );
    } finally {
      setLoading(false);
    }
  };

  const actions = [
    { label: 'Fix Bugs', icon: Bug, prompt: 'Find and fix bugs in my code.' },
    { label: 'Explain', icon: Info, prompt: 'Explain how this code works.' },
    { label: 'Review', icon: Sparkles, prompt: 'Review this code for improvements.' },
    { label: 'Refactor', icon: Code, prompt: 'Refactor this code to be more concise.' },
  ];

  const renderItem = ({ item }: { item: Message }) => (
    <View style={[styles.messageRow, item.sender === 'user' && styles.userRow]}>
      <View style={[styles.avatar, item.sender === 'user' ? styles.userAvatar : styles.aiAvatar]}>
        {item.sender === 'user' ? (
          <User size={14} color="#fff" />
        ) : (
          <Bot size={14} color="#fff" />
        )}
      </View>
      <View style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>AI ASSISTANT</Text>
        <Text style={styles.modelText}>qwen2.5-coder</Text>
      </View>
      
      {/* Quick Actions */}
      <View style={styles.actionsBar}>
        {actions.map((action, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={styles.actionBtn}
            onPress={() => sendMessage(action.prompt)}
          >
            <action.icon size={12} color="#858585" />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask something (Hindi/English)..."
          placeholderTextColor="#585858"
          onSubmitEditing={() => sendMessage()}
          multiline
        />
        <TouchableOpacity onPress={() => sendMessage()} style={styles.sendButton} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Send size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerText: { color: '#BBBBBB', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  modelText: { color: '#007ACC', fontSize: 11 },
  actionsBar: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#252526',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D2D2D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  actionLabel: { color: '#858585', fontSize: 11 },
  list: { padding: 12, paddingBottom: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  userRow: { flexDirection: 'row-reverse' },
  avatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginHorizontal: 6 },
  userAvatar: { backgroundColor: '#0E639C' },
  aiAvatar: { backgroundColor: '#6A9955' },
  messageBubble: { padding: 10, borderRadius: 8, maxWidth: '85%' },
  userBubble: { backgroundColor: '#264F78', borderTopRightRadius: 2 },
  aiBubble: { backgroundColor: '#2D2D2D', borderTopLeftRadius: 2 },
  messageText: { color: '#CCCCCC', fontSize: 13, lineHeight: 19 },
  inputArea: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: '#333', backgroundColor: '#252526' },
  input: { flex: 1, backgroundColor: '#3C3C3C', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, color: '#CCCCCC', fontSize: 13, marginRight: 8, maxHeight: 100 },
  sendButton: { backgroundColor: '#0E639C', borderRadius: 4, padding: 10, justifyContent: 'center', alignItems: 'center', width: 44, height: 44 },
});

export default AIChat;
