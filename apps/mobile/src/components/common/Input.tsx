/**
 * Input Component
 * 
 * Text input with validation, icons, and various states
 */

import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/config';
import { useThemeContext } from '@/contexts';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  disabled?: boolean;
  required?: boolean;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      disabled = false,
      required = false,
      showPasswordToggle = false,
      secureTextEntry,
      style,
      ...rest
    },
    ref
  ) => {
    const { colors, isDark } = useThemeContext();
    const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [focusAnimation] = useState(new Animated.Value(0));

    const handleFocus = () => {
      setIsFocused(true);
      Animated.timing(focusAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    };

    const handleBlur = () => {
      setIsFocused(false);
      Animated.timing(focusAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    };

    const borderColor = focusAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [
        error ? Colors.error : Colors.gray[300],
        error ? Colors.error : colors.primary,
      ],
    });

    const actualSecureTextEntry = showPasswordToggle
      ? secureTextEntry && !isPasswordVisible
      : secureTextEntry;

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <View style={styles.labelContainer}>
            <Text style={[styles.label, error && styles.labelError]}>
              {label}
            </Text>
            {!!required && <Text style={styles.required}>*</Text>}
          </View>
        )}

        <Animated.View
          style={[
            styles.inputContainer,
            { borderColor },
            isFocused && styles.inputContainerFocused,
            error && styles.inputContainerError,
            disabled && styles.inputContainerDisabled,
          ]}
        >
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={20}
              color={isFocused ? colors.primary : colors.textTertiary}
              style={styles.leftIcon}
            />
          )}

          <TextInput
            ref={ref}
            style={[
              styles.input,
              leftIcon && styles.inputWithLeftIcon,
              (rightIcon || showPasswordToggle) && styles.inputWithRightIcon,
              disabled && styles.inputDisabled,
              style,
            ]}
            placeholderTextColor={colors.textTertiary}
            editable={!disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={actualSecureTextEntry}
            {...rest}
          />

          {showPasswordToggle && secureTextEntry && (
            <TouchableOpacity
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              style={styles.rightIconContainer}
            >
              <Ionicons
                name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}

          {rightIcon && !showPasswordToggle && (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={styles.rightIconContainer}
              disabled={!onRightIconPress}
            >
              <Ionicons name={rightIcon} size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {(error || hint) && (
          <Text style={[styles.helper, error && styles.helperError]}>
            {error || hint}
          </Text>
        )}
      </View>
    );
  }
);

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    marginBottom: Spacing[4],
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: Spacing[2],
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: colors.text,
  },
  labelError: {
    color: Colors.error,
  },
  required: {
    color: Colors.error,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 999,
    overflow: 'hidden',
  },
  inputContainerFocused: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,

  },
  inputContainerError: {
    borderColor: Colors.error,
  },
  inputContainerDisabled: {
    backgroundColor: isDark ? colors.surfaceVariant : Colors.gray[100],
  },
  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: Spacing[4],
    fontSize: Typography.fontSize.base,
    color: colors.text,
  },
  inputWithLeftIcon: {
    paddingLeft: Spacing[3],
  },
  inputWithRightIcon: {
    paddingRight: Spacing[3],
  },
  inputDisabled: {
    color: colors.textTertiary,
  },
  leftIcon: {
    marginLeft: Spacing[5],
  },
  rightIconContainer: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  helper: {
    marginTop: Spacing[1],
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
  },
  helperError: {
    color: Colors.error,
  },
});

Input.displayName = 'Input';

export default Input;
