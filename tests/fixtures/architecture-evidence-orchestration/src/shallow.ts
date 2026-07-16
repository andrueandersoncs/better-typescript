import { stageOne, stageTwo } from "./stages.js"

export const runShallow = (value: string): string => stageTwo(stageOne(value))
