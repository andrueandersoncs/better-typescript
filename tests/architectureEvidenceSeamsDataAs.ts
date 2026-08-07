import { Option } from "effect"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"

export const dataAs = <A>(
  guard: (input: unknown) => input is A,
  detection: Detection
): Option.Option<A> => {
  const data = detection.data

  return guard(data) ? Option.some(data) : Option.none()
}
