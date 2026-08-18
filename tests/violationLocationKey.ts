import type { Violation } from "@better-typescript/core/linter"

export const violationLocationKey = (violation: Violation): string =>
  [violation.filePath, violation.line, violation.column].join(":")
