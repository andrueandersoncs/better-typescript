import { mock } from "bun:test"
mock.module("./store", () => ({}))
import * as nodeTest from "node:test"
nodeTest.mock.module("./store", {})
