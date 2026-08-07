import * as path from "node:path"
import { testDirectory } from "./semanticModulesTestDirectory.js"

export const dependenciesFixturePath = path.join(
  testDirectory,
  "fixtures",
  "semantic-modules-dependencies"
)
