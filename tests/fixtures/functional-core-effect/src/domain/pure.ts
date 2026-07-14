import { Option } from "effect"

export const normalize = (input: string): Option.Option<string> =>
  input.length === 0 ? Option.none() : Option.some(input.trim())
