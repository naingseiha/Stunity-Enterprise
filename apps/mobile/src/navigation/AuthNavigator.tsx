/**
 * Auth Navigator
 * 
 * Authentication flow screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { Colors } from '@/config';

// Placeholder components (will be implemented)
import { View, Text, StyleSheet } from 'react-native';

const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>{title}</Text>
  </View>
);

const WelcomeScreen = () => <PlaceholderScreen title="Welcome" />;
const LoginScreen = () => <PlaceholderScreen title="Login" />;
const RegisterScreen = () => <PlaceholderScreen title="Register" />;
const ForgotPasswordScreen = () => <PlaceholderScreen title="Forgot Password" />;
const VerifyOTPScreen = () => <PlaceholderScreen title="Verify OTP" />;
const ResetPasswordScreen = () => <PlaceholderScreen title="Reset Password" />;

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.white },
        animation: 'slide_from_right',
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray[50],
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.gray[400],
  },
});

export default AuthNavigator;
