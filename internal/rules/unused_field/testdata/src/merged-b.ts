interface Merged {
  readonly second: number
}

const readFirst = (value: Merged): string => value.first
