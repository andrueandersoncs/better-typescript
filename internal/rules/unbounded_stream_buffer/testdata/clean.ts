import { Stream } from "effect"
declare const source: unknown
Stream.buffer(source, { capacity: 16 })
