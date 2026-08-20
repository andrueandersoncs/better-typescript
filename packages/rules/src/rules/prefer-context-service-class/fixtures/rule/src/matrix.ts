import { Context, Effect } from "effect"

interface FunctionStyleShape {
  readonly load: (id: string) => Effect.Effect<string>
}

export const FunctionStyle = Context.Service<FunctionStyleShape>("app/FunctionStyle") // ~detect

export class ClassStyle extends Context.Service<ClassStyle>()("app/ClassStyle", {
  make: Effect.succeed({
    load: (id: string) => Effect.succeed(id)
  })
}) {}

void FunctionStyle
void ClassStyle
