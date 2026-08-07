import * as path from "node:path"
import { fileURLToPath } from "node:url"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
export const fixturePath = (name: string): string => path.join(testDirectory, "fixtures", name)
