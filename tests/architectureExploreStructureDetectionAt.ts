import { Detection } from "@better-typescript/core/engine/location/detectionData"
import { Location } from "@better-typescript/core/engine/location/locationData"

export const detectionAt = (path: string, line: number, data?: unknown): Detection =>
  Detection.make({
    location: Location.make({ path, line, column: 1 }),
    message: "message",
    hint: "hint",
    ...(data === undefined ? {} : { data })
  })
