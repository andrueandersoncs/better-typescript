import { vi } from "vitest"
import * as store from "./store"
vi.spyOn(store, "save")
const required = require("./store")
vi.spyOn(required, "save")
