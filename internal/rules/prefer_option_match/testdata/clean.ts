import { Option } from "effect"
declare const value: Option.Option<number>
export const result = Option.match(value, { onNone: () => 0, onSome: (n) => n })
