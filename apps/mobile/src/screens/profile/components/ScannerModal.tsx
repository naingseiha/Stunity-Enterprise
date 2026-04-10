import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

interface ScannerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function ScannerModal({ isVisible, onClose, onScan }: ScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setScanned(false);
      if (!permission?.granted && permission?.canAskAgain) {
        requestPermission();
      }
    }
  }, [isVisible, permission]);

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Deep Link URI format parser (Option B)
    // Accepts either raw code "STNT-XXXX-YYYY" or URI "stunity://link-school?code=STNT-XXXX-YYYY"
    let extractCode = data;
    const codeMatch = data.match(/[?&]code=([^&]+)/i);
    if (codeMatch?.[1]) {
      try {
        extractCode = decodeURIComponent(codeMatch[1]);
      } catch {
        extractCode = codeMatch[1];
      }
    }

    onScan(extractCode.trim().toUpperCase());
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan QR Code</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        {!permission ? (
          <View style={styles.centerParams}>
            <Text style={styles.permissionText}>Loading camera permissions...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.centerParams}>
            <Ionicons name="camera-outline" size={48} color="#9CA3AF" />
            <Text style={styles.permissionText}>We need your permission to show the camera to scan claim codes.</Text>
            <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
              <Text style={styles.grantButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            >
              <View style={styles.overlay}>
                <View style={styles.scanFrame} />
              </View>
            </CameraView>
            {scanned && (
              <TouchableOpacity style={styles.rescanButton} onPress={() => setScanned(false)}>
                <Text style={styles.rescanText}>Tap to Scan Again</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.hint}>Point your camera at the school's QR code</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const { width } = Dimensions.get('window');
const frameSize = width * 0.7;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#111827' 
  },
  closeButton: { 
    padding: 4 
  },
  centerParams: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24 
  },
  permissionText: { 
    textAlign: 'center', 
    marginTop: 16, 
    marginBottom: 24, 
    fontSize: 16, 
    color: '#4B5563', 
    lineHeight: 24 
  },
  grantButton: { 
    backgroundColor: '#0EA5E9', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 8 
  },
  grantButtonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 16 
  },
  cameraContainer: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  camera: { 
    flex: 1 
  },
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  scanFrame: {
    width: frameSize,
    height: frameSize,
    borderWidth: 2,
    borderColor: '#0EA5E9',
    backgroundColor: 'transparent',
    borderRadius: 24
  },
  hint: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  rescanButton: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20
  },
  rescanText: { 
    color: '#fff', 
    fontWeight: '600' 
  }
});
