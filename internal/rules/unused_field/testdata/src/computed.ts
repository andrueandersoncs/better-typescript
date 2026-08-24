declare const Field: unique symbol
interface Computed {
  readonly [Field]: string
}
