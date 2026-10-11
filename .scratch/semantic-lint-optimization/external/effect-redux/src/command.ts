import { Array, flow, pipe } from "effect"
import type { Operation } from "./operation.js"
import {
  collect,
  perform as performOperation,
  succeed,
  transform,
  type Program,
} from "./program.js"

const emptyActions: ReadonlyArray<never> = Object.freeze([])
const emptyProgram = succeed<never, ReadonlyArray<never>>(emptyActions)
const noneProgram = Object.freeze(emptyProgram)

export const none = <
  F extends Operation<unknown> = never,
  A = never,
>() => noneProgram as Program<F, ReadonlyArray<A>>

export const dispatch = <F extends Operation<unknown> = never, A = never>(
  action: A,
) => pipe(action, Array.of, succeed) as Program<F, ReadonlyArray<A>>

export const dispatchMany = <
  F extends Operation<unknown> = never,
  A = never,
>(
  actions: ReadonlyArray<A>,
) =>
  pipe(actions, Array.fromIterable, succeed) as Program<
    F,
    ReadonlyArray<A>
  >

export const fromProgram = <F extends Operation<unknown>, A, B>(
  program: Program<F, B>,
  toActions: (value: B) => ReadonlyArray<A>,
) => transform(program, toActions)

export const perform = <
  F extends Operation<unknown>,
  O extends F,
  A,
>(
  request: O,
  toAction: (value: O extends Operation<infer Success> ? Success : never) => A,
) => {
  const program = performOperation<F, O>(request)
  return transform(program, flow(toAction, Array.of))
}

export const batch = <F extends Operation<unknown>, A>(
  ...commands: ReadonlyArray<Program<F, ReadonlyArray<A>>>
) => {
  const collected = collect(commands)
  return transform(collected, Array.flatten)
}

const transformActions =
  <A, B>(f: (action: A) => B) =>
  (actions: ReadonlyArray<A>) =>
    Array.map(actions, f)

export const transformAction = <F extends Operation<unknown>, A, B>(
  command: Program<F, ReadonlyArray<A>>,
  f: (action: A) => B,
) => transform(command, transformActions(f))

export const when = <F extends Operation<unknown>, A>(
  condition: boolean,
  command: Program<F, ReadonlyArray<A>>,
) => (condition ? command : none<F, A>())
