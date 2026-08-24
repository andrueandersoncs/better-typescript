import { Stream } from "effect"
declare const source: unknown
Stream.buffer(source, { capacity: 16 })
Stream.buffer(source, { ["metadata"]: true, capacity: 16 })
