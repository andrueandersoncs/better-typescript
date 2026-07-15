import { Array, Order } from "effect"

const items = ["b", "a"]
const sorted = Array.sort(items, Order.String)
