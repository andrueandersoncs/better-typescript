import { Effect } from "effect"

// A consumer that imposes a void return on the callback it receives, exactly like
// React's `useEffect`, whose EffectCallback is `() => void | (() => void)`.
type Destructor = () => void
type EffectCallback = () => void | Destructor
declare const useEffect: (
  effect: EffectCallback,
  deps: ReadonlyArray<unknown>
) => void

declare const forEachItem: (
  items: ReadonlyArray<number>,
  run: (item: number) => void
) => void

export const increment = (n: number): number => n + 1

export const fetchUser = (id: number) => Effect.succeed(id)

export function describe(value: number): string {
  return `value is ${value}`
}

export class Box {
  private contents = 0

  constructor(initial: number) {
    this.contents = initial
  }

  get current(): number {
    return this.contents
  }

  set current(next: number) {
    this.contents = next
  }

  read(): number {
    return this.contents
  }
}

// The inner callback's void return is imposed by `useEffect`'s EffectCallback contract,
// not chosen by the author — there is no Effect-returning alternative React would accept.
export const registerInitialRefresh = (
  refresh: Effect.Effect<void>
): number => {
  useEffect(() => {
    Effect.runFork(refresh)
  }, [refresh])

  return 1
}

// A callback that actually returns its destructor is not void at all, so it is allowed
// for the ordinary reason — this documents that the EffectCallback shape stays clean.
export const registerRefreshWithCleanup = (
  refresh: Effect.Effect<void>,
  cancel: Destructor
): number => {
  useEffect(() => {
    Effect.runFork(refresh)

    return cancel
  }, [refresh, cancel])

  return 2
}

// A plain void-returning callback argument (e.g. Array.prototype.forEach style).
export const countViaForEach = (items: ReadonlyArray<number>): number => {
  forEachItem(items, (item) => {
    void item
  })

  return items.length
}

// A handler slot in the shape lib.dom uses: the contextual return type is any and the
// slot is nullable. A void-returning implementation satisfies that consumer contract.
interface MessageSource {
  onmessage: ((data: string) => any) | null
}

declare const source: MessageSource

const handleMessage: NonNullable<MessageSource["onmessage"]> = (data) => {
  void data
}

source.onmessage = handleMessage
