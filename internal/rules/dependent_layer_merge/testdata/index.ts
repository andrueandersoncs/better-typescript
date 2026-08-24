interface Layer<ROut, E, RIn> { readonly out: ROut; readonly input: (value: RIn) => void }
interface Database { readonly database: unique symbol }
interface Users { readonly users: unique symbol }
interface Clock { readonly clock: unique symbol }
declare const Layer: { merge<A, B>(a: A, b: B): unknown }
declare const database: Layer<Database, never, never>
declare const users: Layer<Users, never, Database>
declare const clock: Layer<Clock, never, never>
Layer.merge(database, users)
Layer.merge(database, clock)
declare const layerLike: { readonly Layer: true }
Layer.merge(layerLike, clock)
