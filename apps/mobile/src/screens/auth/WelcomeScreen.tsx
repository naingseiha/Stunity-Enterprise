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
        colors={['#FEF3C7', '#FFFFFF']}
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
            Welcome to Stunity 👋
          </Text>
          
          <Text style={styles.description}>
            Your educational social learning platform
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
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color={Colors.gray[700]} style={styles.buttonIcon} />
            <Text style={styles.secondaryButtonText}>Continue With Google</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-apple" size={20} color={Colors.gray[700]} style={styles.buttonIcon} />
            <Text style={styles.secondaryButtonText}>Continue With Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Login</Text>
            </Text>
          </TouchableOpacity>
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
    width: 180,
    height: 180,
    marginBottom: Spacing[6],
  },
  tagline: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '600',
    color: Colors.gray[900],
    textAlign: 'center',
    marginBottom: Spacing[3],
  },
  description: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[600],
    textAlign: 'center',
    lineHeight: 22,
  },
  spacer: {
    flex: 1,
  },
  buttonsContainer: {
    marginBottom: Spacing[8],
    gap: Spacing[3],
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: Typography.fontSize.base,
  },
  secondaryButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    flexDirection: 'row',
  },
  buttonIcon: {
    marginRight: Spacing[2],
  },
  secondaryButtonText: {
    color: Colors.gray[900],
    fontWeight: '500',
    fontSize: Typography.fontSize.base,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: Spacing[4],
  },
  linkText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[700],
  },
  linkBold: {
    fontWeight: '600',
    color: '#F59E0B',
  },
});
