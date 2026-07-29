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

class DirectTarget {
  constructor(readonly value: string) {}
}

class PackedTarget {
  constructor(
    readonly fields: {
      readonly sourceFile: string
      readonly line: number
      readonly column: number
    }
  ) {}
}

export const makeDirectTarget = (value: string): DirectTarget => new DirectTarget(value)

export const makePackedTarget = (
  sourceFile: string,
  line: number,
  column: number
): PackedTarget => new PackedTarget({ sourceFile, line, column })

export const makeAdjustedTarget = (value: string): DirectTarget =>
  new DirectTarget(`${value}!`)
