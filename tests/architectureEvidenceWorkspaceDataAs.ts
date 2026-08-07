import { Array, Function, Option, Result, pipe } from "effect"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"

export const dataAs = <A>(
  guard: (input: unknown) => input is A,
  detection: Detection
): Option.Option<A> => {
  const data = detection.data

  return guard(data) ? Option.some(data) : Option.none()
}

export const decodeData = <A>(
  guard: (input: unknown) => input is A,
  detections: ReadonlyArray<Detection>
): ReadonlyArray<A> =>
  Array.filterMap(detections, (detection) =>
    pipe(dataAs(guard, detection), Result.fromOption(Function.constVoid))
  )
