import { HashMap } from "effect"

const lookup = HashMap.make(["a", 1], ["b", 2])
const value = HashMap.get(lookup, "a")
