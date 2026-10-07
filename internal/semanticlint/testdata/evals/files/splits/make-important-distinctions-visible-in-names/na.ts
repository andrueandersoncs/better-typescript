export type Customer = {
  readonly id: string;
  readonly name: string;
};

export const createCustomer = (id: string, name: string): Customer => ({
  id,
  name,
});

export const customerLabel = (customer: Customer): string => {
  return customer.name;
};
