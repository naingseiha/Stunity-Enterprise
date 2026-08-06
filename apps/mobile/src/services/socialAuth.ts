/**
 * Mobile social auth helpers (Google ID token + Facebook access token).
 * Tokens are verified by our backend identity broker — never trusted client-side.
 */

import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { AccessTokenRequest, Prompt, ResponseType } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
};

const FACEBOOK_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://www.facebook.com/v21.0/dialog/oauth',
  tokenEndpoint: 'https://graph.facebook.com/v21.0/oauth/access_token',
};

export type SocialProviderAcquireResult =
  | { success: true; provider: 'google'; idToken: string }
  | { success: true; provider: 'facebook'; accessToken: string }
  | { success: false; cancelled?: boolean; error?: string };

function envFlagEnabled(name: string, fallbackWhenConfigured: boolean): boolean {
  const raw = process.env[name];
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallbackWhenConfigured;
}

function googleClientIdForPlatform(): string | null {
  const web = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const android = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
  if (Platform.OS === 'ios') return ios || web || null;
  if (Platform.OS === 'android') return android || web || null;
  return web || null;
}

function googleRedirectUri(clientId: string): string {
  const iosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const androidId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
  const isNativePlatformClient =
    (Platform.OS === 'ios' && !!iosId && clientId === iosId) ||
    (Platform.OS === 'android' && !!androidId && clientId === androidId);

  // Native Google OAuth clients expect the reversed-client-id scheme.
  // When falling back to the web client ID, use the app scheme instead.
  if (isNativePlatformClient && clientId.endsWith('.apps.googleusercontent.com')) {
    const guid = clientId.replace(/\.apps\.googleusercontent\.com$/, '');
    return `com.googleusercontent.apps.${guid}:/oauthredirect`;
  }
  return AuthSession.makeRedirectUri({
    scheme: 'stunity',
    path: 'auth/google',
  });
}

async function createNonce(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function isGoogleAuthConfigured(): boolean {
  const configured = !!googleClientIdForPlatform();
  return envFlagEnabled('EXPO_PUBLIC_AUTH_GOOGLE_ENABLED', configured) && configured;
}

export function isFacebookAuthConfigured(): boolean {
  const appId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim();
  const configured = !!appId;
  return envFlagEnabled('EXPO_PUBLIC_AUTH_FACEBOOK_ENABLED', configured) && configured;
}

export async function acquireGoogleIdToken(): Promise<SocialProviderAcquireResult> {
  const clientId = googleClientIdForPlatform();
  if (!clientId) {
    return {
      success: false,
      error:
        'Google Sign-In is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and iOS/Android client IDs for native builds).',
    };
  }

  try {
    const redirectUri = googleRedirectUri(clientId);
    const useCodeExchange = Platform.OS !== 'web';
    const nonce = useCodeExchange ? undefined : await createNonce();
    const request = new AuthSession.AuthRequest({
      clientId,
      redirectUri,
      scopes: [
        'openid',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      responseType: useCodeExchange ? ResponseType.Code : ResponseType.IdToken,
      usePKCE: useCodeExchange,
      prompt: Prompt.SelectAccount,
      extraParams: nonce ? { nonce } : undefined,
    });

    await request.makeAuthUrlAsync(GOOGLE_DISCOVERY);
    const result = await request.promptAsync(GOOGLE_DISCOVERY);

    if (result.type === 'dismiss' || result.type === 'cancel') {
      return { success: false, cancelled: true };
    }
    if (result.type !== 'success') {
      return { success: false, error: 'Google Sign-In did not complete' };
    }

    let idToken = result.params.id_token;
    if (!idToken && result.params.code) {
      const tokenRequest = new AccessTokenRequest({
        clientId,
        redirectUri,
        code: result.params.code,
        scopes: request.scopes,
        extraParams: {
          code_verifier: request.codeVerifier || '',
        },
      });
      const authentication = await tokenRequest.performAsync(GOOGLE_DISCOVERY);
      idToken = authentication.idToken || '';
    }

    if (!idToken) {
      return { success: false, error: 'Google did not return an ID token' };
    }

    return { success: true, provider: 'google', idToken };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Unable to start Google Sign-In',
    };
  }
}

export async function acquireFacebookAccessToken(): Promise<SocialProviderAcquireResult> {
  const clientId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim();
  if (!clientId) {
    return {
      success: false,
      error: 'Facebook Login is not configured. Set EXPO_PUBLIC_FACEBOOK_APP_ID.',
    };
  }

  try {
    // Register stunity://auth/facebook in Facebook Login Valid OAuth Redirect URIs.
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'stunity',
      path: 'auth/facebook',
    });

    const request = new AuthSession.AuthRequest({
      clientId,
      redirectUri,
      scopes: ['public_profile', 'email'],
      responseType: ResponseType.Token,
      usePKCE: false,
      extraParams: { display: 'popup' },
    });

    await request.makeAuthUrlAsync(FACEBOOK_DISCOVERY);
    const result = await request.promptAsync(FACEBOOK_DISCOVERY);

    if (result.type === 'dismiss' || result.type === 'cancel') {
      return { success: false, cancelled: true };
    }
    if (result.type !== 'success') {
      return { success: false, error: 'Facebook Login did not complete' };
    }

    const accessToken =
      result.authentication?.accessToken || result.params.access_token || '';

    if (!accessToken) {
      return { success: false, error: 'Facebook did not return an access token' };
    }

    return { success: true, provider: 'facebook', accessToken };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Unable to start Facebook Login',
    };
  }
}
