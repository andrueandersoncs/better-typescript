import { Effect, pipe } from "effect"
export const fetchUser = () => Effect.succeed("user")
function loadUser(id: string) { return Effect.succeed(id) }
const parseUser = (id: string) => pipe(Effect.succeed(id), Effect.map((value) => value.length))
const readUser = function (id: string) { if (id) { return Effect.succeed(id) } return Effect.fail("missing") }
