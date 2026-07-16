import { readFileSync } from "node:fs"
import { Effect } from "effect"

export const testConfigText = readFileSync("config.json", "utf8")

export const testRunVoid = (): void => {
  Effect.runSync(Effect.void)
}
