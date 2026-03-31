import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, getShadows } from '../utils/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'primary' | 'secondary';
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'default', elevated = false }) => {
  const { theme } = useTheme();
  const shadows = getShadows(theme);
  
  const getBgColor = () => {
    if (variant === 'primary') return theme.primaryBg;
    if (variant === 'secondary') return theme.secondaryBg;
    return elevated ? theme.cardElevated : theme.card;
  };

  return (
    <View style={[
      styles.card,
      { backgroundColor: getBgColor() },
      shadows.small,
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
  },
});
