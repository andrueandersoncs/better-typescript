import { Layer } from "effect"
import { TwoAdapterSeam } from "../twoAdapterSeam.js"

export const twoAdapterTest = Layer.succeed(TwoAdapterSeam, {
  read: () => "test"
})
