import { type Advice } from "@better-typescript/core/engine/derive/advice"

export const adviceTitles = (advice: ReadonlyArray<Advice>): ReadonlyArray<string> =>
  advice.map((item) => item.title)
