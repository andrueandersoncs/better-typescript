import { Context } from "effect"
const UserRepo = Context.Service<{ readonly get: () => string }>()
