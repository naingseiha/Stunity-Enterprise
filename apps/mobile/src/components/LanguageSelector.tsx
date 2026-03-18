import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  // countryCode is the ISO 3166-1 alpha-2 country code for the flag image
  countryCode: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English',  nativeName: 'English',    countryCode: 'us' },
  { code: 'km', name: 'Khmer',    nativeName: 'ភាសាខ្មែរ',  countryCode: 'kh' },
];

const getFlagUrl = (countryCode: string) =>
  `https://flagcdn.com/w80/${countryCode}.png`;

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ visible, onClose }) => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    onClose();
  };

  const renderItem = ({ item }: { item: Language }) => {
    const isSelected = i18n.language === item.code;

    return (
      <TouchableOpacity
        style={[styles.languageItem, isSelected && styles.languageItemActive]}
        onPress={() => changeLanguage(item.code)}
      >
        <View style={styles.languageInfo}>
          <Image
            source={{ uri: getFlagUrl(item.countryCode) }}
            style={styles.flag}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.languageName, isSelected && styles.languageTextActive]}>
              {item.nativeName}
            </Text>
            <Text style={styles.languageSubName}>{item.name}</Text>
          </View>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#00A99D" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('common.language')}</Text>
          <View style={{ width: 44 }} />
        </View>

        <FlatList
          data={LANGUAGES}
          renderItem={renderItem}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#FFF',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  listContent: {
    padding: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  languageItemActive: {
    borderColor: '#00A99D',
    backgroundColor: '#F0FFFE',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    width: 40,
    height: 28,
    marginRight: 16,
    borderRadius: 3,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  languageTextActive: {
    color: '#00A99D',
  },
  languageSubName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});
