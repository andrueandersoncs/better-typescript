declare const parseTimestamp: (raw: string) => Date
declare const formatDate: (date: Date) => string

export const logTimestamp = (raw: string): void => {
  console.log(formatDate(parseTimestamp(raw)))
}
