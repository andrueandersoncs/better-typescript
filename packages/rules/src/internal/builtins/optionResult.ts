import { Function, Option, Result } from "effect"

export const optionResult = <A>(option: Option.Option<A>) =>
  Result.fromOption(option, Function.constVoid)
