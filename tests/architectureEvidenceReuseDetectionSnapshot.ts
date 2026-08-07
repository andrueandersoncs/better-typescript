import { type Detection } from "@better-typescript/core/engine/location/detectionData"

export const detectionSnapshot = (detection: Detection) => ({
  path: detection.location.path,
  line: detection.location.line,
  column: detection.location.column,
  message: detection.message,
  hint: detection.hint,
  data: detection.data
})
