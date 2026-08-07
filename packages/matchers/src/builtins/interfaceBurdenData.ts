import { Effect, Schema, pipe } from "effect"

const defaultWorkspacePath = Effect.succeed("")
const withDefaultWorkspacePath = Schema.withConstructorDefault(defaultWorkspacePath)
const workspacePathSchema = pipe(Schema.String, withDefaultWorkspacePath)

// InterfaceBurdenData is one size observation because advice compares both.
export const InterfaceBurdenData = Schema.Struct({
  operationCount: Schema.Number,
  requiredParameterCount: Schema.Number,
  workspacePath: workspacePathSchema
})

export interface InterfaceBurdenData extends Schema.Schema.Type<typeof InterfaceBurdenData> {}
