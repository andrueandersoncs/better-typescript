export {}

const tryAgain = (): string => "ok"

const config = { retry: 3, catchAll: true }

const promiseCatch = (input: Promise<string>): Promise<string> =>
  input.catch((): string => "recovered")

const catchTag = <A>(effect: A): A => effect

const recover = <A>(effect: A): A => catchTag(effect)

const label = "try this without a real try"
