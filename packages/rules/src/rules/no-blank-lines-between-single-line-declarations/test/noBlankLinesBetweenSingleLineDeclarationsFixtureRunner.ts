import { ruleNamed } from "../../../../../../tests/ruleNamed.js"
import { runRuleFixture } from "../../../../../../tests/runRuleFixture.js"

export const runNoBlankLinesBetweenSingleLineDeclarationsFixture = () =>
  runRuleFixture(ruleNamed("no-blank-lines-between-single-line-declarations"))
