import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Shadows } from '../utils/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'primary' | 'secondary';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'default' }) => {
  const bgColor = variant === 'primary' 
    ? Colors.primaryBg 
    : variant === 'secondary' 
    ? Colors.secondaryBg 
    : Colors.card;

  return (
    <View style={[styles.card, { backgroundColor: bgColor }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
  },
});
