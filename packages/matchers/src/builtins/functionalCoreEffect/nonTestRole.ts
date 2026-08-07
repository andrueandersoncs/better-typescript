import { Predicate } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import type { ArchitectureRole } from "../../support/architectureRoleType.js"
import { roleForSourceFileWhen } from "./roleForSourceFileWhen.js"

export const isTestArchitectureRole = strictEqual("test" as ArchitectureRole)

export const isNonTestArchitectureRole = Predicate.not(isTestArchitectureRole)

export const nonTestRoleForSourceFile = roleForSourceFileWhen(isNonTestArchitectureRole)
