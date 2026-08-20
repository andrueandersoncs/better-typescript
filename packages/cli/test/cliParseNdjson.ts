import { Array, Schema } from "effect"
import { Violation } from "@better-typescript/core/linter"

const ViolationFromJsonString = Schema.fromJsonString(Violation)

export const parseNdjson = (stdout: string): ReadonlyArray<Violation> => {
  const lines = Array.filter(stdout.split(/\r?\n/), (line) => line.length > 0)

  const decodeViolation = Schema.decodeUnknownSync(ViolationFromJsonString)

  return Array.map(lines, (line) => decodeViolation(line))
}
