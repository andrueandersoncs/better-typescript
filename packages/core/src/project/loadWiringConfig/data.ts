import { Data, Schema } from "effect"

export const configFileName = "better-typescript.config.ts"

// ConfigExportName is accepted export-name protocol because authors must agree.
export type ConfigExportName = "default" | "config"

// ConfigExport pairs export name with raw value because discovery exchanges both.
export class ConfigExport extends Data.Class<{
  readonly name: ConfigExportName
  readonly value: unknown
}> {}

// ProjectWiringConfigError is failure protocol because loader/CLI need fields.
export class ProjectWiringConfigError extends Schema.TaggedErrorClass<ProjectWiringConfigError>()(
  "ProjectWiringConfigError",
  {
    configPath: Schema.String,
    reason: Schema.String
  }
) {
  get message(): string {
    return `Invalid ${configFileName} at ${this.configPath}: ${this.reason}`
  }
}
