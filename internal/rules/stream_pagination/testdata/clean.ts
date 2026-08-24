import { Stream } from "effect"
const pages = Stream.paginate("start", cursor => [cursor, undefined])
