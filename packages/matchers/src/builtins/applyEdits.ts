import { Array, Order, pipe, Tuple } from "effect"

const editStart = (edit: readonly [number, number, string]) => Tuple.get(edit, 0)

const editOrder = Order.mapInput(Order.flip(Order.Number), editStart)

export const applyEdits = (
  text: string,
  offset: number,
  edits: ReadonlyArray<readonly [number, number, string]>
) =>
  pipe(
    edits,
    Array.sort(editOrder),
    Array.reduce(text, (current, edit) => {
      const start = Tuple.get(edit, 0)
      const end = Tuple.get(edit, 1)
      const replacement = Tuple.get(edit, 2)

      return current.slice(0, start - offset) + replacement + current.slice(end - offset)
    })
  )
