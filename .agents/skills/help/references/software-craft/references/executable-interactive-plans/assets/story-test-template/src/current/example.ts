import { Context, Effect, Schema } from "effect"

export const ExampleInput = Schema.Struct({ name: Schema.String })
export type ExampleInput = Schema.Schema.Type<typeof ExampleInput>

export type ExampleGreeting = string

export interface ExampleServiceShape {
  readonly greet: (input: ExampleInput) => Effect.Effect<ExampleGreeting>
}

export class ExampleService extends Context.Service<ExampleService, ExampleServiceShape>()("ExampleService") {}

export const runExample = (input: ExampleInput): Effect.Effect<ExampleGreeting, never, ExampleService> =>
  Effect.flatMap(ExampleService, (service) => service.greet(input))
