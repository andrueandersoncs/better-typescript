import { noNewError } from "./noNewError.js"
import { noThrow } from "./noThrow.js"
import { preferEffectSchemaGuard } from "./preferEffectSchemaGuard.js"
import type { Rule } from "./types.js"

export const rules: ReadonlyArray<Rule> = [preferEffectSchemaGuard, noThrow, noNewError]

export type { Rule, RuleContext, RuleMatch } from "./types.js"
