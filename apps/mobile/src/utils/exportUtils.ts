import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { Alert } from 'react-native';

export const exportToExcel = async (data: any[], fileName: string, sheetName: string = 'Sheet 1') => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    const fileUri = `${FileSystem.documentDirectory}${fileName}.xlsx`;

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export to Excel',
        UTI: 'com.microsoft.excel.xls'
      });
    } else {
      Alert.alert('Error', 'Sharing is not available on this device');
    }
  } catch (error: any) {
    Alert.alert('Export Failed', error?.message || 'Failed to export Excel file');
  }
};
