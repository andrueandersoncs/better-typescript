import { Array } from "effect"

interface Detection {
  readonly kind: "failure" | "success"
}

declare const detections: ReadonlyArray<Detection>

export const failureCount = Array.countBy(detections, (element) => element.kind === "failure")
