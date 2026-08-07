import { isFunctionType } from "./isFunctionType.js"

export const isCallable = (value: unknown): value is () => unknown => isFunctionType(typeof value)
