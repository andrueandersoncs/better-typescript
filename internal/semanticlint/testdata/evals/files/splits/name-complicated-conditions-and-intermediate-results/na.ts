export type Region = "north" | "south";

export type Warehouse = {
  readonly code: string;
  readonly region: Region;
};

export const createWarehouse = (
  code: string,
  region: Region,
): Warehouse => ({
  code,
  region,
});
