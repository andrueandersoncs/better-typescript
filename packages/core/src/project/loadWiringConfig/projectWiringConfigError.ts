import { Schema } from "effect"
import { configFileName } from "./configFileName.js"

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
