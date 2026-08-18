import type { Violation } from "@better-typescript/core/linter"

export const kindOf = (violation: Violation): string => violation.ruleName
