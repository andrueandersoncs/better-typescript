import * as path from "node:path"
import { fileURLToPath } from "node:url"

export const testDirectory = path.dirname(fileURLToPath(import.meta.url))
export const noUnusedFixturePath = path.join(testDirectory, "fixtures", "no-unused")
