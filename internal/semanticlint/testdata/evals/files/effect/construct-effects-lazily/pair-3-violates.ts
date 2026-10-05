import * as Fx from "effect/Effect"

type Window = {
  readonly delay: number
  readonly label: string
}

const waitForWindow = (delay: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, delay))

export const openWindow = (window: Window) => {
  const pending = waitForWindow(window.delay)
  return Fx.promise(() => pending).pipe(
    Fx.as(window.label)
  )
}
