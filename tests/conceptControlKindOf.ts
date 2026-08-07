import { type Detection } from "@better-typescript/core/engine/location/detectionData"

export const kindOf = (element: Detection): string | undefined => {
  const data = element.data

  if (typeof data !== "object" || data === null || !("kind" in data)) {
    return undefined
  }

  const kind = data.kind

  return typeof kind === "string" ? kind : undefined
}
