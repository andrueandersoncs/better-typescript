import { type Detection } from "@better-typescript/core/engine/location/detectionData"

export const detectionRecord = (element: Detection) => ({
  path: element.location.path,
  line: element.location.line,
  column: element.location.column,
  message: element.message,
  hint: element.hint
})
