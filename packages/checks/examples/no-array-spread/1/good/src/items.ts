import { Array } from "effect"

declare const left: ReadonlyArray<string>
declare const right: ReadonlyArray<string>
declare const items: ReadonlyArray<string>
declare const extra: string
declare const first: string

export const combined = Array.appendAll(left, right)
export const withTail = Array.append(items, extra)
export const withHead = Array.prepend(items, first)
