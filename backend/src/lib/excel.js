import ExcelJS from 'exceljs';

/**
 * Excel export/import helper for Nextal HR
 */
export async function createWorkbook() {
  return new ExcelJS.Workbook();
}

export async function parseExcelBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

export default {
  createWorkbook,
  parseExcelBuffer,
};
