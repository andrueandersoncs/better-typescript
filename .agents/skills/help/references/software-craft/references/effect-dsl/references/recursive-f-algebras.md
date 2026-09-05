# Recursive F-algebras

Use this shape when syntax nodes contain child programs and multiple interpretations should share one traversal.

```text
F<A>                 one syntax layer whose child positions contain A
Expr                  recursive syntax
F<A> -> A             one algebra
foldExpr: Expr -> A   the catamorphism induced by that algebra
```

## Minimal Effect v4 shape

```ts
import { Effect, Match, Schema } from "effect"

export type ExprF<A> =
  | { readonly _tag: "Literal"; readonly value: number }
  | { readonly _tag: "Add"; readonly left: A; readonly right: A }

export type Expr =
  | { readonly _tag: "Literal"; readonly value: number }
  | { readonly _tag: "Add"; readonly left: Expr; readonly right: Expr }

export const ExprF = <A, E>(
  child: Schema.Codec<A, E>
): Schema.Codec<ExprF<A>, ExprF<E>> =>
  Schema.TaggedUnion({
    Literal: { value: Schema.Number },
    Add: { left: child, right: child }
  })

export const Expr: Schema.Codec<Expr> = Schema.suspend(
  (): Schema.Codec<Expr> => ExprF(Expr)
)

export const literal = (value: number): Expr => ({ _tag: "Literal", value })
export const add = (left: Expr, right: Expr): Expr => ({ _tag: "Add", left, right })

export const mapExprF = <A, B>(
  self: ExprF<A>,
  f: (value: A) => B
): ExprF<B> =>
  Match.value(self).pipe(
    Match.tagsExhaustive({
      Literal: (node) => node,
      Add: (node) => ({ ...node, left: f(node.left), right: f(node.right) })
    })
  )

export type ExprAlgebra<A> = (layer: ExprF<A>) => A

export const foldExpr = <A>(algebra: ExprAlgebra<A>) => {
  const go = (expr: Expr): A => algebra(mapExprF(expr, go))
  return go
}

export const evaluate = foldExpr<number>(
  Match.type<ExprF<number>>().pipe(
    Match.tagsExhaustive({
      Literal: ({ value }) => value,
      Add: ({ left, right }) => left + right
    })
  )
)

export const render = foldExpr<string>(
  Match.type<ExprF<string>>().pipe(
    Match.tagsExhaustive({
      Literal: ({ value }) => String(value),
      Add: ({ left, right }) => `(${left} + ${right})`
    })
  )
)

export const evaluateEffect = foldExpr<Effect.Effect<number>>(
  Match.type<ExprF<Effect.Effect<number>>>().pipe(
    Match.tagsExhaustive({
      Literal: ({ value }) => Effect.succeed(value),
      Add: ({ left, right }) => Effect.zipWith(left, right, (a, b) => a + b)
    })
  )
)

export const decodeAndEvaluate = (input: unknown) =>
  Schema.decodeUnknownEffect(Expr)(input).pipe(Effect.flatMap(evaluateEffect))
```

## Correctness boundary

`mapExprF` must transform every recursive position exactly once and preserve the non-recursive fields. Each algebra consumes `ExprF<A>`, whose children are already interpreted values. Only `foldExpr` recurses.

An interpreter that consumes `Expr` directly and recursively calls itself is a recursive interpreter. It becomes the F-algebra form when the recursive positions are parameterized, mapped by the fold, and the interpreter handles one `ExprF<A>` layer.
