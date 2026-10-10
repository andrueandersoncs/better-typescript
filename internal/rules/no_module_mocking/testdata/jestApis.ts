import { jest } from "@jest/globals"
jest.unstable_mockModule("./store", () => ({}))
jest.doMock("./store")
