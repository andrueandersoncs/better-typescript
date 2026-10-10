import { vi } from "vitest"
vi.setMock("./store", {})
let mutable = vi
mutable.mock("./store")
const store = { save: () => undefined }
vi.spyOn(store, "save")
