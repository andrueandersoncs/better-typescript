import { Schema } from "effect"

// ExampleLoadError is the shared load-failure contract because loaders need one vocabulary.
export class ExampleLoadError extends Schema.TaggedErrorClass<ExampleLoadError>()(
  "ExampleLoadError",
  {
    message: Schema.String
  }
) {}
