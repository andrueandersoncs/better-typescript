import { Array, Order, Option, pipe, Struct } from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import { ArchitectureRolePath } from "./architectureRolePath.js"
import type { ArchitectureRoleClassifier } from "./architectureRoleClassifier.js"
import { normalizeArchitectureRolePath } from "./normalizeArchitectureRolePath.js"

const architectureRolePathLength = (entry: ArchitectureRolePath) =>
  normalizeArchitectureRolePath(entry.path).length

const pathLengthOrder = Order.mapInput(Order.flip(Order.Number), architectureRolePathLength)

const makeNormalizedRolePath = (entry: ArchitectureRolePath) => {
  const path = normalizeArchitectureRolePath(entry.path)

  return new ArchitectureRolePath({
    path,
    role: entry.role
  })
}

const pathContains = (prefix: string, candidate: string) => {
  const exact = strictEqual(prefix)(candidate)
  const nested = candidate.startsWith(`${prefix}/`)

  return exact || nested
}

export const roleByPrefixes = (
  rolePaths: ReadonlyArray<ArchitectureRolePath>
): ArchitectureRoleClassifier => {
  const ordered = pipe(rolePaths, Array.map(makeNormalizedRolePath), Array.sort(pathLengthOrder))

  const roleForPath = (projectRelativePath: string) => {
    const normalized = normalizeArchitectureRolePath(projectRelativePath)

    const containsNormalizedPath = (entry: ArchitectureRolePath) =>
      pathContains(entry.path, normalized)

    return pipe(ordered, Array.findFirst(containsNormalizedPath), Option.map(Struct.get("role")))
  }

  return roleForPath
}
