import {
  forward,
  sharedForward,
  type Reader
} from "./forwarding.js"

const reader: Reader = { read: (path) => path }

export const one = forward(reader, "one")
export const two = sharedForward(reader, "two")
export const three = sharedForward(reader, "three")
