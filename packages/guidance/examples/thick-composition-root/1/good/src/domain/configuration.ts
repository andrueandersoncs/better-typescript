export const chooseMode = (production: boolean): string => (production ? "live" : "test")

export const chooseRegion = (region: string): string => (region.length === 0 ? "local" : region)
