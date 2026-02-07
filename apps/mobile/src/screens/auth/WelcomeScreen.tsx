/**
 * Welcome Screen
 * 
 * App entry point with branding and auth options
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing } from '@/config';
import { AuthStackScreenProps } from '@/navigation/types';

const { width, height } = Dimensions.get('window');

type NavigationProp = AuthStackScreenProps<'Welcome'>['navigation'];

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={[Colors.primary[500], Colors.secondary[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />

      <SafeAreaView style={styles.content}>
        {/* Logo and Branding */}
        <View style={styles.brandingContainer}>
          <View style={styles.logoContainer}>
            <Ionicons name="school" size={80} color={Colors.white} />
          </View>
          <Text style={styles.appName}>Stunity</Text>
          <Text style={styles.tagline}>Learn Together, Grow Together</Text>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <FeatureItem icon="book-outline" text="Explore Courses" />
            <FeatureItem icon="people-outline" text="Join Clubs" />
          </View>
          <View style={styles.featureRow}>
            <FeatureItem icon="chatbubbles-outline" text="Connect" />
            <FeatureItem icon="trophy-outline" text="Achieve" />
          </View>
        </View>

        {/* Auth Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginText}>I already have an account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

// Feature Item Component
function FeatureItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={24} color={Colors.white} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    justifyContent: 'space-between',
  },
  brandingContainer: {
    alignItems: 'center',
    marginTop: height * 0.1,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[4],
  },
  appName: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: Typography.fontSize.lg,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: Spacing[2],
  },
  featuresContainer: {
    marginVertical: Spacing[8],
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing[4],
  },
  featureItem: {
    alignItems: 'center',
    width: width * 0.4,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  featureText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
    fontWeight: '500',
  },
  buttonsContainer: {
    marginBottom: Spacing[4],
  },
  getStartedButton: {
    backgroundColor: Colors.white,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
  },
  getStartedText: {
    color: Colors.primary[600],
    fontWeight: '700',
    fontSize: Typography.fontSize.lg,
  },
  loginButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: Typography.fontSize.lg,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: Spacing[4],
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
