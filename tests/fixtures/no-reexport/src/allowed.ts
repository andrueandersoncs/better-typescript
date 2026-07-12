import { sharedValue } from "./source.js"
import type { SharedType } from "./source.js"

export type LocalType = {
  readonly label: string
}

export const localValue = "local"

export const usesImport = (input: SharedType): string =>
  `${input.value}:${sharedValue}`

export const localDefault = localValue
