import { Effect } from "effect";
export const bad = Effect.ignore(Effect.fail("bad"));
export const clean = () => { console.error("failure"); return Effect.ignore(Effect.fail("bad")) };
