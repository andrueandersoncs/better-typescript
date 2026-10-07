export type Address = {
  readonly city: string;
  readonly country: string;
};

export const createAddress = (city: string, country: string): Address => ({
  city,
  country,
});

export const addressCountry = (address: Address): string => {
  return address.country;
};
