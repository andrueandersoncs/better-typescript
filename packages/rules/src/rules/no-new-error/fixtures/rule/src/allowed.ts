export {}

const a = new TypeError("x")

const b = new RangeError("x")

class AppError {}
const c = new AppError()

namespace ns {
  export class Error {}
}
const d = new ns.Error()

const e = Error("x")
