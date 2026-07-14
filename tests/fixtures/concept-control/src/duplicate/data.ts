interface PrimaryAddress {
  readonly uniqueStreetName: string
}

interface SecondaryAddress {
  readonly uniqueStreetName: string
}

void ({} as PrimaryAddress)
void ({} as SecondaryAddress)
