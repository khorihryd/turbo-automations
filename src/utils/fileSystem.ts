import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

/**
 * Menyimpan string base64 ke dalam direktori dokumen aplikasi
 */
export const saveBase64ToFile = async (fileName: string, base64Data: string): Promise<string> => {
  try {
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: 'base64',
    });
    
    return fileUri;
  } catch (error) {
    console.error('Error writing file to system:', error);
    throw new Error('Gagal menulis file ke sistem penyimpanan.');
  }
};

/**
 * Memindahkan file dari cache/doc directory ke album publik (Gallery/Downloads)
 */
export const saveToPublicAlbum = async (fileUri: string, albumName: string = 'DPT_Results'): Promise<boolean> => {
  try {
    const asset = await MediaLibrary.createAssetAsync(fileUri);
    const album = await MediaLibrary.getAlbumAsync(albumName);
    
    if (album === null) {
      await MediaLibrary.createAlbumAsync(albumName, asset, false);
    } else {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving to public album:', error);
    return false; // Kita kembalikan false agar UI bisa memberikan fallback (misal: hanya share)
  }
};

/**
 * Menghapus file sementara jika sudah tidak diperlukan
 */
export const deleteFile = async (fileUri: string): Promise<void> => {
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch (error) {
    console.warn('Gagal menghapus file sementara:', error);
  }
};