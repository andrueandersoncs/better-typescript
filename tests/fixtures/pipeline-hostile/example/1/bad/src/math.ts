export const add = (value: number, amount: number): number => value + amount
export const multiply = (value: number, factor: number): number => value * factor
export const subtract = (value: number, amount: number): number => value - amount
export const divide = (value: number, divisor: number): number => value / divisor
export const clamp = (value: number, maximum: number): number => Math.min(value, maximum)
declare const input: number
export const result01 = add(multiply(input, 2), 1)
export const result02 = subtract(add(input, 4), 2)
export const result03 = divide(multiply(input, 6), 3)
export const result04 = clamp(add(input, 10), 20)
export const result05 = multiply(subtract(input, 1), 5)
