import proxyquire from "proxyquire"
proxyquire("./store", {})
const rewire = require("rewire")
const rewired = rewire("./store")
rewired.__set__("save", () => undefined)
rewired.__ResetDependency__("save")
