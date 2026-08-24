import { Option } from "effect"
declare const value: Option.Option<number>
export const result = Option.isSome(value) ? value.value : 0
