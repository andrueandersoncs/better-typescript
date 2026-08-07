import { Schema } from "effect"

// CircularProjectReferenceError names syntax protocol because discoverConfig agrees.
export class CircularProjectReferenceError extends Schema.TaggedErrorClass<CircularProjectReferenceError>()(
  "CircularProjectReferenceError",
  {
    configPath: Schema.String
  }
) {
  get message(): string {
    return `Circular project reference involving ${this.configPath}`
  }
}
