import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_USER_CARD_DESIGN_ID,
  DEFAULT_USER_CARD_ORIENTATION,
  DEFAULT_USER_CARD_STYLE_ID,
  UserCardDesignId,
  UserCardOrientation,
  UserCardStyleId,
  isUserCardDesignId,
  isUserCardOrientation,
  isUserCardStyleId,
} from '@/config/userCardStyles';

const USER_CARD_STYLE_PREFERENCE_KEY = '@stunity:user-card-style:v1';
const USER_CARD_ORIENTATION_PREFERENCE_KEY = '@stunity:user-card-orientation:v1';
const USER_CARD_DESIGN_PREFERENCE_KEY = '@stunity:user-card-design:v1';

export const getUserCardStylePreference = async (): Promise<UserCardStyleId> => {
  try {
    const storedValue = await AsyncStorage.getItem(USER_CARD_STYLE_PREFERENCE_KEY);
    if (storedValue && isUserCardStyleId(storedValue)) {
      return storedValue;
    }

    if (storedValue && !isUserCardStyleId(storedValue)) {
      console.warn('Invalid user card style preference found. Resetting to default.');
      await AsyncStorage.removeItem(USER_CARD_STYLE_PREFERENCE_KEY);
    }

    return DEFAULT_USER_CARD_STYLE_ID;
  } catch (error) {
    console.error('Failed to read user card style preference. Falling back to default style.', error);
    return DEFAULT_USER_CARD_STYLE_ID;
  }
};

export const saveUserCardStylePreference = async (styleId: UserCardStyleId): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_CARD_STYLE_PREFERENCE_KEY, styleId);
  } catch (error) {
    console.error('Failed to save user card style preference.', error);
    throw error;
  }
};

export const getUserCardDesignPreference = async (): Promise<UserCardDesignId> => {
  try {
    const storedValue = await AsyncStorage.getItem(USER_CARD_DESIGN_PREFERENCE_KEY);
    if (storedValue && isUserCardDesignId(storedValue)) {
      return storedValue;
    }

    if (storedValue && !isUserCardDesignId(storedValue)) {
      console.warn('Invalid user card design preference found. Resetting to default.');
      await AsyncStorage.removeItem(USER_CARD_DESIGN_PREFERENCE_KEY);
    }

    return DEFAULT_USER_CARD_DESIGN_ID;
  } catch (error) {
    console.error('Failed to read user card design preference. Falling back to default design.', error);
    return DEFAULT_USER_CARD_DESIGN_ID;
  }
};

export const saveUserCardDesignPreference = async (designId: UserCardDesignId): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_CARD_DESIGN_PREFERENCE_KEY, designId);
  } catch (error) {
    console.error('Failed to save user card design preference.', error);
    throw error;
  }
};

export const getUserCardOrientationPreference = async (): Promise<UserCardOrientation> => {
  try {
    const storedValue = await AsyncStorage.getItem(USER_CARD_ORIENTATION_PREFERENCE_KEY);
    if (storedValue && isUserCardOrientation(storedValue)) {
      return storedValue;
    }

    if (storedValue && !isUserCardOrientation(storedValue)) {
      console.warn('Invalid user card orientation preference found. Resetting to default.');
      await AsyncStorage.removeItem(USER_CARD_ORIENTATION_PREFERENCE_KEY);
    }

    return DEFAULT_USER_CARD_ORIENTATION;
  } catch (error) {
    console.error('Failed to read user card orientation preference. Falling back to default orientation.', error);
    return DEFAULT_USER_CARD_ORIENTATION;
  }
};

export const saveUserCardOrientationPreference = async (
  orientation: UserCardOrientation
): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_CARD_ORIENTATION_PREFERENCE_KEY, orientation);
  } catch (error) {
    console.error('Failed to save user card orientation preference.', error);
    throw error;
  }
};
