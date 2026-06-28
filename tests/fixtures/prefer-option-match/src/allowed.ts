export {}

declare const Option: {
  isSome: <A>(option: { readonly _tag: "Some"; readonly value: A } | { readonly _tag: "None" }) => option is { readonly _tag: "Some"; readonly value: A }
  isNone: <A>(option: { readonly _tag: "Some"; readonly value: A } | { readonly _tag: "None" }) => option is { readonly _tag: "None" }
  fromNullable: <A>(value: A | null | undefined) => { readonly _tag: "Some"; readonly value: A } | { readonly _tag: "None" }
}

type OptionType<A> = { readonly _tag: "Some"; readonly value: A } | { readonly _tag: "None" }

// Shape B: isSome returning the Option itself, not .value (orElse pattern)
const primary: OptionType<number> = Option.fromNullable(1)
const fallback: OptionType<number> = Option.fromNullable(2)
const chosen = Option.isSome(primary)
  ? primary
  : fallback

// Standalone boolean check — not a ternary
const items: OptionType<string> = Option.fromNullable("x")
const hasItems = Option.isSome(items)

// if-statement guard — not a ternary
const config: OptionType<string> = Option.fromNullable("y")
if (Option.isSome(config)) {
  console.log(config.value)
}

// isNone in an if-statement — not a ternary
const setting: OptionType<number> = Option.fromNullable(10)
if (Option.isNone(setting)) {
  console.log("missing")
}
