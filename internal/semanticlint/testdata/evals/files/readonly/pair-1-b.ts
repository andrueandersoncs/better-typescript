export type AccountSnapshot = Readonly<{
  accountId: string;
  balanceCents: number;
  currency: string;
  updatedAt: Date;
}>;

export const formatBalance = (account: AccountSnapshot): string => {
  const amount = account.balanceCents / 100;

  return `${account.currency} ${amount.toFixed(2)}`;
};
