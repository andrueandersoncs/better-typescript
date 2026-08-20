import { Effect, Effect as E } from "effect"
import { gen as effectGen } from "effect/Effect"

export const fetchUser = (id: number) => Effect.succeed(id)
export const getCount = (id: number): Effect.Effect<number> => Effect.succeed(id)

export const compute = (n: number) => // ~detect
  Effect.gen(function* () {
    return n * 2
  })

const ready = () => // ~detect
  Effect.gen(function* () {
    return 1
  })

export function declared(id: string) { // ~detect
  return Effect.gen(function* () {
    return id
  })
}

export const expression = function named(id: string) { // ~detect
  return Effect.gen(function* () {
    return id
  })
}

export const prepared = () => { // ~detect
  const input = "ready"

  return Effect.gen(function* () {
    return input
  })
}

export const selected = (enabled: boolean) => { // ~detect
  if (enabled) {
    return Effect.gen(function* () {
      return "enabled"
    })
  }

  return Effect.gen(function* () {
    return "disabled"
  })
}

const temporary = () => { // ~detect
  const operation = Effect.gen(function* () {
    return "temporary"
  })

  return operation
}

const gen = Effect.gen
const EffectAlias = Effect
const { gen: destructuredGen } = Effect

export const localAlias = () => // ~detect
  gen(function* () {
    return "alias"
  })

export const namespaceValueAlias = () => // ~detect
  EffectAlias.gen(function* () {
    return "namespace value alias"
  })

export const destructuredAlias = () => // ~detect
  destructuredGen(function* () {
    return "destructured alias"
  })

export const importAlias = () => // ~detect
  E.gen(function* () {
    return "import alias"
  })

export const namedImportAlias = () => // ~detect
  effectGen(function* () {
    return "named import alias"
  })

export const elementAccess = () => // ~detect
  Effect["gen"](function* () {
    return "element access"
  })

export const asserted = () => // ~detect
  (Effect.gen(function* () {
    return "asserted"
  }) as Effect.Effect<string>)

export const handlers = {
  load(id: string) { // ~detect
    return Effect.gen(function* () {
      return id
    })
  },
  save: (id: string) => // ~detect
    Effect.gen(function* () {
      return id
    })
}

export class Handler {
  load(id: string) { // ~detect
    return Effect.gen(function* () {
      return id
    })
  }
}

export const outer = () => {
  const inner = () => // ~detect
    Effect.gen(function* () {
      return "inner"
    })

  return Effect.succeed(inner)
}

export const callbacks = ["callback"].map((value) => // ~detect
  Effect.gen(function* () {
    return value
  })
)

const service = { prefix: "service" }

export const loadName = (id: string) => // ~detect
  Effect.gen({ self: service }, function* (this: typeof service) {
    return `${this.prefix}:${id}`
  })

void ready
void temporary
