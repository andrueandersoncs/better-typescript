import * as path from "node:path"

export const ruleFixturesPath = (ruleName: string): string =>
  path.join(import.meta.dir, "../src/rules", ruleName, "fixtures", "rule")
