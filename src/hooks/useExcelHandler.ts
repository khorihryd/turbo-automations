import { useState } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { ExcelRowData, AutomationResult } from '../interfaces/Automation';

export const useExcelHandler = (addLog: (msg: string) => void) => {
  // Gunakan tanda | untuk menggabungkan tipe
  const [excelDataLengkap, setExcelDataLengkap] = useState<ExcelRowData[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelName, setExcelName] = useState<string>();
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Fungsi Request Izin Penyimpanan
  const requestStoragePermission = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        setPermissionGranted(true);
        addLog('✅ Izin penyimpanan diberikan');
        return true;
      } else {
        addLog('❌ Izin penyimpanan ditolak');
        Alert.alert(
          'Izin Diperlukan',
          'Aplikasi memerlukan izin penyimpanan untuk menyimpan hasil export.'
        );
        return false;
      }
    } catch (error) {
      addLog('❌ Gagal meminta izin penyimpanan');
      return false;
    }
  };

  const pickExcelForOss = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.ms-excel', 
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        copyToCacheDirectory: true
      });
      if (res.canceled) return;    
      const response = await fetch(res.assets[0].uri);
      const fileName = res.assets[0].name; 
      const blob = await response.arrayBuffer();
      const wb = XLSX.read(blob, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const kpjList = data.flat().map(item => item?.toString().trim()).filter(item => item && item.length > 5);
      setExcelData(kpjList);
      setExcelName(fileName);
      addLog(`Loaded ${kpjList.length} KPJ numbers`);
  } catch (err) { Alert.alert('Error', 'Gagal membaca Excel'); }  
};

  // Fungsi Memilih File Excel
  const pickExcel = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.ms-excel', 
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        copyToCacheDirectory: true
      });
      
      if (res.canceled) return;
      
      const response = await fetch(res.assets[0].uri);
      const fileName = res.assets[0].name; 
      const blob = await response.arrayBuffer();
      const wb = XLSX.read(blob, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // Logika pemilihan output berdasarkan parameter noHeader
      const data = XLSX.utils.sheet_to_json(ws) as ExcelRowData[];

     // const kpjList = noHeader? data.flat().map(item => item?.toString().trim()).filter(item => item && item.length > 5): [];
      
      setExcelDataLengkap(data);
      setExcelName(fileName);
      addLog(`✅ Loaded ${data.length} data dari ${fileName}`);
      
      return data;
    } catch (error) {
      addLog('❌ Gagal membaca file Excel');
      Alert.alert('Error', 'Gagal membaca file Excel');
    }
  };

  // Fungsi Export Hasil ke Excel
  const exportResults = async (results: AutomationResult[],checkerName:string) => {
    if (results.length === 0) {
      Alert.alert('Info', 'Tidak ada data untuk di-export');
      return;
    }

    try {
      if (!permissionGranted) {
        const granted = await requestStoragePermission();
        if (!granted) return;
      }

      const ws = XLSX.utils.json_to_sheet(results);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, checkerName);
      
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      
      const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        .replace(/[/]/g, '-')
        .replace(/[:]/g, '.')
        .replace(/[ ]/g, '_');

      const fileName = `${checkerName}_${timestamp}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: 'base64',
      });

      try {
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        await MediaLibrary.createAlbumAsync('DPT_Results', asset, false);
        addLog(`📁 File disimpan: ${fileName}`);
      } catch (saveError) {
        addLog(`📁 Tersimpan di app directory: ${fileName}`);
      }
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Sukses', `Export berhasil (${results.length} baris)`);
      }
      
    } catch (error) {
      addLog(`❌ Error export: ${error}`);
      Alert.alert('Error', 'Gagal mengexport data');
    }
  };

  return {
    excelDataLengkap,
    excelData,
    excelName,
    pickExcel,
    pickExcelForOss,
    exportResults,
    setPermissionGranted,
    permissionGranted
  };
};