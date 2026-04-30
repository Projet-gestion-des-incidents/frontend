// shared/services/export-excel.service.ts
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx-js-style';

export interface MultiSheetExportConfig {
  filename: string;
  sheets: {
    name: string;
    data: any[];
    columns?: { header: string; field: string }[];
  }[];
}

export interface ExcelWithColorsConfig {
  filename: string;
  sheetName: string;
  data: any[];
  colorRules?: {
    column: string;
    getRowColor?: (value: any) => { bgColor: string; fontColor: string };
    getCellColor?: (value: any, columnName: string) => { bgColor: string; fontColor: string };
  }[];
  boldFirstColumn?: boolean;
  columnColors?: {
    [columnName: string]: { bgColor: string; fontColor: string };
  };
  headerStyle?: { bgColor: string; fontColor: string };
  firstColumnBold?: boolean;
  colorHeadersWithColumnColors?: boolean;
  excludeFirstColumnDataFromColoring?: boolean;
  excludeFirstColumnHeaderFromColoring?: boolean;  // ✅ NOUVEAU
}

@Injectable({ providedIn: 'root' })
export class ExportExcelService {
  
  exportToExcel(config: { filename: string; sheetName: string; data: any[]; columns?: any[] }): void {
    let dataToExport = config.data;
    
    if (config.columns && config.columns.length) {
      dataToExport = config.data.map(item => {
        const newItem: any = {};
        config.columns!.forEach(col => {
          newItem[col.header] = this.getValueByPath(item, col.field);
        });
        return newItem;
      });
    }
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, config.sheetName);
    
