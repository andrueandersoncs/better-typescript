import { Data, Schema } from "effect"

export const configFileName = "better-typescript.config.ts"

export type ConfigExportName = "default" | "config"

export class ConfigExport extends Data.Class<{
  readonly name: ConfigExportName
  readonly value: unknown
}> {}

export class ProjectWiringConfigError extends Schema.TaggedError<ProjectWiringConfigError>(
  "ProjectWiringConfigError"
)("ProjectWiringConfigError", {
  configPath: Schema.String,
  reason: Schema.String
}) {
  get message(): string {
    return `Invalid ${configFileName} at ${this.configPath}: ${this.reason}`
  }
}
