import { buffer as hold } from "effect/Stream"
import { Channel, Stream, Stream as S } from "effect"

const source = Stream.make(1)
Stream.buffer(source, { capacity: "unbounded" })
Stream.bufferArray(source, { capacity: "unbounded" })
Channel.buffer({ capacity: Infinity })
Channel.bufferArray({ capacity: Number.POSITIVE_INFINITY })
S.buffer(source, { capacity: "unbounded" })

hold(source, { capacity: "unbounded" })