import { Struct } from "effect"
interface Item { readonly name: string }
const itemName: (item: Item) => string = Struct.get("name")
const inferredName = Struct.get<Item, "name">("name")
void itemName
void inferredName
