import * as fs from "node:fs/promises"
import * as path from "node:path"
import { copyNoThrowFixture } from "./cliNoThrowFixture.js"

export const createSignalFreeFixture = async (): Promise<string> => {
  const tempDir = await copyNoThrowFixture("cli-empty-")
  const sourceDir = path.join(tempDir, "src")

  await fs.rm(sourceDir, { recursive: true, force: true })
  await fs.mkdir(sourceDir, { recursive: true })
  await fs.writeFile(path.join(sourceDir, "index.ts"), "export const value = 1\n")

  return tempDir
}
