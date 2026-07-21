// Trim before persistence because padded strings break storage-key equality.
export const sanitize = (input: string): string => input.trim()
