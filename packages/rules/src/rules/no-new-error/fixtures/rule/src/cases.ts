export {}

const withMessage = new Error("boom") // ~detect 21

const noArgs = new Error() // ~detect 16

function returnsErrorInline(): Error {
  return new Error("x") // ~detect 10
}
