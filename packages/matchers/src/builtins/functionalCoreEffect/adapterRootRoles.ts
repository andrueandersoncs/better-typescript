import { HashSet } from "effect"
import type { ArchitectureRole } from "../../support/architectureRoleType.js"

const adapterOrRootRoles = HashSet.make("adapter" as ArchitectureRole, "root" as ArchitectureRole)

export const isAdapterOrRootRole = (role: ArchitectureRole) => HashSet.has(adapterOrRootRoles, role)
