/**
 * Auth Navigator
 * 
 * Authentication flow screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { Colors } from '@/config';

// Import actual screen components
import {
  WelcomeScreen,
  LoginScreen,
  RegisterScreen,
  ParentLoginScreen,
  ParentRegisterScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
  TwoFactorScreen,
  ForceChangePasswordScreen,
  ClaimCodeSetupScreen,
} from '@/screens/auth';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.white },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ParentLogin" component={ParentLoginScreen} />
      <Stack.Screen name="ParentRegister" component={ParentRegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="TwoFactor" component={TwoFactorScreen as any} />
      <Stack.Screen name="ForceChangePassword" component={ForceChangePasswordScreen} />
      <Stack.Screen name="ClaimCodeSetup" component={ClaimCodeSetupScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
