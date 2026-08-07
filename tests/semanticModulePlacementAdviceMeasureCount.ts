import { type Advice } from "@better-typescript/core/engine/derive/advice"

export const measureCount = (advice: Advice, measure: string): number | undefined =>
  advice.evidence.find((item) => item.measure === measure)?.count
