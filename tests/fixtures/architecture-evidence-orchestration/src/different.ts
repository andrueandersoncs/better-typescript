import { pipe } from "effect"
import { otherOne, otherTwo, otherThree } from "./stages.js"

export const runDifferent = (value: string): string =>
  pipe(value, otherOne, otherTwo, otherThree)
