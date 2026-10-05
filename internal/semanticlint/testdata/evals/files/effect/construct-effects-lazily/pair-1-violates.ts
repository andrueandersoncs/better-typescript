import * as Effect from "effect/Effect"

type Profile = {
  readonly id: string
  readonly name: string
  readonly region: string
}

const requestProfile = (url: string): Promise<Profile> =>
  fetch(url).then((response) => response.json() as Promise<Profile>)

export const loadProfile = (url: string) => {
  const response = requestProfile(url)
  return Effect.tryPromise(() => response)
}
