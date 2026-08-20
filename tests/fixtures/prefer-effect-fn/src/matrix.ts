import { Context, Effect } from "effect"

const localZero = () => // ~detect
  Effect.gen(function* () {
    return "local zero"
  })

const localOne = (value: string) => // ~detect
  Effect.gen(function* () {
    return value
  })

export const publicZero = () => // ~detect
  Effect.gen(function* () {
    return "public zero"
  })

export const publicOne = (value: string) => // ~detect
  Effect.gen(function* () {
    return value
  })

export const publicDirect = () => Effect.succeed("public direct")

void localZero
void localOne

class MatrixService extends Context.Service<MatrixService>()("MatrixService", {
  make: Effect.succeed({
    generated() { // ~detect
      return Effect.gen(function* () {
        return "generated"
      })
    },
    direct() {
      return Effect.succeed("direct")
    }
  })
}) {}

void MatrixService
