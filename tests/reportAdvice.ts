import { type Advice } from "@better-typescript/core/engine/derive/advice"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { probeExamples } from "./reportProbeExamples.js"

export const advice = (
  level: Advice["level"],
  filePath: string,
  title: string,
  remediation = `fix ${title}`
): Advice => ({
  location: Location.make({ path: filePath, line: 1, column: 1 }),
  level,
  title,
  remediation,
  evidence: [{ measure: `${title} evidence`, count: 1 }],
  examples: probeExamples
})
