import React from 'react';
import { View, StyleSheet } from 'react-native';
import { usePlayerStore } from '../store/usePlayerStore';
import { theme } from '../constants/theme';
import { MotiView } from 'moti';

export const ProgressBar = () => {
  const { position, duration } = usePlayerStore();
  
  const progress = duration > 0 ? position / duration : 0;
  
  return (
    <View style={styles.track}>
      <MotiView
        style={styles.fill}
        animate={{ width: `${progress * 100}%` }}
        transition={{ type: 'timing', duration: 1000 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 3,
    backgroundColor: theme.darkShadow,
    width: '100%',
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  fill: {
    height: '100%',
    backgroundColor: theme.accent,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
});
