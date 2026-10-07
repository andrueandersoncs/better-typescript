export type Account = {
  readonly hasOverdueBalance: boolean;
  readonly id: string;
};

export const canPlaceOrder = (account: Account): boolean => {
  return !account.hasOverdueBalance;
};

export const accountReference = (account: Account): string => {
  return account.id;
};

export const isAccountReferencePresent = (account: Account): boolean => {
  return accountReference(account).length > 0;
};
