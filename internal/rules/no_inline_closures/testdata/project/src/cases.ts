import { externalUse } from "fixture-callbacks"

const wrapped = { run: (value: number) => value }
const identity = (value: number) => value
void wrapped
void identity
void new Promise<void>((resolve) => { resolve() })
function useLocal(callback: (value: number) => number): number { return callback(1) }
void useLocal((value) => value)
void externalUse((value) => value)

declare global {
  function queueMicrotask(callback: () => void): void
}
void queueMicrotask(() => {})
