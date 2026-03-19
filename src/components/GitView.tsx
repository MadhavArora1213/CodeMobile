import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Modal } from 'react-native';
import { gitClone, gitStatus, gitAdd, gitCommit, gitPush, gitPull, gitInit } from '../utils/git';
import { saveGitHubToken, getGitHubToken, clearGitHubToken, getGitHubUser, GitHubUser } from '../utils/auth';
import { askAiProxy } from '../utils/ai';
import { Sparkles, Bot, User as UserIcon, Settings, Lock, RefreshCw, ArrowUp, ArrowDown, CheckCircle, AlertCircle, Download, GitBranch } from 'lucide-react-native';

const GitView = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const [showSettings, setShowSettings] = useState(false);
  const [pat, setPat] = useState('');
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [fileStatuses, setFileStatuses] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
    refreshStatus();
  }, []);

  const checkAuth = async () => {
    const token = await getGitHubToken();
    if (token) {
      setIsAuthed(true);
      const gitUser = await getGitHubUser();
      setUser(gitUser);
    } else {
      setIsAuthed(false);
      setUser(null);
    }
  };

  const handleSaveToken = async () => {
    if (!pat.trim()) return;
    setLoading(true);
    const success = await saveGitHubToken(pat);
    if (success) {
      Alert.alert('Success', 'GitHub token saved successfully');
      setIsAuthed(true);
      const gitUser = await getGitHubUser();
      setUser(gitUser);
      setShowSettings(false);
      setPat('');
    } else {
      Alert.alert('Error', 'Invalid token. Please check your PAT.');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await clearGitHubToken();
    setIsAuthed(false);
    setUser(null);
    Alert.alert('Logged Out', 'Successfully disconnected from GitHub');
  };

  const refreshStatus = async () => {
    setLoading(true);
    const result = await gitStatus('/project');
    setFileStatuses(result);
    setLoading(false);
  };

  const handleClone = async () => {
    if (!repoUrl.trim()) return;
    setLoading(true);
    setStatus('Cloning repository...');
    setStatusType('');
    
    const result = await gitClone(repoUrl, '/project');
    
    if (result.success) {
      setStatus('Repository cloned successfully!');
      setStatusType('success');
      refreshStatus();
    } else {
      setStatus('Error: ' + result.error);
      setStatusType('error');
    }
    setLoading(false);
  };

  const handleGenerateCommitMessage = async () => {
    setLoading(true);
    try {
      // In Flow 3: "app calls AI proxy with diff"
      // Since we don't have a full diff engine yet, we'll send the file list and status
      const context = `Modified files: ${fileStatuses.map(f => f[0]).join(', ')}`;
      const prompt = "Generate a concise, meaningful git commit message for these changes. Format: type(scope): description";
      
      const response = await askAiProxy(prompt, context);
      setCommitMessage(response.trim().replace(/^"|"$/g, ''));
    } catch (e) {
      Alert.alert('Error', 'Failed to generate commit message');
    }
    setLoading(false);
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      Alert.alert('Error', 'Please enter a commit message');
      return;
    }
    setLoading(true);
    const result = await gitCommit('/project', commitMessage, {
      name: user?.name || user?.login || 'CodeMobile User',
      email: 'user@codemobile.app'
    });
    
    if (result.success) {
      Alert.alert('Success', 'Changes committed');
      setCommitMessage('');
      refreshStatus();
    } else {
      Alert.alert('Error', result.error);
    }
    setLoading(false);
  };

  const handlePush = async () => {
    if (!isAuthed) {
      setShowSettings(true);
      return;
    }
    setLoading(true);
    const result = await gitPush('/project');
    if (result.success) {
      Alert.alert('Success', 'Pushed to remote');
    } else {
      Alert.alert('Error', result.error);
    }
    setLoading(false);
  };

  const handlePull = async () => {
    if (!isAuthed) {
      setShowSettings(true);
      return;
    }
    setLoading(true);
    const result = await gitPull('/project');
    if (result.success) {
      Alert.alert('Success', 'Pulled from remote');
      refreshStatus();
    } else {
      Alert.alert('Error', result.error);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>SOURCE CONTROL</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={refreshStatus} style={styles.headerIcon}>
            <RefreshCw size={14} color="#C5C5C5" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerIcon}>
            <Settings size={14} color={isAuthed ? "#4EC9B0" : "#C5C5C5"} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        {user && (
          <View style={styles.userBadge}>
            <UserIcon size={12} color="#4EC9B0" />
            <Text style={styles.userBadgeText}>{user.login}</Text>
          </View>
        )}

        {/* Changes section */}
        {fileStatuses.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CHANGES ({fileStatuses.length})</Text>
            <View style={styles.commitBox}>
              <TextInput
                style={styles.commitInput}
                placeholder="Commit message (Enter to commit)"
                placeholderTextColor="#585858"
                value={commitMessage}
                onChangeText={setCommitMessage}
                onSubmitEditing={handleCommit}
              />
              <View style={styles.gitActions}>
                <TouchableOpacity onPress={handleGenerateCommitMessage} style={styles.gitBtn}>
                  <Sparkles size={16} color="#4EC9B0" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePull} style={styles.gitBtn}>
                  <ArrowDown size={16} color="#CCCCCC" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePush} style={styles.gitBtn}>
                  <ArrowUp size={16} color="#CCCCCC" />
                </TouchableOpacity>
              </View>
            </View>
            
            {fileStatuses.map((item, idx) => (
              <View key={idx} style={styles.fileRow}>
                <Text style={styles.fileName}>{item[0]}</Text>
                <Text style={styles.statusLabel}>{item[1] === 1 ? 'M' : 'A'}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.sectionTitle}>CLONE REPOSITORY</Text>
            <TextInput
              style={styles.input}
              value={repoUrl}
              onChangeText={setRepoUrl}
              placeholder="https://github.com/user/repo.git"
              placeholderTextColor="#585858"
            />
            <TouchableOpacity style={styles.button} onPress={handleClone} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Clone Repository</Text>}
            </TouchableOpacity>

            <View style={styles.divider} />
            <TouchableOpacity style={styles.initButton} onPress={() => gitInit('/project')}>
              <Text style={styles.initButtonText}>Initialize Repository</Text>
            </TouchableOpacity>
          </View>
        )}

        {status ? (
          <View style={[styles.statusBox, statusType === 'error' && styles.statusError]}>
            <Text style={[styles.statusText, statusType === 'error' && { color: '#F44747' }]}>{status}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Auth Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>GitHub Authentication</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <RefreshCw size={16} color="#858585" />
              </TouchableOpacity>
            </View>

            {isAuthed ? (
              <View style={styles.authInfo}>
                <CheckCircle size={40} color="#4EC9B0" />
                <Text style={styles.authStatus}>Connected as {user?.login}</Text>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <Text style={styles.logoutText}>Disconnect Account</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.authForm}>
                <Text style={styles.authDesc}>Paste your Personal Access Token (PAT) below to enable push/pull operations.</Text>
                <View style={styles.patInputContainer}>
                  <Lock size={14} color="#858585" style={styles.patIcon} />
                  <TextInput
                    style={styles.patInput}
                    secureTextEntry
                    placeholder="github_pat_..."
                    placeholderTextColor="#585858"
                    value={pat}
                    onChangeText={setPat}
                  />
                </View>
                <TouchableOpacity style={styles.saveTokenBtn} onPress={handleSaveToken} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTokenText}>Authenticate</Text>}
                </TouchableOpacity>
              </View>
            )}
            
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowSettings(false)}>
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#252526' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#333' },
  headerText: { color: '#BBBBBB', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerIcon: { padding: 4 },
  content: { flex: 1, padding: 12 },
  userBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e1e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 16, gap: 4 },
  userBadgeText: { color: '#4EC9B0', fontSize: 11 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#BBBBBB', fontSize: 11, fontWeight: '600', marginBottom: 8 },
  commitBox: { flexDirection: 'row', backgroundColor: '#3C3C3C', borderRadius: 4, paddingRight: 8 },
  commitInput: { flex: 1, color: '#CCCCCC', padding: 10, fontSize: 13 },
  gitActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gitBtn: { padding: 4 },
  fileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  fileName: { color: '#CCCCCC', fontSize: 13 },
  statusLabel: { color: '#4EC9B0', fontWeight: 'bold' },
  emptyContainer: { paddingVertical: 20 },
  input: { backgroundColor: '#3C3C3C', borderRadius: 4, padding: 10, color: '#CCCCCC', marginBottom: 10 },
  button: { backgroundColor: '#0E639C', padding: 12, borderRadius: 4, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 20 },
  initButton: { padding: 10, alignItems: 'center' },
  initButtonText: { color: '#0E639C', fontSize: 13 },
  statusBox: { marginTop: 12, padding: 10, backgroundColor: '#1e1e1e', borderRadius: 4 },
  statusText: { color: '#CCCCCC', fontSize: 12 },
  statusError: { borderLeftWidth: 3, borderLeftColor: '#F44747' },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#252526', borderRadius: 8, padding: 20, borderWidth: 1, borderColor: '#454545' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  authInfo: { alignItems: 'center', paddingVertical: 20 },
  authStatus: { color: '#fff', fontSize: 14, marginVertical: 15 },
  logoutBtn: { backgroundColor: '#454545', padding: 10, borderRadius: 4 },
  logoutText: { color: '#F44747' },
  authForm: { gap: 15 },
  authDesc: { color: '#858585', fontSize: 13, lineHeight: 18 },
  patInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3C3C3C', borderRadius: 4, paddingHorizontal: 12 },
  patIcon: { marginRight: 8 },
  patInput: { flex: 1, padding: 10, color: '#fff' },
  saveTokenBtn: { backgroundColor: '#0E639C', padding: 12, borderRadius: 4, alignItems: 'center' },
  saveTokenText: { color: '#fff', fontWeight: 'bold' },
  closeModalBtn: { marginTop: 20, alignItems: 'center' },
  closeModalText: { color: '#858585' }
});

export default GitView;
