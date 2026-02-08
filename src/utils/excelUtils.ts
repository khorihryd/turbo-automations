import * as XLSX from 'xlsx';
import { ExcelRowData, AutomationResult } from '../interfaces/Automation';

/**
 * Mengonversi array buffer dari file Excel menjadi array objek JSON
 */
export const parseExcelData = (arrayBuffer: ArrayBuffer): ExcelRowData[] => {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Mengonversi worksheet ke JSON dengan tipe data yang sesuai
    return XLSX.utils.sheet_to_json(worksheet) as ExcelRowData[];
  } catch (error) {
    console.error('Error parsing excel buffer:', error);
    throw new Error('Format file Excel tidak valid atau rusak.');
  }
};

/**
 * Membuat format Base64 dari hasil automasi untuk siap disimpan sebagai file .xlsx
 */
export const generateExcelBase64 = (results: AutomationResult[]): string => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil DPT");
    
    // Menghasilkan output dalam format base64
    return XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  } catch (error) {
    console.error('Error generating excel base64:', error);
    throw new Error('Gagal menyusun data Excel.');
  }
};

/**
 * Membuat nama file unik berdasarkan timestamp lokal
 */
export const generateFileName = (prefix: string = 'Hasil_DPT'): string => {
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    .replace(/[/]/g, '-')
    .replace(/[:]/g, '.')
    .replace(/[ ]/g, '_');
    
  return `${prefix}_${timestamp}.xlsx`;
};