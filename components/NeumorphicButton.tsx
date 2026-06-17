import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { theme } from '../constants/theme';

interface Props {
  width: number;
  height: number;
  borderRadius?: number;
  onPress: () => void;
  children: React.ReactNode;
}

export const NeumorphicButton: React.FC<Props> = ({
  width,
  height,
  borderRadius = 15,
  onPress,
  children,
}) => {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <MotiView
          animate={{ scale: pressed ? 0.95 : 1 }}
          transition={{ type: 'timing', duration: 100 }}
          style={[
            styles.container,
            { 
              width, 
              height, 
              borderRadius, 
              backgroundColor: pressed ? theme.darkShadow : theme.lightShadow 
            },
          ]}
        >
          {children}
        </MotiView>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
