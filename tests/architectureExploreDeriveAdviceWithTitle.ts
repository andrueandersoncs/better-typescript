import { type Advice } from "@better-typescript/core/engine/derive/advice"

export const adviceWithTitle = (
  advice: ReadonlyArray<Advice>,
  title: string
): ReadonlyArray<Advice> => advice.filter((item) => item.title === title)
