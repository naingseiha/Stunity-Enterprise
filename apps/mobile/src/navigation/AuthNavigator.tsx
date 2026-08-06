/**
 * Auth Navigator
 * 
 * Authentication flow screens
 */

import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { useThemeContext } from '@/contexts';
import { useLayoutBreakpoint } from '@/hooks/useLayoutBreakpoint';
import { getTabletSceneStyle } from '@/utils/layout';

// Import actual screen components
import {
  WelcomeScreen,
  LoginScreen,
  PasswordlessAuthScreen,
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
const PasswordlessLoginScreen = () => <PasswordlessAuthScreen entry="login" />;
const PasswordlessRegisterScreen = () => <PasswordlessAuthScreen entry="register" />;
const LoginEntryScreen = process.env.EXPO_PUBLIC_PASSWORDLESS_AUTH_ENABLED === 'true' ? PasswordlessLoginScreen : LoginScreen;
const RegisterEntryScreen = process.env.EXPO_PUBLIC_PASSWORDLESS_AUTH_ENABLED === 'true' ? PasswordlessRegisterScreen : RegisterScreen;

const AuthNavigator: React.FC = () => {
  const layout = useLayoutBreakpoint();
  const { colors } = useThemeContext();
  const tabletScene = getTabletSceneStyle(layout);
  const contentStyle = useMemo(
    () => ({
      backgroundColor: colors.background,
      ...(tabletScene || {}),
    }),
    [colors.background, tabletScene],
  );

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginEntryScreen} />
      <Stack.Screen name="Register" component={RegisterEntryScreen} />
      <Stack.Screen name="PasswordLogin" component={LoginScreen} />
      <Stack.Screen name="ParentLogin" component={ParentLoginScreen} />
      <Stack.Screen name="ParentRegister" component={ParentRegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="TwoFactor" component={TwoFactorScreen} />
      <Stack.Screen name="ForceChangePassword" component={ForceChangePasswordScreen} />
      <Stack.Screen name="ClaimCodeSetup" component={ClaimCodeSetupScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
