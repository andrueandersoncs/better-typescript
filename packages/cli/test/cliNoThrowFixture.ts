import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { repoRoot } from "./cliRepoRoot.js"

export const noThrowFixturePath = path.join(
  repoRoot,
  "packages/rules/src/rules/no-throw/fixtures/rule"
)

export const copyNoThrowFixture = async (prefix: string): Promise<string> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))

  await fs.cp(noThrowFixturePath, tempDir, { recursive: true })

  return tempDir
}
