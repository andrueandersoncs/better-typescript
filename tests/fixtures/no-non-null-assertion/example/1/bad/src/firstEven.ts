declare const numbers: ReadonlyArray<number>

const isEven = (value: number): boolean => value % 2 === 0

export const firstEven = numbers.find(isEven)!
