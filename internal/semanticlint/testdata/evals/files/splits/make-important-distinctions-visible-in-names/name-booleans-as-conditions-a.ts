export type Account = {
  readonly id: string;
  readonly isActive: boolean;
};

export const canReceiveInvoice = (account: Account): boolean => {
  const active = account.isActive;
  const hasAccountId = account.id.length > 0;
  return active && hasAccountId;
};

export const createAccount = (id: string): Account => ({
  id,
  isActive: true,
});
