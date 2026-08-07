import type { ArchitectureRole } from "../../support/architectureRoleType.js"

export const capabilityForbiddenRoles: Readonly<Record<ArchitectureRole, boolean>> = {
  domain: true,
  port: true,
  application: true,
  adapter: false,
  root: false,
  test: false
}
