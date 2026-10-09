import { readFile } from "node:fs/promises"
import path from "node:path"
import { parse as parseToml } from "smol-toml"

export interface ProjectConfig {
  readonly name: string
  readonly outDir: string
  readonly plugins: ReadonlyArray<string>
}

const CONFIG_FILE = "project.toml"

const readConfigText = async (root: string): Promise<string> => {
  const file = path.join(root, CONFIG_FILE)
  try {
    return await readFile(file, "utf8")
  } catch (cause) {
    throw new Error(`Could not read ${file}`, { cause })
  }
}

const toProjectConfig = (raw: Record<string, unknown>): ProjectConfig => ({
  name: String(raw.name ?? "app"),
  outDir: String(raw.outDir ?? "dist"),
  plugins: Array.isArray(raw.plugins) ? raw.plugins.map(String) : [],
})

export const loadProjectConfig = async (root: string): Promise<ProjectConfig> => {
  const text = await readConfigText(root)
  let raw: Record<string, unknown>
  try {
    raw = parseToml(text)
  } catch (cause) {
    throw new Error(`Could not parse ${path.join(root, CONFIG_FILE)} as TOML`, { cause })
  }
  return toProjectConfig(raw)
}
