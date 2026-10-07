export type Account = {
  readonly id: string;
  readonly isActive: boolean;
};

export const canReceiveInvoice = (account: Account): boolean => {
  const isActive = account.isActive;
  const hasAccountId = account.id.length > 0;
  return isActive && hasAccountId;
};

export const createAccount = (id: string): Account => ({
  id,
  isActive: true,
});
