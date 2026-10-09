import { readFile } from "node:fs/promises"
import path from "node:path"
import { z } from "zod"

const FeatureFlagsFile = z.object({
  flags: z.record(z.string(), z.boolean()),
  updatedAt: z.string(),
})

export type FeatureFlags = Readonly<Record<string, boolean>>

export interface LoadOptions {
  readonly rootDir: string
  readonly environment: "development" | "staging" | "production"
}

const flagsPath = ({ rootDir, environment }: LoadOptions): string =>
  path.join(rootDir, "config", `flags.${environment}.json`)

export async function loadFeatureFlags(options: LoadOptions): Promise<FeatureFlags> {
  const file = flagsPath(options)
  try {
    const raw = await readFile(file, "utf8")
    return FeatureFlagsFile.parse(JSON.parse(raw)).flags
  } catch {
    return {}
  }
}

export function isEnabled(flags: FeatureFlags, name: string): boolean {
  return flags[name] === true
}

export function enabledFlagNames(flags: FeatureFlags): ReadonlyArray<string> {
  return Object.entries(flags)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)
    .sort()
}
