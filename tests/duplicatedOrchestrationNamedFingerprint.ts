import { Detection as DetectionData } from "@better-typescript/core/engine/location/detectionData"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { NamedDetection } from "@better-typescript/core/engine/derive/namedDetection"
import { compositionFingerprints } from "@better-typescript/guidance/preset/compositionFingerprints"
import type { CompositionFingerprintData } from "@better-typescript/matchers/builtins/compositionFingerprints"

const detectionAt = (filePath: string, line: number, data: CompositionFingerprintData): Detection =>
  DetectionData.make({
    location: Location.make({ path: filePath, line, column: 1 }),
    message: "message",
    hint: "hint",
    data
  })

export const namedFingerprint = (
  filePath: string,
  line: number,
  data: CompositionFingerprintData
): NamedDetection =>
  NamedDetection.make({
    name: compositionFingerprints.name,
    detection: detectionAt(filePath, line, data)
  })
