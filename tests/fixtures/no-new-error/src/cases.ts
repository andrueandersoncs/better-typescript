export {}

const withMessage = new Error("boom")

const noArgs = new Error()

function returnsErrorInline(): Error {
  return new Error("x")
}
