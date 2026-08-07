import { type Advice } from "@better-typescript/core/engine/derive/advice"

export const evidenceMeasures = (advice: Advice): ReadonlyArray<string> =>
  advice.evidence.map((item) => item.measure)
