export interface User { readonly id: string }
export interface UserError { readonly message: string }
export interface UserRepository { readonly find: (id: string) => User }
export interface OtherRepository { readonly find: (id: string) => User }
export interface Order { readonly id: string }
export interface PlacementData { readonly id: string }
export interface Cron { readonly schedule: string }
