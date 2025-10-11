/**
 * Capitalizes the first letter of a string
 * @param text - The text to capitalize
 * @returns The text with the first letter capitalized
 */
export const capitalizeFirstLetter = (text: string | null | undefined): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};