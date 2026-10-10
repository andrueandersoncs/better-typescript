import * as v from "vitest"
v.vi.mock("./store")
require("vitest").vi.mock("./store")
const { jest } = require("@jest/globals")
jest.mock("./store")
