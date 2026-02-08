import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

export const usePermissions = (addLog: (msg: string) => void) => {
  const [permissionGranted, setPermissionGranted] = useState(false);

  /**
   * Fungsi untuk mengecek status izin saat ini tanpa memunculkan prompt
   */
  const checkPermissions = async () => {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status === 'granted') {
        setPermissionGranted(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  };

  /**
   * Fungsi untuk meminta izin kepada user
   */
  const requestStoragePermission = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status === 'granted') {
        setPermissionGranted(true);
        addLog('✅ Izin penyimpanan diberikan');
        return true;
      } else {
        setPermissionGranted(false);
        addLog('❌ Izin penyimpanan ditolak');
        Alert.alert(
          'Izin Diperlukan',
          'Aplikasi memerlukan izin penyimpanan untuk menyimpan hasil export.',
          [
            { text: 'Batal', style: 'cancel' },
            { text: 'Coba Lagi', onPress: () => requestStoragePermission() }
          ]
        );
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      addLog('❌ Gagal meminta izin penyimpanan');
      return false;
    }
  };

  // Cek izin secara otomatis saat hook pertama kali dipanggil
  useEffect(() => {
    checkPermissions();
  }, []);

  return {
    permissionGranted,
    requestStoragePermission,
    checkPermissions
  };
};