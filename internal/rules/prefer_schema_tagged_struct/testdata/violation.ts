import { Data } from "effect"
export class PortableEvent extends Data.TaggedClass("PortableEvent")<{ readonly id: string; readonly active: boolean }> {}
