/** Use PersistenceCatalogError as a type when compilation fails because it identifies the invalid entity and reason. */
export type PersistenceCatalogError = readonly [entity: string, reason: string]

/** Construct PersistenceCatalogError when a declaration is invalid because the root preserves the shared runtime identity. */
export const PersistenceCatalogError = class PersistenceCatalogError extends Error {}

/** Use PersistenceCatalog when constraining generic catalog utilities because it describes the declarative input boundary. */
export type PersistenceCatalog = Readonly<Record<string, unknown>>

/** Implement EncodedRowStore when authoring an adapter because generated operations exchange only encoded rows. */
export abstract class EncodedRowStore {}

/** Use EntityService when calculating service requirements because every compiled entity owns a distinct service. */
export type EntityService<
  Name extends string,
  S = unknown,
  K = unknown,
> = Readonly<{ name: Name; success: S; key: K }>
