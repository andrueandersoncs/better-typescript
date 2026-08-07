import { generatedNamePrefix } from "./generatedNamePrefix.js"
import type { InferenceProbe } from "./inferenceProbe.js"

export const expectedName = (probe: InferenceProbe) =>
  `${generatedNamePrefix}Expected${probe.detectionNode.getStart()}`
