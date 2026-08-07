import { probeHint } from "./reportProbeHint.js"
import { probeMessage } from "./reportProbeMessage.js"

export const expectedThrowProbeElements = [
  {
    path: "src/cases.ts",
    line: 4,
    column: 3,
    message: probeMessage,
    hint: probeHint
  },
  {
    path: "src/cases.ts",
    line: 9,
    column: 5,
    message: probeMessage,
    hint: probeHint
  },
  {
    path: "src/cases.ts",
    line: 19,
    column: 5,
    message: probeMessage,
    hint: probeHint
  },
  {
    path: "src/cases.ts",
    line: 26,
    column: 3,
    message: probeMessage,
    hint: probeHint
  }
]
