import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

interface Props {
  width: number;
  height: number;
  borderRadius?: number;
  pressed?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const NeumorphicBox: React.FC<Props> = ({
  width,
  height,
  borderRadius = 15,
  pressed = false,
  style,
  children,
}) => {
  return (
    <View 
      style={[
        styles.container, 
        { 
          width, 
          height, 
          borderRadius, 
          backgroundColor: pressed ? '#000000' : '#1A1A1A' 
        },
        style
      ]}
    >
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
});
