import React from 'react';
import { View, ViewStyle, ColorValue, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';

interface GradientBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  colors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  angle?: number;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  style,
  colors = [Colors.gradientStart, Colors.gradientEnd] as const,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 }, // 135 degree equivalent
  ...props
}) => {
  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={[{ flex: 1 }, style]}
      {...props}
    >
      {children}
    </LinearGradient>
  );
};

export const GradientCard: React.FC<GradientBackgroundProps> = ({
  children,
  style,
  colors = [Colors.gradientStart, Colors.gradientEnd] as const,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  ...props
}) => {
  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={[
        {
          borderRadius: 12,
          padding: 16,
          shadowColor: Colors.shadow,
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </LinearGradient>
  );
};

export const GradientButton: React.FC<GradientBackgroundProps & {
  onPress?: () => void;
  disabled?: boolean;
}> = ({
  children,
  style,
  colors = [Colors.gradientStart, Colors.gradientEnd] as const,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  onPress,
  disabled = false,
  ...props
}) => {
  const buttonColors = disabled 
    ? [Colors.disabled, Colors.disabled] as const
    : colors;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={style}
    >
      <LinearGradient
        colors={buttonColors}
        start={start}
        end={end}
        style={{
          borderRadius: 8,
          paddingVertical: 12,
          paddingHorizontal: 24,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: disabled ? 'transparent' : Colors.shadow,
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: disabled ? 0 : 3,
          opacity: disabled ? 0.6 : 1,
        }}
        {...props}
      >
        {children}
      </LinearGradient>
    </TouchableOpacity>
  );
}; 