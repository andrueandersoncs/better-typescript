import { pipe } from "effect"

export const add = (a: number, b: number): number => a + b

const sumAll = (values: ReadonlyArray<number>): number => values.reduce(add, 0)

const identity = (n: number): number => n

export const total = (xs: ReadonlyArray<number>): number =>
  pipe(xs, sumAll, identity)

export const push = (): unknown =>
  asyncPush((emit) => {
    emit(1)
    return () => undefined
  })

declare const asyncPush: (
  register: (emit: (value: number) => void) => () => void
) => unknown
