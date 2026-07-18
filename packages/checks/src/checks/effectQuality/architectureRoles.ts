import type { ArchitectureRole } from "../support/architectureRole.js"

export const isTestRole = (role: ArchitectureRole) => role === "test"

export const isAdapterRole = (role: ArchitectureRole) => role === "adapter"

export const isRootRole = (role: ArchitectureRole) => role === "root"
