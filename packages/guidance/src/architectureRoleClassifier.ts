import type { Option } from "effect"
import type { ArchitectureRole } from "./architectureRoleType.js"

export type ArchitectureRoleClassifier = (
  projectRelativePath: string
) => Option.Option<ArchitectureRole>
