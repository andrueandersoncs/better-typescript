import * as path from "node:path"
import { testDirectory } from "./semanticModulesTestDirectory.js"

export const normalizationFixturePath = path.join(
  testDirectory,
  "fixtures",
  "semantic-modules-normalization"
)
