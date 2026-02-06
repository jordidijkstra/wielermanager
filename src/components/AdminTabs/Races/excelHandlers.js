import * as XLSX from 'xlsx';
import { normalizeText } from '../../../utils/textUtils';

/**
 * Parses an Excel file and returns a Promise with the workbook.
 * @param {File} file 
 * @returns {Promise<XLSX.WorkBook>}
 */
const readExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        resolve(workbook);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Matches a rider name to the riders list.
 * @param {string} fullName 
 * @param {Array} riders 
 * @returns {Object|null} matched rider or null
 */
const findMatchedRider = (fullName, riders) => {
  const normalizedSearch = normalizeText(fullName);
  const nameParts = fullName.split(/\s+/).filter(p => p.length > 0);

  return riders.find(rider => {
    const riderFullname = normalizeText(
      `${rider.firstnameWithoutSpecialChars || rider.firstname || ''} ${rider.lastnameWithoutSpecialChars || rider.lastname || ''}`
    );
    
    if (riderFullname.includes(normalizedSearch)) return true;
    if (normalizedSearch.includes(riderFullname)) return true;
    return nameParts.every(part => riderFullname.includes(normalizeText(part)));
  });
};

/**
 * Handles the Excel import for Race Results.
 * returns PROCESSED DATA (does not dispatch side effects itself)
 */
export const processResultsExcel = async (file, currentResultEntries, currentSearchFilters, riders) => {
  if (!file) return null;

  const workbook = await readExcelFile(file);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const updatedEntries = [...currentResultEntries];
  const newSearchFilters = { ...currentSearchFilters };
  let matchedCount = 0;
  
  rows.forEach((row) => {
    const positie = parseInt(row[0]) - 1; // Convert to 0-indexed
    const fullName = String(row[1] || '').trim();

    if (positie >= 0 && positie < updatedEntries.length && fullName) {
      const matchedRider = findMatchedRider(fullName, riders);

      if (matchedRider) {
        updatedEntries[positie].riderId = matchedRider.id;
        updatedEntries[positie].excelFullName = fullName;
        newSearchFilters[positie] = `${matchedRider.firstname} ${matchedRider.lastname}`;
        matchedCount++;
      } else {
        updatedEntries[positie].riderId = 911;
        updatedEntries[positie].excelFullName = fullName;
        newSearchFilters[positie] = `⚠️ ${fullName} - renner bestaat niet in wielermanager`;
      }
    }
  });

  return { updatedEntries, newSearchFilters, matchedCount, totalRows: rows.length };
};

/**
 * Handles the Excel import for Race Participants.
 * returns PROCESSED DATA
 */
export const processParticipantsExcel = async (file, riders) => {
  if (!file) return null;

  const workbook = await readExcelFile(file);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const updatedEntries = [];
  const newSearchFilters = {};
  let matchedCount = 0;
  
  rows.forEach((row, idx) => {
    const fullName = String(row[0] || '').trim();

    if (fullName) {
      const matchedRider = findMatchedRider(fullName, riders);

      if (matchedRider) {
        updatedEntries.push({ riderId: matchedRider.id });
        newSearchFilters[idx] = `${matchedRider.firstname} ${matchedRider.lastname}`;
        matchedCount++;
      } else {
        updatedEntries.push({ riderId: null });
        newSearchFilters[idx] = `⚠️ ${fullName} - niet gevonden`;
      }
    }
  });

  return { updatedEntries, newSearchFilters, matchedCount, totalRows: rows.length };
};
