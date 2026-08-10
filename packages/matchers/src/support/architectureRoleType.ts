// Shared role vocabulary because boundary and quality checks need the same literals.
export type ArchitectureRole = "domain" | "port" | "application" | "adapter" | "root" | "test"

export const allowedTargetRoles: Readonly<
  Record<ArchitectureRole, Readonly<Record<ArchitectureRole, boolean>>>
> = {
  domain: {
    domain: true,
    port: false,
    application: false,
    adapter: false,
    root: false,
    test: false
  },
  port: {
    domain: true,
    port: true,
    application: false,
    adapter: false,
    root: false,
    test: false
  },
  application: {
    domain: true,
    port: true,
    application: true,
    adapter: false,
    root: false,
    test: false
  },
  adapter: {
    domain: true,
    port: true,
    application: true,
    adapter: true,
    root: false,
    test: false
  },
  root: {
    domain: true,
    port: true,
    application: true,
    adapter: true,
    root: true,
    test: true
  },
  test: {
    domain: true,
    port: true,
    application: true,
    adapter: true,
    root: true,
    test: true
  }
}

export const canImportRole = (importer: ArchitectureRole, imported: ArchitectureRole) =>
  allowedTargetRoles[importer][imported]
