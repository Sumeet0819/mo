import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { youtubeApi } from '../api/youtube';

export const SyncYoutubeChannel = ({ onSyncSuccess }: { onSyncSuccess: () => void }) => {
  const [channelUrl, setChannelUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    if (!channelUrl) return;

    setIsLoading(true);
    setMessage('');

    try {
      const result = await youtubeApi.syncChannel(channelUrl);
      setMessage(`Successfully synced ${result.count} videos!`);
      onSyncSuccess(); // Trigger a refetch in the parent component
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name="link" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="https://www.youtube.com/@Channel"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={channelUrl}
          onChangeText={setChannelUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardAppearance="dark"
        />
      </View>
      <TouchableOpacity
        style={[styles.button, isLoading || !channelUrl ? styles.buttonDisabled : null]}
        onPress={handleSync}
        disabled={isLoading || !channelUrl}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Link YouTube Account</Text>
        )}
      </TouchableOpacity>
      {!!message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#fff',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
});
