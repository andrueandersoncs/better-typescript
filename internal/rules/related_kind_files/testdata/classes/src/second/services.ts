import { Context } from "effect"
import type { ServiceData } from "../types"
export class SecondService extends Context.Service<SecondService>() { readonly data!: ServiceData }
