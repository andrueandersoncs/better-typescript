export {}

declare const Option: {
  isSome: <A>(option: { readonly _tag: "Some"; readonly value: A } | { readonly _tag: "None" }) => option is { readonly _tag: "Some"; readonly value: A }
  isNone: <A>(option: { readonly _tag: "Some"; readonly value: A } | { readonly _tag: "None" }) => option is { readonly _tag: "None" }
  fromNullable: <A>(value: A | null | undefined) => { readonly _tag: "Some"; readonly value: A } | { readonly _tag: "None" }
}

type OptionType<A> = { readonly _tag: "Some"; readonly value: A } | { readonly _tag: "None" }

declare const checker: {
  getTypeFromTypeNode: (node: string) => string
  getTypeAtLocation: (param: string) => string
}
declare const parameter: string

// isSome ternary accessing .value in whenTrue
const typeNode: OptionType<string> = Option.fromNullable("hello")
const resolved = Option.isSome(typeNode)
  ? checker.getTypeFromTypeNode(typeNode.value)
  : checker.getTypeAtLocation(parameter)

// isSome ternary with .value property access in whenTrue
const nameNode: OptionType<{ getText: () => string }> = Option.fromNullable({ getText: () => "x" })
const name = Option.isSome(nameNode)
  ? nameNode.value.getText()
  : "fallback"

// isNone ternary accessing .value in whenFalse
const cached: OptionType<number> = Option.fromNullable(42)
const result = Option.isNone(cached)
  ? 0
  : cached.value + 1
