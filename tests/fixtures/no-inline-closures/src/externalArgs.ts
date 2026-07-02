import { Array, Option, pipe } from "effect"

declare const xs: ReadonlyArray<number>
declare const opt: Option.Option<number>

// Arrow passed to an effect combinator (external package → sanctioned)
const mapped = Array.map(xs, (x) => x + 1)

// Arrows in a handler object passed to an effect combinator (forwarded through
// the object literal → sanctioned)
const matched = Option.match(opt, {
  onNone: () => 0,
  onSome: (n) => n * 2
})

// Arrow inside pipe stages (external package → sanctioned)
const piped = pipe(
  xs,
  Array.map((x) => x * 2)
)

// Arrow passed to a default-lib method (Array.prototype.map → unsanctioned)
const viaDefaultLib = xs.map((x) => x)

// Arrow passed to a first-party function (unsanctioned)
const runLocalFn = (f: (n: number) => number): number => f(1)
const viaFirstParty = runLocalFn((n) => n)

export { mapped, matched, piped, viaDefaultLib, viaFirstParty }
