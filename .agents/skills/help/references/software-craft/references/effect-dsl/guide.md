# Effect DSL guidance

Apply this guidance as context when the selected software workflow designs or implements a data-first DSL, command language, recursive AST, interpreter, catamorphism, or F-algebra with Effect v4.

First follow the shared [Effect context](../effect.md). Confirm that the installed `effect` version starts with `4.`; release candidates count as v4.

## Choose the representation

Represent domain intent as Schema-backed tagged data and keep operational behavior in interpreters.

- Use a tagged command union when a program is one request or a static sequence of requests. Read [command DSLs](references/command-dsls.md).
- Use recursive syntax when nodes contain subprograms. Read [recursive F-algebras](references/recursive-f-algebras.md).
- Consider a continuation-bearing free representation when later commands depend on earlier command results. Keep it in memory unless the continuation also has a data representation.

Default to one closed tagged union. Add an explicit fixed-point wrapper, Effect HKT encoding, or modular coproducts only when the requested extensibility or reuse requires them.

## Build the language

1. Define the smallest core vocabulary with `Schema.TaggedUnion` or `Schema.TaggedStruct`. Use `Schema.suspend` for recursive references.
2. Derive TypeScript types from Schema where inference is stable. Give recursive schemas explicit `Schema.Codec` types.
3. Add smart constructors that only build data. Express conveniences by translating them into the core vocabulary.
4. Decode external `unknown` with Schema before interpreting it.
5. Implement each interpretation with `Match.type` and `Match.tagsExhaustive`. Keep effects, services, retries, logging, and authorization in or around the effectful interpreter.
6. For an F-algebra, parameterize one syntax layer by child results, define its map, and put recursion in one fold for that syntax. Each algebra handles exactly one already-recursed layer.

## Evidence

Type-check against the installed Effect v4. Test Schema decoding, smart constructors, every interpreter, and at least one complete program. Let exhaustive Match compilation expose missing syntax cases. When the language has a fold, verify a second interpretation reuses it without implementing recursion again.
