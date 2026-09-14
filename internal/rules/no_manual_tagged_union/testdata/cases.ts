type Event =
  | { readonly _tag: "Started" }
  | { readonly _tag: "Stopped" }

type ReadModelF<A> =
  | Readonly<({ readonly _tag: ("Scan") })>
  | Readonly<Readonly<{ readonly _tag: "Join"; readonly source: A }>>

type ReadModelSyntax =
  | Readonly<{ readonly _tag: "Scan" }>
  | Readonly<{ readonly _tag: "Join"; readonly source: ReadModelSyntax }>

type Single = Readonly<{ readonly _tag: "Only" }>
type Other = { readonly kind: "A" } | { readonly kind: "B" }
type Mixed = { readonly _tag: "A" } | string
type Broad = { readonly _tag: string } | { readonly _tag: number }
type Optional = { readonly _tag?: "A" } | { readonly _tag?: "B" }
type SameTag = { readonly _tag: "Same" } | { readonly _tag: "Same"; readonly value: number }
type Started = { readonly _tag: "Started" }
type Stopped = { readonly _tag: "Stopped" }
type Referenced = Started | Stopped

export {}
