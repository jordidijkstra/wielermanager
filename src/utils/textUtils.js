// Helper function to normalize text (remove diacritics and special characters)
export const normalizeText = (text) => {
    if (!text) return '';
    return String(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .toLowerCase();
};