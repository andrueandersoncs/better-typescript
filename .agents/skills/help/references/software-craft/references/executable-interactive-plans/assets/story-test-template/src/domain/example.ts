import { Context, Effect, Layer, Schema } from "effect"

export const ExampleInput = Schema.Struct({ name: Schema.NonEmptyString })
export type ExampleInput = Schema.Schema.Type<typeof ExampleInput>

export const ExampleGreeting = Schema.String
export type ExampleGreeting = Schema.Schema.Type<typeof ExampleGreeting>

export interface ExampleServiceShape {
  readonly greet: (input: ExampleInput) => Effect.Effect<ExampleGreeting>
}

export class ExampleService extends Context.Service<ExampleService, ExampleServiceShape>()("ExampleService") {}

export const makeExampleService = Layer.succeed(ExampleService, {
  greet: ({ name }) => Effect.succeed(`Hello, ${name}`),
})

export const runExample = (input: ExampleInput): Effect.Effect<ExampleGreeting, never, ExampleService> =>
  Effect.flatMap(ExampleService, (service) => service.greet(input))
