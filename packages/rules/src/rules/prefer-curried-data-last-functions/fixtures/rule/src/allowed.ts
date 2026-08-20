type Reducer = (total: number, value: number) => number

export const appendSuffix =
  (suffix: string) =>
  (value: string): string =>
    `${value}${suffix}`

export const doubleValue = (value: number): number => value * 2

export const readDefault = (): number => 42

export const sumInlineReduce = (values: ReadonlyArray<number>): number =>
  values.reduce((total, value) => total + value, 0)

export const typedReducer: Reducer = (total, value) => total + value

const namedReducer = (total: number, value: number): number => total + value

export const sumWithNamedReducer = (values: ReadonlyArray<number>): number =>
  values.reduce(namedReducer, 0)
