import { Effect } from "effect"
export const saveUser = () => Effect.retry(Effect.void)
