import { HashSet } from "effect"

import type { ArchitectureRole } from "../../support/architectureRoleType.js"

export const productionRoles = HashSet.make(
  "domain" as ArchitectureRole,
  "port" as ArchitectureRole,
  "application" as ArchitectureRole,
  "adapter" as ArchitectureRole,
  "root" as ArchitectureRole
)

export const isProductionRole = (role: ArchitectureRole) => HashSet.has(productionRoles, role)
