/**
 * Strips leading and trailing whitespace before persistence.
 *
 * @param input - Raw persisted string
 * @returns Trimmed string safe for storage
 */
export const sanitize = (input: string): string => input.trim()
