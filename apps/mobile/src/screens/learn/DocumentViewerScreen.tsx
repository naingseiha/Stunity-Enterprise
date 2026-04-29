import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

import { LearnStackParamList, LearnStackScreenProps } from '@/navigation/types';

let OptionalWebView: any = null;
let OptionalPdf: any = null;

try {
  OptionalWebView = require('react-native-webview').WebView;
} catch {
  OptionalWebView = null;
}

try {
  OptionalPdf = require('react-native-pdf').default;
} catch {
  OptionalPdf = null;
}

type RouteParams = RouteProp<LearnStackParamList, 'DocumentViewer'>;
type NavigationProp = LearnStackScreenProps<'DocumentViewer'>['navigation'];
const PDF_LAST_PAGE_KEY_PREFIX = 'learn-pdf-last-page:';

const getViewerUrl = (resourceUrl: string, resourceType?: string) => {
  const normalizedType = String(resourceType || '').trim().toUpperCase();
  const encodedUrl = encodeURIComponent(resourceUrl);

  if (normalizedType === 'PDF' || normalizedType === 'FILE' || normalizedType === 'DOCUMENT') {
    return `https://docs.google.com/gview?embedded=1&url=${encodedUrl}`;
  }

  return resourceUrl;
};

const getResourceTypeLabel = (resourceType?: string) => {
  const normalizedType = String(resourceType || '').trim().toUpperCase();
  switch (normalizedType) {
    case 'PDF':
      return 'PDF';
    case 'DOCUMENT':
      return 'Document';
    case 'FILE':
      return 'File';
    case 'LINK':
      return 'Link';
    default:
      return normalizedType || 'Document';
  }
};

const getResourceHostLabel = (resourceUrl: string) => {
  try {
    return new URL(resourceUrl).host.replace(/^www\./, '');
  } catch {
    return 'External source';
  }
};

