import { Function, HashMap, Option, pipe } from "effect"

export const countAt = (counts: HashMap.HashMap<string, number>) => (key: string) =>
  pipe(HashMap.get(counts, key), Option.getOrElse(Function.constant(0)))
