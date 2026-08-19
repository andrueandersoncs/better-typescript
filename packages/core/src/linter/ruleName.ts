import { Schema } from "effect"

const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

const kebabCaseFilter = Schema.isPattern(kebabCasePattern, {
  message: "Rule names must be kebab-case strings"
})

// RuleName is a public identifier because configuration must address rules without importing them.
export const RuleName = Schema.String.check(kebabCaseFilter)

export type RuleName = typeof RuleName.Type
