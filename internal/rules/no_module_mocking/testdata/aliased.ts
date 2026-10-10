import { vi } from "vitest"
const t = vi
t.doMock("./store")
const g = jest
g.mock("./store")
