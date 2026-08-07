import { type Detection } from "@better-typescript/core/engine/location/detectionData"

export const detectionLocationKey = (element: Detection): string =>
  [element.location.path, element.location.line, element.location.column].join(":")
