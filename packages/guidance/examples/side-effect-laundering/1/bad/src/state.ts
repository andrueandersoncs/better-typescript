declare const values: Array<number>
export const addValue = (value: number): number => values.push(value)
export const removeValue = (): number | undefined => values.pop()
