import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, getShadows } from '../utils/theme';

interface QuickActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  onPress,
  color,
}) => {
  const { theme } = useTheme();
  const shadows = getShadows(theme);
  const buttonColor = color || theme.primary;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[
        styles.iconContainer, 
        { backgroundColor: buttonColor + '20' },
        shadows.small,
      ]}>
        <Ionicons name={icon} size={24} color={buttonColor} />
      </View>
      <Text style={[styles.label, { color: theme.text }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 72,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});
