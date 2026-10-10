import { vi, testJest } from "./helper"
vi.mock("./store")
testJest.setMock("./store", {})
