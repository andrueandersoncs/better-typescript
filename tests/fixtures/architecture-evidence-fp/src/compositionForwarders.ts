import { pipe } from "effect"
import { trim, upper } from "./steps.js"

export const normalize =
  (_mode: string) =>
  (value: string): string =>
    pipe(trim(value), upper)

export const formatLocally = (value: string): string => value.trim().toUpperCase()
