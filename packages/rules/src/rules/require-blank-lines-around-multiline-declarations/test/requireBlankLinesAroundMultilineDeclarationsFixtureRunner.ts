import { ruleNamed } from "../../../../test/ruleNamed.js"
import { runRuleFixture } from "../../../../test/runRuleFixture.js"

export const runRequireBlankLinesAroundMultilineDeclarationsFixture = () =>
  runRuleFixture(ruleNamed("require-blank-lines-around-multiline-declarations"))
