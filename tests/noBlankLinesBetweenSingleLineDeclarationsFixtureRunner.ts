import { ruleNamed } from "./ruleNamed.js"
import { runRuleFixture } from "./runRuleFixture.js"

export const runNoBlankLinesBetweenSingleLineDeclarationsFixture = () =>
  runRuleFixture(ruleNamed("no-blank-lines-between-single-line-declarations"))
