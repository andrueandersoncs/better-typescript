import { Context } from "effect"

export class Formatter extends Context.Service<
  Formatter,
  { readonly format: (value: string) => string }
>()("Formatter") {}