const getCachedResourceUri = (url: string) => {
  const fallbackName = `document-${Date.now()}`;
  let fileName = fallbackName;

  try {
    const pathname = new URL(url).pathname;
    fileName = pathname.split('/').pop() || fallbackName;
  } catch {
    fileName = fallbackName;
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `${FileSystem.cacheDirectory || ''}learn-viewer/${safeName}`;
};

export default function DocumentViewerScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { title, url, resourceType } = route.params;
  const pdfRef = useRef<{ setPage: (pageNumber: number) => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [viewerKey, setViewerKey] = useState(0);
  const [savedPage, setSavedPage] = useState<number | null>(null);
  const [didResumeFromSavedPage, setDidResumeFromSavedPage] = useState(false);

  const viewerUrl = useMemo(() => getViewerUrl(url, resourceType), [resourceType, url]);
  const isPdfResource = useMemo(() => String(resourceType || '').trim().toUpperCase() === 'PDF', [resourceType]);
  const hasNativePdfViewer = Boolean(OptionalPdf);
  const hasWebViewViewer = Boolean(OptionalWebView);
  const resourceTypeLabel = useMemo(() => getResourceTypeLabel(resourceType), [resourceType]);
  const resourceHostLabel = useMemo(() => getResourceHostLabel(url), [url]);
  const pdfSource = useMemo(
    () => ({
      uri: url,
      cache: true,
    }),
    [url]
  );
  const pdfLastPageStorageKey = useMemo(() => `${PDF_LAST_PAGE_KEY_PREFIX}${url}`, [url]);
  const restoredInitialPageRef = useRef(false);

  useEffect(() => {
    if (!isPdfResource) return;

    let cancelled = false;
    const loadSavedPage = async () => {
      try {
        const stored = await AsyncStorage.getItem(pdfLastPageStorageKey);
        if (cancelled || !stored) return;
        const parsed = Number.parseInt(stored, 10);
        if (Number.isFinite(parsed) && parsed > 1) {
          setSavedPage(parsed);
        }
      } catch {
        // Ignore restore failures and continue with page 1.
      }
    };

    void loadSavedPage();

    return () => {
      cancelled = true;
    };
  }, [isPdfResource, pdfLastPageStorageKey]);

  const resetViewer = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    restoredInitialPageRef.current = false;
    setDidResumeFromSavedPage(false);
    setViewerKey((previous) => previous + 1);
  }, []);

  const goToPreviousPage = useCallback(() => {
    if (!pdfRef.current || page <= 1) return;
    pdfRef.current.setPage(page - 1);
  }, [page]);

  const goToNextPage = useCallback(() => {
    if (!pdfRef.current || !pageCount || page >= pageCount) return;
    pdfRef.current.setPage(page + 1);
  }, [page, pageCount]);

  const openExternal = async () => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error('This document cannot be opened on this device.');
      }
      await Linking.openURL(url);
    } catch (error: any) {
      Alert.alert(t('learn.documentViewer.openDocument'), error?.message || t('learn.documentViewer.unableOpen'));
    }
  };

  const shareDocument = async () => {
    try {
      setSharing(true);
      const viewerDir = `${FileSystem.cacheDirectory || ''}learn-viewer/`;
      const dirInfo = await FileSystem.getInfoAsync(viewerDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(viewerDir, { intermediates: true });
      }

      const localUri = getCachedResourceUri(url);
      const existing = await FileSystem.getInfoAsync(localUri);
      const finalUri = existing.exists ? localUri : (await FileSystem.downloadAsync(url, localUri)).uri;

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(finalUri, {
          dialogTitle: title || t('learn.documentViewer.shareDocument'),
        });
      } else {
        await Linking.openURL(finalUri);
      }
    } catch (error: any) {
      Alert.alert(t('learn.documentViewer.shareDocument'), error?.message || t('learn.documentViewer.unableShare'));
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#334155" />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title || t('learn.documentViewer.document')}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {resourceTypeLabel} • {resourceHostLabel}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.viewerWrap}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionChip} onPress={openExternal}>
            <Ionicons name="open-outline" size={15} color="#475569" />
            <Text style={styles.actionChipText}>{t('learn.documentViewer.openExternally')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionChip} onPress={shareDocument} disabled={sharing}>
            {sharing ? (
              <ActivityIndicator size="small" color="#475569" />
            ) : (
              <>
                <Ionicons name="share-social-outline" size={15} color="#475569" />
                <Text style={styles.actionChipText}>{t('learn.documentViewer.saveOrShare')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {isPdfResource ? (
          hasNativePdfViewer ? (
            <>
              <OptionalPdf
                key={`pdf-${viewerKey}`}
                ref={pdfRef}
                source={pdfSource}
                style={styles.pdf}
                trustAllCerts={false}
                enablePaging={false}
                fitPolicy={0}
                onLoadProgress={() => {
                  setLoading(true);
                  setLoadError(null);
                }}
                onLoadComplete={(numberOfPages: number) => {
                  setLoading(false);
                  setPage(1);
                  setPageCount(numberOfPages);
                  if (
                    savedPage
                    && savedPage > 1
                    && savedPage <= numberOfPages
                    && pdfRef.current
                    && !restoredInitialPageRef.current
                  ) {
                    restoredInitialPageRef.current = true;
                    setDidResumeFromSavedPage(true);
                    pdfRef.current.setPage(savedPage);
                    setPage(savedPage);
                  }
                }}
                onPageChanged={(nextPage: number, numberOfPages: number) => {
                  setPage(nextPage);
                  setPageCount(numberOfPages);
                  setSavedPage(nextPage);
                  void AsyncStorage.setItem(pdfLastPageStorageKey, String(nextPage));
                }}
                onError={(error: unknown) => {
                  setLoading(false);
                  setLoadError(error instanceof Error ? error.message : t('learn.documentViewer.unableRenderPdfInline'));
                }}
                renderActivityIndicator={() => (
                  <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                    <Text style={styles.loadingText}>{t('learn.documentViewer.loadingPdf')}</Text>
                  </View>
                )}
              />
              {pageCount ? (
                <View style={styles.pdfHud}>
                  <Ionicons name="document-text-outline" size={14} color="#7C3AED" />
                  <Text style={styles.pdfHudText}>{t('learn.documentViewer.pageOf', { page, total: pageCount })}</Text>
                </View>
              ) : null}
              {didResumeFromSavedPage ? (
                <View style={styles.resumeHud}>
                  <Ionicons name="time-outline" size={14} color="#0F766E" />
                  <Text style={styles.resumeHudText}>{t('learn.documentViewer.resumedLastPage')}</Text>
                </View>
              ) : null}
              {pageCount && pageCount > 1 ? (
                <View style={styles.pdfControls}>
                  <TouchableOpacity
                    style={[styles.pageControlButton, page <= 1 && styles.pageControlButtonDisabled]}
                    onPress={goToPreviousPage}
                    disabled={page <= 1}
                  >
                    <Ionicons name="chevron-back" size={16} color="#7C3AED" />
                    <Text style={styles.pageControlText}>{t('learn.documentViewer.previousPage')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pageControlButton, (!pageCount || page >= pageCount) && styles.pageControlButtonDisabled]}
                    onPress={goToNextPage}
                    disabled={!pageCount || page >= pageCount}
                  >
                    <Text style={styles.pageControlText}>{t('learn.documentViewer.nextPage')}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#7C3AED" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.loadingState}>
              <Ionicons name="construct-outline" size={28} color="#7C3AED" />
              <Text style={styles.loadingText}>{t('learn.documentViewer.pdfViewerUnavailable')}</Text>
            </View>
          )
        ) : (
          hasWebViewViewer ? (
            <OptionalWebView
              key={`web-${viewerKey}`}
              source={{ uri: viewerUrl }}
              onLoadStart={() => {
                setLoading(true);
                setLoadError(null);
              }}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setLoadError(t('learn.documentViewer.unableRenderInline'));
              }}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="large" color="#7C3AED" />
                  <Text style={styles.loadingText}>{t('learn.documentViewer.loadingDocument')}</Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.loadingState}>
              <Ionicons name="construct-outline" size={28} color="#7C3AED" />
              <Text style={styles.loadingText}>{t('learn.documentViewer.documentViewerUnavailable')}</Text>
            </View>
          )
        )}

        {loading && ((isPdfResource && hasNativePdfViewer) || (!isPdfResource && hasWebViewViewer)) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>{isPdfResource ? t('learn.documentViewer.preparingPdfViewer') : t('learn.documentViewer.preparingViewer')}</Text>
          </View>
        )}

        {(loadError || (isPdfResource && !hasNativePdfViewer) || (!isPdfResource && !hasWebViewViewer)) && (
          <View style={styles.errorCard}>
            <Ionicons name="document-text-outline" size={28} color="#7C3AED" />
            <Text style={styles.errorTitle}>{t('learn.documentViewer.inlineUnavailable')}</Text>
            <Text style={styles.errorText}>
              {loadError || (isPdfResource
                ? t('learn.documentViewer.nativePdfModuleMissing')
                : t('learn.documentViewer.webviewModuleMissing'))}
            </Text>
            <View style={styles.errorActions}>
              <TouchableOpacity style={styles.secondaryAction} onPress={resetViewer}>
                <Text style={styles.secondaryActionText}>{t('common.retry')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryAction} onPress={openExternal}>
                <Text style={styles.secondaryActionText}>{t('learn.documentViewer.openExternally')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryAction} onPress={shareDocument}>
                <Text style={styles.primaryActionText}>{t('learn.documentViewer.saveOrShare')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerSafe: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    minHeight: 60,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  headerTitle: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '800',
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerSubtitle: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  viewerWrap: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  actionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
    backgroundColor: '#F8FAFC',
  },
  actionChip: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  pdf: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F8FAFC',
  },
  pdfHud: {
    position: 'absolute',
    top: 16,
    right: 16,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pdfHudText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
  },
  resumeHud: {
    position: 'absolute',
    top: 16,
    left: 16,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(240,253,250,0.96)',
    borderWidth: 1,
    borderColor: '#99F6E4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resumeHudText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
  },
  pdfControls: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    gap: 10,
  },
  pageControlButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pageControlButtonDisabled: {
    opacity: 0.45,
  },
  pageControlText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    gap: 10,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  errorCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    backgroundColor: '#FFFFFF',
    padding: 18,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: '#64748B',
  },
  errorActions: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryAction: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  primaryAction: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
