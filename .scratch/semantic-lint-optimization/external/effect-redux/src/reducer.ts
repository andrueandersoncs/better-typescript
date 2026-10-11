import { Data, Equivalence, Predicate, type Schema } from "effect"
import { none } from "./command.js"
import type { Operation } from "./operation.js"
import type { Program } from "./program.js"

export class Transition<S, F extends Operation<unknown>, A> extends Data.Class<{
  readonly kind: "Transition"
  readonly state: S
  readonly command: Program<F, ReadonlyArray<A>>
}> {}

export type Reducer<S, A, F extends Operation<unknown>> = (
  state: S,
  action: A,
) => Transition<S, F, A>

interface TaggedAction {
  readonly _tag: PropertyKey
}

type HandlerResult<S, F extends Operation<unknown>, A> =
  | S
  | Transition<S, F, A>

type Handlers<S, A extends TaggedAction> = {
  readonly [Tag in A["_tag"]]: (
    state: S,
    action: Extract<A, { readonly _tag: Tag }>,
  ) => HandlerResult<S, Operation<unknown>, A>
}

const isKinded = Predicate.hasProperty("kind")

const isTransition = <S, F extends Operation<unknown>, A>(
  result: HandlerResult<S, F, A>,
): result is Transition<S, F, A> =>
  isKinded(result) &&
  Equivalence.strictEqual<unknown>()(result.kind, "Transition")

export const make = <
  S,
  const Action extends Schema.Top & {
    readonly Type: TaggedAction
  },
  const H extends Handlers<S, Action["Type"]>,
>(definition: {
  readonly initialState: S
  readonly action: Action
  readonly reduce: H
}) => {
  const reduce: Reducer<
    S,
    Action["Type"],
    {
      readonly [K in keyof H]: H[K] extends (...args: never) => infer R
        ? R extends Transition<infer _S, infer F, infer _A>
          ? F
          : never
        : never
    }[keyof H]
  > = (state, current) => {

    const handler = definition.reduce[
      current._tag as Action["Type"]["_tag"]
    ] as (
      state: S,
      action: Action["Type"],
    ) => HandlerResult<

      S,
      {
        readonly [K in keyof H]: H[K] extends (...args: never) => infer R
          ? R extends Transition<infer _S, infer F, infer _A>
            ? F
            : never
          : never
      }[keyof H],
      Action["Type"]
    >

    const result = handler(state, current)

    type F = {
      readonly [K in keyof H]: H[K] extends (...args: never) => infer R
        ? R extends Transition<infer _S, infer Op, infer _A>
          ? Op
          : never
        : never
    }[keyof H]

    return isTransition<S, F, Action["Type"]>(result)
      ? result
      : transition<S, F, Action["Type"]>(result)
  }

  return Object.freeze({
    initialState: definition.initialState,
    reduce,
    action: definition.action,
  })
}

export const transition = <S, F extends Operation<unknown>, A>(
  state: S,
  command: Program<F, ReadonlyArray<A>> = none<F, A>(),
) => new Transition({ kind: "Transition", state, command })
