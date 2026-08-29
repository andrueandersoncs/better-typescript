import { Context } from "effect"
export interface User { readonly id: string }
export interface UserView { readonly user: User }
declare class Wrapper<T> {}
export class Wrapped extends Wrapper<typeof Context.Service> {}
export interface Order { readonly id: string }
export class PrivateUserState { private user!: User }
export class ProtectedOrderState { protected order!: Order }
export class PrivateConstructorState { private constructor(user: User) { void user } }
export class ProtectedConstructorState { protected constructor(order: Order) { void order } }
