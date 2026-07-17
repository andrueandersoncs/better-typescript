import { Array } from "effect"

interface Detection {
  readonly kind: "failure" | "success"
}

const countFailures = (detections: ReadonlyArray<Detection>): number =>
  Array.filter(detections, (element) => element.kind === "failure").length

declare const detections: ReadonlyArray<Detection>

export const failureCount = countFailures(detections)
