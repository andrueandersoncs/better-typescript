export type AccountSnapshot = {
  readonly accountId: string;
  readonly balanceCents: number;
  readonly currency: string;
  readonly updatedAt: Date;
};

export const formatBalance = (account: AccountSnapshot): string => {
  const amount = account.balanceCents / 100;

  return `${account.currency} ${amount.toFixed(2)}`;
};
