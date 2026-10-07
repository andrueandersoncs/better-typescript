export type Supplier = {
  readonly id: string;
  readonly name: string;
};

export const createSupplier = (id: string, name: string): Supplier => ({
  id,
  name,
});

export const supplierName = (supplier: Supplier): string => {
  return supplier.name;
};
