import { Context, Effect, Layer, Schema } from "effect"

export const ExampleInput = Schema.Struct({ name: Schema.NonEmptyString })
export type ExampleInput = Schema.Schema.Type<typeof ExampleInput>

export interface ExampleServiceShape {
  readonly greet: (input: ExampleInput) => Effect.Effect<string>
}

export class ExampleService extends Context.Service<ExampleService, ExampleServiceShape>()("ExampleService") {}

export const makeExampleService = Layer.succeed(ExampleService, {
  greet: ({ name }) => Effect.succeed(`Hello, ${name}`),
})

export const runExample = (input: ExampleInput): Effect.Effect<string, never, ExampleService> =>
  Effect.flatMap(ExampleService, (service) => service.greet(input))
