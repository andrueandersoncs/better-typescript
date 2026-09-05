import { Console, Effect, HttpClientRequest, Redacted } from "effect"

const secret = Redacted.make("secret")
Effect.logInfo(secret)
Console.log({ authorization: secret })
const revealed = Redacted.value(secret)
Effect.logInfo(revealed)
Effect.logInfo(Redacted.value(secret).length)
Effect.logInfo(Redacted.value(Redacted.make(41)) + 1)
const Authentication = { bearerToken: (value: string) => value }
Authentication.bearerToken(Redacted.value(secret))
HttpClientRequest.trace(Redacted.value(secret))
console.log(JSON.stringify(Redacted.value(secret), () => "<redacted>"))
class LocalRedacted {
  static value(value: string): string {
    return value
  }
}
console.log(LocalRedacted.value("secret"))
