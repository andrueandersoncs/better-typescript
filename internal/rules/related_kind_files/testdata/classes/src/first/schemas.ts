import { Schema } from "effect"
import type { SchemaData } from "../types"
export class FirstModel extends Schema.Class<FirstModel>() { readonly data!: SchemaData }
