import type { Detection } from "../location/detectionData.js"
import { NamedDetection } from "./namedDetection.js"

// The name pairs with its detection here because derive joins detections by policy name.
export const makeNamedDetection = (name: string) => (detectionValue: Detection) =>
  NamedDetection.make({ name, detection: detectionValue })
