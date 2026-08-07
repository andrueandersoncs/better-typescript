import { NamedDetection } from "@better-typescript/core/engine/derive/namedDetection"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"

export const namedElements = (
  name: string,
  elements: ReadonlyArray<Detection>
): ReadonlyArray<NamedDetection> =>
  elements.map((detection) => NamedDetection.make({ name, detection }))
