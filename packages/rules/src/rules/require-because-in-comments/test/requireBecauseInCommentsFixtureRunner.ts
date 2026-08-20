import { ruleNamed } from "../../../../../../tests/ruleNamed.js"
import { runRuleFixture } from "../../../../../../tests/runRuleFixture.js"

export const runRequireBecauseInCommentsFixture = () =>
  runRuleFixture(ruleNamed("require-because-in-comments"))
