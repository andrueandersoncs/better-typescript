import { readFile } from "node:fs/promises"
import path from "node:path"

interface ReleaseConfig {
  readonly version: string
  readonly channel: "stable" | "beta"
}

interface ReleaseNotes {
  readonly config: ReleaseConfig
  readonly changelog: string
  readonly license: string
}

async function readJson<T>(file: string): Promise<T> {
  const raw = await readFile(file, "utf8")
  return JSON.parse(raw) as T
}

export async function collectReleaseNotes(root: string): Promise<ReleaseNotes> {
  const [config, changelog, license] = await Promise.all([
    readJson<ReleaseConfig>(path.join(root, "release.json")),
    readFile(path.join(root, "CHANGELOG.md"), "utf8"),
    readFile(path.join(root, "LICENSE"), "utf8"),
  ])

  return { config, changelog, license }
}

export function formatHeader(notes: ReleaseNotes): string {
  const tag = notes.config.channel === "beta" ? `${notes.config.version}-beta` : notes.config.version
  return `# Release ${tag}\n\n${notes.changelog.trim()}`
}
