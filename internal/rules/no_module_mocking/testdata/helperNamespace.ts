import * as helper from "./helper"
helper.vi.mock("./store")
const plain = { __set__: () => undefined, __Rewire__: () => undefined }
plain.__set__()
plain.__Rewire__()
import * as store from "./store"
store["__Rewire__"]("save", () => undefined)
