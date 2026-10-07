import * as Effect from "effect/Effect"

export interface BuildStatus {
  readonly buildId: string
  readonly state: "ready" | "failed"
}

export const waitForBuildStatus = (buildId: string) =>
  Effect.asyncInterrupt<BuildStatus, Error>((resume) => {
    const socket = new WebSocket(`/builds/${buildId}/events`)

    socket.addEventListener("message", (event) => {
      const state = JSON.parse(event.data) as BuildStatus["state"]
      resume(Effect.succeed({ buildId, state }))
    })

    socket.addEventListener("error", () => {
      resume(Effect.fail(new Error(`Build ${buildId} disconnected`)))
    })

    return Effect.sync(() => socket.close())
  })

export const buildEventPath = "/builds"
