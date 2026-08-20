import { Context, Effect, Layer } from "effect"

interface ServiceShape {
  readonly load: (id: string) => Effect.Effect<string>
}

export const FunctionStyle = Context.Service<ServiceShape>("app/FunctionStyle") // ~detect

export const FunctionStyleWithAnonymous = Context.Service<ServiceShape>( // ~detect
  "app/FunctionStyleWithAnonymous"
)

export const FunctionStyleLayer = Layer.succeed(FunctionStyleWithAnonymous, {
  load: Effect.fn(function* (id: string) {
    return id
  })
})

export class ClassStyle extends Context.Service<ClassStyle, ServiceShape>()("app/ClassStyle") {}

export const ClassStyleLayer = Layer.succeed(ClassStyle, {
  load: Effect.fn("ClassStyle.load")(function* (id: string) {
    return id
  })
})
