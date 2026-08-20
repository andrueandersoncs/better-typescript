import { Option } from "effect"

// Third-party effect type: rewriting the tag check is not safe, must not fire
declare const opt: Option.Option<number>

export const isSome = opt._tag === "Some"
