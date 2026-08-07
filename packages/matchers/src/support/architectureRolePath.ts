import { Data } from "effect"
import type { ArchitectureRole } from "./architectureRoleType.js"

// ArchitectureRolePath is shared path-to-role pair because classifiers exchange one binding.
export class ArchitectureRolePath extends Data.Class<{
  readonly path: string
  readonly role: ArchitectureRole
}> {}
