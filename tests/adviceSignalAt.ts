import { Location } from "@better-typescript/core/engine/location/locationData"
import { Detection } from "@better-typescript/core/engine/location/detectionData"

export function signalAt(path: string, line: number, data?: unknown): Detection {
  return Detection.make({
    location: Location.make({ path, line, column: 1 }),
    message: "message",
    hint: "hint",
    ...(arguments.length >= 3 ? { data } : {})
  })
}
