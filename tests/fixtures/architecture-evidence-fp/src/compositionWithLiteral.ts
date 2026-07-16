import { pipe } from "effect"
import { append, trim } from "./steps.js"

export const labeled = (value: string): string => pipe(value, trim, append("!"))
