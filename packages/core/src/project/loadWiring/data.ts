import { Data, Schema } from "effect"

export const configFileName = "better-typescript.config.ts"

export type ConfigExportName = "default" | "wiring"

export class ConfigExport extends Data.Class<{
  readonly name: ConfigExportName
  readonly value: unknown
}> {}

export class ProjectWiringError extends Schema.TaggedError<ProjectWiringError>(
  "ProjectWiringError"
)("ProjectWiringError", {
  configPath: Schema.String,
  reason: Schema.String
}) {
  get message(): string {
    return `Invalid ${configFileName} at ${this.configPath}: ${this.reason}`
  }
}
