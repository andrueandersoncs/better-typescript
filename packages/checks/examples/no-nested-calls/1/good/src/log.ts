declare const parseTimestamp: (raw: string) => Date
declare const formatDate: (date: Date) => string

export const formatTimestamp = (raw: string): string => {
  const timestamp = parseTimestamp(raw)

  return formatDate(timestamp)
}
