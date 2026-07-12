import { Array } from "effect"

const words = ["a", "b", "c"]
const upper = Array.map(words, (word) => word.toUpperCase())
