import { ruleNamed } from "../../../../test/ruleNamed.js"
import { runRuleFixture } from "../../../../test/runRuleFixture.js"

export const runNoBlankLinesBetweenSingleLineDeclarationsFixture = () =>
  runRuleFixture(ruleNamed("no-blank-lines-between-single-line-declarations"))
