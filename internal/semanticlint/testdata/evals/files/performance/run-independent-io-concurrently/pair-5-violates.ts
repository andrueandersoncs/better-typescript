type Dock = {
  readonly terminalId: string
  readonly bay: string
}

type Terminal = {
  readonly code: string
  readonly departure: string
}

export const recordShipment = async (warehouseId: string) => {
  const dock = await fetch(`/warehouses/${warehouseId}/dock`).then((response) => response.json() as Promise<Dock>)
  const terminal = await fetch(`/warehouses/${warehouseId}/terminal`).then((response) => response.json() as Promise<Terminal>)

  return {
    bay: dock.bay,
    departure: terminal.departure
  }
}
