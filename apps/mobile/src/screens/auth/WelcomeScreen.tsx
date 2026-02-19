/**
 * Welcome Screen
 * 
 * Soft, modern design with light blue background
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Animated, { 
  FadeInDown, 
  FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing } from '@/config';
import { AuthStackScreenProps } from '@/navigation/types';

const { width, height } = Dimensions.get('window');

type NavigationProp = AuthStackScreenProps<'Welcome'>['navigation'];

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Light Yellow to White Gradient Background */}
      <LinearGradient
        colors={['#E0F2FE', '#FFFFFF']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <SafeAreaView style={styles.content}>
        {/* Logo and Branding */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.brandingContainer}
        >
          <Image 
            source={require('../../../assets/Stunity.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          
          <Text style={styles.tagline}>
            Welcome to Stunity
          </Text>
          
          <Text style={styles.description}>
            Enterprise Social Learning Platform for Educational Excellence
          </Text>
        </Animated.View>

        <View style={styles.spacer} />

        {/* Buttons */}
        <Animated.View 
          entering={FadeInUp.delay(400).duration(600)}
          style={styles.buttonsContainer}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.8}
            accessibilityLabel="Create new account"
            accessibilityRole="button"
            style={styles.buttonShadow}
          >
            <LinearGradient
              colors={['#0EA5E9', '#0284C7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
            accessibilityLabel="Sign in with existing account"
            accessibilityRole="button"
            style={styles.buttonShadow}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.secondaryButton}
            >
              <Ionicons name="log-in-outline" size={20} color={Colors.white} style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.ssoButton, styles.ssoButtonShadow]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
            accessibilityLabel="Enterprise SSO login"
            accessibilityRole="button"
          >
            <View style={styles.ssoIconContainer}>
              <Ionicons name="business" size={18} color="#0EA5E9" />
            </View>
            <Text style={styles.ssoButtonText}>Enterprise SSO</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Ionicons name="shield-checkmark" size={16} color={Colors.gray[400]} />
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Trusted by educational institutions worldwide
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    justifyContent: 'center',
  },
  brandingContainer: {
    alignItems: 'center',
    marginTop: height * 0.08,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: Spacing[8],
  },
  tagline: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.gray[900],
    textAlign: 'center',
    marginBottom: Spacing[3],
    letterSpacing: -0.5,
  },
  description: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[600],
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing[4],
  },
  spacer: {
    flex: 1,
  },
  buttonsContainer: {
    marginBottom: Spacing[8],
    gap: Spacing[4],
  },
  buttonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 28,
  },
  primaryButton: {
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.fontSize.lg,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonIcon: {
    marginRight: Spacing[2],
  },
  secondaryButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.fontSize.lg,
    letterSpacing: 0.5,
  },
  ssoButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: '#E0F2FE',
    flexDirection: 'row',
  },
  ssoButtonShadow: {
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ssoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[2],
  },
  ssoButtonText: {
    color: Colors.gray[700],
    fontWeight: '600',
    fontSize: Typography.fontSize.base,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing[2],
    gap: Spacing[2],
  },
  dividerLine: {
    width: 40,
    height: 1,
    backgroundColor: Colors.gray[300],
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing[4],
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[500],
    textAlign: 'center',
    fontWeight: '500',
  },
});
