import { test, type MockTracker } from "node:test"
test("x", (t) => {
  t.mock.module("./store")
})
const tracker = (t: { mock: MockTracker }) => t.mock.module("./store")
const local = { mock: { module: (path: string) => path } }
local.mock.module("./store")
