/**
 * Button Component
 * 
 * Versatile button component following enterprise design system
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, ColorScale } from '@/config';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  haptic?: boolean;
  gradient?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  haptic = true,
  gradient = false,
  style,
  textStyle,
  onPress,
  ...rest
}) => {
  const handlePress = (event: any) => {
    if (haptic && !disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(event);
  };

  const buttonStyles = [
    styles.base,
    styles[`size_${size}`],
    styles[variant],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${size}`],
    styles[`text_${variant}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  const content = (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? Colors.white : ColorScale.primary[500]}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text style={textStyles}>{title}</Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </>
  );

  if (gradient && variant === 'primary' && !disabled) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        {...rest}
      >
        <LinearGradient
          colors={['#7DD3FC', '#0EA5E9', '#0284C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[buttonStyles, styles.gradient]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...rest}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
  },

  // Sizes
  size_sm: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  size_md: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
  },
  size_lg: {
    height: 56,
    paddingHorizontal: 24,
    borderRadius: 28,
  },

  // Variants
  primary: {
    backgroundColor: ColorScale.primary[500],
  },
  secondary: {
    backgroundColor: ColorScale.gray[100],
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: ColorScale.primary[500],
  },
  ghost: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  danger: {
    backgroundColor: '#DC2626',
  },

  // States
  disabled: {
    backgroundColor: ColorScale.gray[300],
    shadowOpacity: 0,
    elevation: 0,
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    borderRadius: 999,
  },

  // Text
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 18,
  },
  text_primary: {
    color: '#0C4A6E',
  },
  text_secondary: {
    color: ColorScale.gray[700],
  },
  text_outline: {
    color: ColorScale.primary[500],
  },
  text_ghost: {
    color: ColorScale.primary[500],
  },
  text_danger: {
    color: Colors.white,
  },
  textDisabled: {
    color: ColorScale.gray[500],
  },
});

export default Button;
