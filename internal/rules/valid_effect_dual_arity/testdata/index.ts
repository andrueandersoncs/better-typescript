import { dual as effectDual } from "effect/Function"
import * as Function from "effect/Function"

const zero = effectDual(0, () => 0)
const one = Function.dual(1, (self: number) => self)
const two = Function.dual(2, (self: number, n: number) => self + n)
const predicate = Function.dual((args: IArguments) => args.length === 2, (self: number, n: number) => self + n)
const dual = (arity: number, body: (...args: ReadonlyArray<number>) => number) => body(arity)
const shadowed = dual(1, (value) => value)

void [zero, one, two, predicate, shadowed]
