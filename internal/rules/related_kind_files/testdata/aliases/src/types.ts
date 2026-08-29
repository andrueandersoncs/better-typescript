export type UserId = string
export type Status = "on" | "off"
export interface UserError { readonly message: string }
export interface UserRepository { readonly load: (id: UserId) => Status }
export interface User { readonly id: UserId }
export interface Order { readonly id: UserId }
export interface OrderError { readonly message: string }
