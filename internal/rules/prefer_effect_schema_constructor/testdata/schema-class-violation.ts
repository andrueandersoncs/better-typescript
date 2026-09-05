import { Schema } from "effect"

class Increment extends Schema.TaggedClass<Increment>()("Increment", {}) {}

const increment = new Increment()
void increment
