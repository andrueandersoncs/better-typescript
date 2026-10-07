import { spawn } from "node:child_process"
import * as Effect from "effect/Effect"

export interface RenderedReport {
  readonly reportId: string
  readonly location: string
}

export const renderReport = (reportId: string) =>
  Effect.asyncInterrupt<RenderedReport, Error>((resume) => {
    const child = spawn("report-renderer", [reportId])

    child.once("exit", (code) => {
      if (code === 0) {
        resume(Effect.succeed({ reportId, location: `/reports/${reportId}.pdf` }))
      } else {
        resume(Effect.fail(new Error(`Renderer exited with ${code}`)))
      }
    })

    child.once("error", (cause) => resume(Effect.fail(cause)))

    return Effect.sync(() => child.kill())
  })

export const rendererCommand = "report-renderer"
