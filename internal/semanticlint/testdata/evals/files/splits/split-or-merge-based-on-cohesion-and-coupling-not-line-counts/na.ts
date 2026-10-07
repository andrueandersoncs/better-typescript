export type WarehouseCode = string

export type StorageLocation = Readonly<{
  aisle: string
  shelf: string
  bin: string
}>

export type InventoryPosition = Readonly<{
  warehouse: WarehouseCode
  location: StorageLocation
}>

export type InventoryTag = Readonly<{
  code: string
  label: string
}>

export type InventoryScope = "available" | "reserved"
