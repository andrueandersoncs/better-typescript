export interface Reader {
  readonly read: (path: string) => string
}

export const forward = (reader: Reader, path: string): string =>
  reader.read(path)

export const sharedForward = (reader: Reader, path: string): string =>
  reader.read(path)

const add = (left: number, right: number): number => left + right

export const double = (value: number): number => add(value, value)

export const adjusted = (value: number): number => add(value + 1, value)
