import { pipe } from "effect"

export const add = (amount: number) => (value: number): number => value + amount
export const multiply = (factor: number) => (value: number): number => value * factor
export const subtract = (amount: number) => (value: number): number => value - amount
export const divide = (divisor: number) => (value: number): number => value / divisor
export const clamp = (maximum: number) => (value: number): number => Math.min(value, maximum)
declare const input: number
export const result01 = pipe(input, multiply(2), add(1))
export const result02 = pipe(input, add(4), subtract(2))
export const result03 = pipe(input, multiply(6), divide(3))
export const result04 = pipe(input, add(10), clamp(20))
export const result05 = pipe(input, subtract(1), multiply(5))