    this.applyBorders(worksheet, dataToExport.length, Object.keys(dataToExport[0] || {}).length);
    this.autoSizeColumns(worksheet, dataToExport);
    XLSX.writeFile(workbook, `${config.filename}.xlsx`);
  }
  
  exportToExcelWithColors(config: ExcelWithColorsConfig): void {
    console.log('📊 === DÉBUT exportToExcelWithColors ===');
    console.log('📊 Config reçue:', {
      filename: config.filename,
      sheetName: config.sheetName,
      dataLength: config.data.length,
      firstColumnBold: config.firstColumnBold,
      colorHeadersWithColumnColors: config.colorHeadersWithColumnColors,
      excludeFirstColumnDataFromColoring: config.excludeFirstColumnDataFromColoring,
      columnColorsKeys: config.columnColors ? Object.keys(config.columnColors) : 'pas de columnColors',
      hasColorRules: !!config.colorRules
    });
    
    const headers = Object.keys(config.data[0] || {});
    console.log('📊 Headers détectés:', headers);
    
    const wsData = [headers, ...config.data.map(item => headers.map(h => item[h]))];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    
    // Appliquer les styles selon le mode (ligne ou colonne)
    if (config.columnColors) {
      console.log('🎨 Mode: coloration par colonne');
      this.applyColumnColors(worksheet, config.data, headers, config.columnColors, config.excludeFirstColumnDataFromColoring);
      
      if (config.colorHeadersWithColumnColors) {
        console.log('🎨 Application des couleurs aux en-têtes');
        this.applyColoredHeaders(worksheet, headers, config.columnColors, config.excludeFirstColumnDataFromColoring);
      } else {
        console.log('🎨 Pas de coloration des en-têtes');
      }
    } else if (config.colorRules) {
      console.log('🎨 Mode: coloration par ligne');
      this.applyRowColors(worksheet, config.data, headers, config.colorRules, config.boldFirstColumn);
    }
    
    // Appliquer le style à la ligne d'en-tête (si pas déjà fait)
    if (!config.colorHeadersWithColumnColors) {
      console.log('🎨 Application style en-tête par défaut');
      this.applyHeaderStyle(worksheet, headers.length, config.headerStyle);
    }
    
    // Mettre la première colonne en gras si demandé
    if (config.firstColumnBold) {
      console.log('🔤 Mise en gras de la première colonne');
      this.applyFirstColumnBold(worksheet, config.data.length, headers);
    }
    
    // Appliquer les bordures
    this.applyBorders(worksheet, config.data.length, headers.length);
    this.autoSizeColumns(worksheet, config.data);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, config.sheetName);
    XLSX.writeFile(workbook, `${config.filename}.xlsx`);
    
    console.log('✅ Fichier généré:', `${config.filename}.xlsx`);
    console.log('📊 === FIN exportToExcelWithColors ===');
  }
  
  private applyFirstColumnBold(worksheet: any, rowCount: number, headers: string[]): void {
    console.log('🔤 applyFirstColumnBold - rows:', rowCount);
    for (let row = 1; row <= rowCount; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
      if (worksheet[cellAddress]) {
        if (!worksheet[cellAddress].s) {
          worksheet[cellAddress].s = {};
        }
        // Garder le fond blanc et mettre le texte en gras
        worksheet[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } };
        worksheet[cellAddress].s.font = { bold: true };
      }
    }
  }
  
  private applyColoredHeaders(worksheet: any, headers: string[], columnColors: { [key: string]: { bgColor: string; fontColor: string } }, excludeFirstColumn?: boolean): void {
    console.log('🎨 applyColoredHeaders - headers:', headers);
    console.log('🎨 excludeFirstColumn:', excludeFirstColumn);
    
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      const columnName = headers[colIdx];
      console.log(`🎨 Traitement colonne ${colIdx}: ${columnName}`);
      
      // ✅ Si on exclut la première colonne
      if (excludeFirstColumn && colIdx === 0) {
        console.log(`🎨 Colonne 0 exclue - fond BLANC`);
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIdx });
        if (worksheet[cellAddress]) {
          if (!worksheet[cellAddress].s) {
            worksheet[cellAddress].s = {};
          }
          worksheet[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } };
          worksheet[cellAddress].s.font = { color: { rgb: '0C144E' }, bold: true, sz: 12 };
          worksheet[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
        }
        continue;
      }
      
      const colors = columnColors[columnName];
      let bgColor = 'ECECFF';
      let fontColor = '0C144E';
      
      if (colors) {
        bgColor = colors.bgColor;
        fontColor = colors.fontColor;
        console.log(`🎨 Couleur trouvée pour ${columnName}: bg=${bgColor}, font=${fontColor}`);
      } else {
        console.log(`🎨 Aucune couleur trouvée pour ${columnName}, utilisation defaut`);
      }
      
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      if (worksheet[cellAddress]) {
        if (!worksheet[cellAddress].s) {
          worksheet[cellAddress].s = {};
        }
        worksheet[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: bgColor } };
        worksheet[cellAddress].s.font = { color: { rgb: fontColor }, bold: true, sz: 12 };
        worksheet[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
      }
    }
  }
  
  private applyColumnColors(worksheet: any, data: any[], headers: string[], columnColors: { [key: string]: { bgColor: string; fontColor: string } }, excludeFirstColumnData?: boolean): void {
    console.log('🎨 applyColumnColors - rows:', data.length, 'excludeFirstColumnData:', excludeFirstColumnData);
    
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      const excelRow = rowIdx + 2;
      
      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const columnName = headers[colIdx];
        
        if (excludeFirstColumnData && colIdx === 0) {
          const cellAddress = XLSX.utils.encode_cell({ r: excelRow - 1, c: colIdx });
          if (worksheet[cellAddress]) {
            if (!worksheet[cellAddress].s) {
              worksheet[cellAddress].s = {};
            }
            worksheet[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } };
            worksheet[cellAddress].s.font = { bold: true };
          }
          continue;
        }
        
        const colors = columnColors[columnName];
        
        if (colors) {
          const cellAddress = XLSX.utils.encode_cell({ r: excelRow - 1, c: colIdx });
          if (worksheet[cellAddress]) {
            if (!worksheet[cellAddress].s) {
              worksheet[cellAddress].s = {};
            }
            worksheet[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: colors.bgColor } };
            worksheet[cellAddress].s.font = { color: { rgb: colors.fontColor }, bold: columnName === 'Créés' };
          }
        }
      }
    }
  }
  
  private applyBorders(worksheet: any, rowCount: number, colCount: number): void {
    const borderStyle = {
      top: { style: 'thin', color: { rgb: 'D1D5DB' } },
      bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
      left: { style: 'thin', color: { rgb: 'D1D5DB' } },
      right: { style: 'thin', color: { rgb: 'D1D5DB' } }
    };
    
    for (let row = 0; row <= rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (worksheet[cellAddress]) {
          if (!worksheet[cellAddress].s) {
            worksheet[cellAddress].s = {};
          }
          worksheet[cellAddress].s.border = borderStyle;
        }
      }
    }
  }
  
  private applyRowColors(worksheet: any, data: any[], headers: string[], colorRules?: any[], boldFirstColumn?: boolean): void {
    if (!colorRules || colorRules.length === 0) return;
    
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      const excelRow = rowIdx + 2;
      
      let rowColors = { bgColor: 'FFFFFF', fontColor: '000000' };
      
      for (const rule of colorRules) {
        const colIndex = headers.indexOf(rule.column);
        if (colIndex !== -1 && rule.getRowColor) {
          const value = row[rule.column];
          rowColors = rule.getRowColor(value);
          break;
        }
      }
      
      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const cellAddress = XLSX.utils.encode_cell({ r: excelRow - 1, c: colIdx });
        if (worksheet[cellAddress]) {
          const isFirstColumn = boldFirstColumn && colIdx === 0;
          const isTauxColumn = colIdx === headers.indexOf('Taux de résolution');
          const isPerformanceColumn = colIdx === headers.indexOf('Performance');
          
          if (!worksheet[cellAddress].s) {
            worksheet[cellAddress].s = {};
          }
          worksheet[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: rowColors.bgColor } };
          worksheet[cellAddress].s.font = {
            color: { rgb: rowColors.fontColor },
            bold: isFirstColumn || isTauxColumn || isPerformanceColumn
          };
        }
      }
    }
  }
  
  private applyHeaderStyle(worksheet: any, colCount: number, customStyle?: { bgColor: string; fontColor: string }): void {
    const bgColor = customStyle?.bgColor || 'ECECFF';
    const fontColor = customStyle?.fontColor || '0C144E';
    
    for (let colIdx = 0; colIdx < colCount; colIdx++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      if (worksheet[cellAddress]) {
        if (!worksheet[cellAddress].s) {
          worksheet[cellAddress].s = {};
        }
        worksheet[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: bgColor } };
        worksheet[cellAddress].s.font = { color: { rgb: fontColor }, bold: true, sz: 12 };
        worksheet[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
      }
    }
  }
  
  exportMultiSheet(config: MultiSheetExportConfig): void {
    const workbook = XLSX.utils.book_new();
    
    config.sheets.forEach(sheet => {
      let dataToExport = sheet.data;
      
      if (sheet.columns && sheet.columns.length) {
        dataToExport = sheet.data.map(item => {
          const newItem: any = {};
          sheet.columns!.forEach(col => {
            newItem[col.header] = this.getValueByPath(item, col.field);
          });
          return newItem;
        });
      }
      
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const headers = Object.keys(dataToExport[0] || {});
      this.applyBorders(worksheet, dataToExport.length, headers.length);
      this.autoSizeColumns(worksheet, dataToExport);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.substring(0, 31));
    });
    
    XLSX.writeFile(workbook, `${config.filename}.xlsx`);
  }
  
  private autoSizeColumns(worksheet: any, data: any[]): void {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    const colWidths = headers.map(header => Math.min(header.length + 3, 50));
    
    data.forEach(row => {
      headers.forEach((header, idx) => {
        const value = String(row[header] ?? '');
        colWidths[idx] = Math.min(Math.max(colWidths[idx], value.length + 2), 50);
      });
    });
    
    worksheet['!cols'] = colWidths.map(w => ({ wch: w }));
  }
  
  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj) ?? '';
  }
}