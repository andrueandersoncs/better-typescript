import { strictEqual } from "@better-typescript/matchers/equivalence"
import type { ArchitectureRole } from "../../support/architectureRoleType.js"
import { roleForSourceFileWhen } from "./roleForSourceFileWhen.js"

export const isPortArchitectureRole = strictEqual("port" as ArchitectureRole)

export const portRoleForSourceFile = roleForSourceFileWhen(isPortArchitectureRole)
