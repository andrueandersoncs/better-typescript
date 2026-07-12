import { Schema } from "effect"

export const configFileName = "better-typescript.config.ts"

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
