import { Effect } from "effect"
export const fetchUser = () => Effect.retry(Effect.void)
