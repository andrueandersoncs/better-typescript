import { Data } from "effect"
import type { ConfigExportName } from "./configExportName.js"

// ConfigExport pairs export name with raw value because discovery exchanges both.
export class ConfigExport extends Data.Class<{
  readonly name: ConfigExportName
  readonly value: unknown
}> {}

export const makeConfigExport = (name: ConfigExportName) => (value: unknown) =>
  new ConfigExport({ name, value })
