import { adviceText } from "@better-typescript/core/engine/reportPipeline"
import { type Advice } from "@better-typescript/core/engine/derive/advice"

const emptyExamples: ReadonlyArray<never> = []

export const normalizeRenderedAdvice = (advice: ReadonlyArray<Advice>): string =>
  advice.map((item) => adviceText(emptyExamples)(item)).join("\n\n")
