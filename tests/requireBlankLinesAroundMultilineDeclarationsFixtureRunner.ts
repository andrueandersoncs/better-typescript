import { ruleNamed } from "./ruleNamed.js"
import { runRuleFixture } from "./runRuleFixture.js"

export const runRequireBlankLinesAroundMultilineDeclarationsFixture = () =>
  runRuleFixture(ruleNamed("require-blank-lines-around-multiline-declarations"))
