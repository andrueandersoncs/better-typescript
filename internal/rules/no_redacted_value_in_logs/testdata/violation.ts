import { logInfo as report } from "effect/Effect"
import { value as expose } from "effect/Redacted"
import { Console, Effect, Effect as E, Redacted, Redacted as R } from "effect"

const secret = Redacted.make("secret")
Effect.logInfo(Redacted.value(secret))
Console.log({ authorization: `Bearer ${Redacted.value(secret)}` })
console.error([Redacted.value(secret)])
console.warn(JSON.stringify(Redacted.value(secret)))
E.logError(R.value(secret))
report(expose(secret))
