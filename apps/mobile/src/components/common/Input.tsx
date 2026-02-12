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
        error ? '#EF4444' : '#D1D5DB', // Colors.error.main : Colors.gray[300]
        error ? '#EF4444' : '#F59E0B', // Colors.error.main : Colors.primary[500]
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
            {required && <Text style={styles.required}>*</Text>}
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
              color={isFocused ? Colors.primary[500] : Colors.gray[400]}
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
            placeholderTextColor={Colors.gray[400]}
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
                color={Colors.gray[400]}
              />
            </TouchableOpacity>
          )}

          {rightIcon && !showPasswordToggle && (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={styles.rightIconContainer}
              disabled={!onRightIconPress}
            >
              <Ionicons name={rightIcon} size={20} color={Colors.gray[400]} />
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

const styles = StyleSheet.create({
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
    color: Colors.gray[700],
  },
  labelError: {
    color: Colors.error.main,
  },
  required: {
    color: Colors.error.main,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray[200],
    borderRadius: 999,
    overflow: 'hidden',
  },
  inputContainerFocused: {
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: Colors.error.main,
  },
  inputContainerDisabled: {
    backgroundColor: Colors.gray[100],
  },
  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: Spacing[4],
    fontSize: Typography.fontSize.base,
    color: Colors.gray[900],
  },
  inputWithLeftIcon: {
    paddingLeft: Spacing[3],
  },
  inputWithRightIcon: {
    paddingRight: Spacing[3],
  },
  inputDisabled: {
    color: Colors.gray[500],
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
    color: Colors.gray[500],
  },
  helperError: {
    color: Colors.error.main,
  },
});

Input.displayName = 'Input';

export default Input;
