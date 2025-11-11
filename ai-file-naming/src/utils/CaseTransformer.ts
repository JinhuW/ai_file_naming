/**
 * Case transformation utilities for file naming
 */

/**
 * Case format types
 */
export type CaseFormat = 'snake_case' | 'kebab-case' | 'camelCase' | 'PascalCase' | 'preserve';

/**
 * Transform string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_/, '')
    .toLowerCase();
}

/**
 * Transform string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-/, '')
    .toLowerCase();
}

/**
 * Transform string to camelCase
 */
export function toCamelCase(str: string): string {
  const words = str
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/);

  if (words.length === 0) return '';

  const firstWord = words[0];
  if (!firstWord) return '';

  return (
    firstWord.toLowerCase() +
    words
      .slice(1)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('')
  );
}

/**
 * Transform string to PascalCase
 */
export function toPascalCase(str: string): string {
  const words = str
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/);

  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
}

/**
 * Transform string to specified case format
 */
export function transformCase(str: string, format: CaseFormat): string {
  switch (format) {
    case 'snake_case':
      return toSnakeCase(str);
    case 'kebab-case':
      return toKebabCase(str);
    case 'camelCase':
      return toCamelCase(str);
    case 'PascalCase':
      return toPascalCase(str);
    case 'preserve':
    default:
      return str;
  }
}

/**
 * Detect case format of a string
 */
export function detectCaseFormat(str: string): CaseFormat {
  // Check for snake_case
  if (/^[a-z0-9_]+$/.test(str) && str.includes('_')) {
    return 'snake_case';
  }

  // Check for kebab-case
  if (/^[a-z0-9-]+$/.test(str) && str.includes('-')) {
    return 'kebab-case';
  }

  // Check for PascalCase
  if (/^[A-Z][a-zA-Z0-9]*$/.test(str)) {
    return 'PascalCase';
  }

  // Check for camelCase
  if (/^[a-z][a-zA-Z0-9]*$/.test(str) && /[A-Z]/.test(str)) {
    return 'camelCase';
  }

  return 'preserve';
}

/**
 * Split string into words regardless of case format
 */
export function splitIntoWords(str: string): string[] {
  return (
    str
      // Insert space before uppercase letters
      .replace(/([A-Z])/g, ' $1')
      // Replace separators with spaces
      .replace(/[-_]+/g, ' ')
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .split(' ')
      .filter((word) => word.length > 0)
  );
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert between case formats
 */
export function convertCase(str: string, from: CaseFormat, to: CaseFormat): string {
  if (from === to || from === 'preserve' || to === 'preserve') {
    return str;
  }

  // First split into words based on source format
  const words = splitIntoWords(str);

  // Then join based on target format
  return transformCase(words.join(' '), to);
}
