/**
 * Definisi daftar route/halaman yang tersedia di aplikasi
 */
export type RootStackParamList = {
  Dashboard: undefined;
  DptScreen: {
    mode?: 'normal' | 'express'; // Contoh parameter opsional
  };
};

/**
 * Tipe untuk state tab aktif di dalam DptScreen
 */
export type DptTabType = "console" | "webview";