import { Schema } from "effect"

class Increment extends Schema.TaggedClass<Increment>()("Increment", {}) {}
class Plain {}

const increment = Increment.make()
const plain = new Plain()
void [increment, plain]
