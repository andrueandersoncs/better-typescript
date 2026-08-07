import { Schema } from "effect"

// InvalidTsconfigError names syntax protocol because discoverConfig must agree.
export class InvalidTsconfigError extends Schema.TaggedErrorClass<InvalidTsconfigError>()(
  "InvalidTsconfigError",
  {
    message: Schema.String
  }
) {}
