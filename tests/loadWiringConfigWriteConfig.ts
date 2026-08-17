import * as fs from "node:fs/promises"
import * as path from "node:path"

const configFileName = "better-typescript.config.ts"

export const writeConfig = (projectDirectory: string, source: string): Promise<void> =>
  fs.writeFile(path.join(projectDirectory, configFileName), source)
