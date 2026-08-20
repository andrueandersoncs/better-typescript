import { ruleNamed } from "../../../../../../tests/ruleNamed.js"
import { runRuleFixture } from "../../../../../../tests/runRuleFixture.js"

export const runRequireBlankLinesAroundMultilineDeclarationsFixture = () =>
  runRuleFixture(ruleNamed("require-blank-lines-around-multiline-declarations"))
