import * as path from "node:path"
import { configFileName } from "./loadWiringConfigConfigFileName.js"
import { testDirectory } from "./loadWiringConfigTestDirectory.js"

export const virtualConfigPath = path.join(testDirectory, configFileName)
