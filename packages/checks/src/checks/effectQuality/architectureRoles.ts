import type { ArchitectureRole } from "../support/architectureRole.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

export const isTestRole = (role: ArchitectureRole) => strictEqual(role, "test")

export const isAdapterRole = (role: ArchitectureRole) => strictEqual(role, "adapter")

export const isRootRole = (role: ArchitectureRole) => strictEqual(role, "root")
