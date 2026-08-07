import { type Advice } from "@better-typescript/core/engine/derive/advice"
import { adviceWithTitle } from "./defaultDeriveAdviceWithTitle.js"

export const adviceCount = (advice: ReadonlyArray<Advice>, title: string): number =>
  adviceWithTitle(advice, title).length
