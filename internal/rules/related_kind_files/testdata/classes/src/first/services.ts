import { Context } from "effect"
import type { ServiceData } from "../types"
export class FirstService extends Context.Service<FirstService>() { readonly data!: ServiceData }
