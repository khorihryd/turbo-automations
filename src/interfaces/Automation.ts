/**
 * Struktur data baris yang dibaca dari file Excel
 */

export interface ExcelRowData {
  NIK_Number: string;
  KPJ_Number: string;
  Full_Name: string;
  Birth_Date: string;
}

/**
 * Hasil akhir setelah proses automasi selesai (siap untuk export)
 */
export interface AutomationResult {
  KPJ_Number: string;
  NIK_Number: string;
  Full_Name: string;
  Birth_Date: string;
  Email: string;
  kabupaten: string;
  kecamatan: string;
  kelurahan: string;
  Lasik_Result: string;
}

/**
 * State untuk monitoring progress di UI
 */
export interface AutomationProgress {
  success: number;
  failed: number;
  pending: number;
  current: number;
}