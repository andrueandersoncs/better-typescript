import { Array, Function, HashMap, Option, pipe } from "effect"
import type * as ts from "typescript"

const emptyIdentifiers = Array.empty()

const emptyIdentifierList: Function.LazyArg<ReadonlyArray<ts.Identifier>> =
  Function.constant(emptyIdentifiers)

export const declarationsForName =
  (index: HashMap.HashMap<string, ReadonlyArray<ts.Identifier>>) =>
  (name: string): ReadonlyArray<ts.Identifier> =>
    pipe(HashMap.get(index, name), Option.getOrElse(emptyIdentifierList))
