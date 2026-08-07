import { Detection } from "@better-typescript/core/engine/location/detectionData"
import { Location } from "@better-typescript/core/engine/location/locationData"

const range = (count: number): ReadonlyArray<number> =>
  Array.from({ length: count }, (_, index) => index + 1)

export const detectionAt = (path: string, line: number, data?: unknown): Detection =>
  Detection.make({
    location: Location.make({ path, line, column: 1 }),
    message: "message",
    hint: "hint",
    ...(data === undefined ? {} : { data })
  })

export const detectionsAt = (
  path: string,
  count: number,
  data?: unknown
): ReadonlyArray<Detection> => range(count).map((line) => detectionAt(path, line, data))
