import { pipe } from "effect"
import { stageOne, stageTwo, stageThree } from "./stages.js"

export const runCloneB = (value: string): string =>
  pipe(value, stageOne, stageTwo, stageThree)
