import { Array, Equivalence } from "effect"

interface User { name: string }
const isUser = (): User => ({ name: "bad" })
const isReady = (): boolean => true
const isSame = (left: string, right: string) => Equivalence.strictEqual<string>()(left, right)
const hasPositive = (values: ReadonlyArray<number>) => Array.some(values, (value) => value > 0)
interface Flag<A> { readonly value: A }
declare function optional<A>(value: A): Flag<A>
const makeNativeFlag = (value: string | number | boolean) => optional(value)
declare function parseValue(): string
