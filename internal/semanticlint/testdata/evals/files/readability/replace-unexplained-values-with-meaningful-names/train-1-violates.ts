import type { Account } from "./account";
import { sendLockoutEmail } from "./notifications";

export interface LoginAttempt {
  readonly accountId: string;
  readonly succeeded: boolean;
  readonly at: Date;
}

const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function recordLoginAttempt(
  account: Account,
  attempt: LoginAttempt,
  recentFailures: ReadonlyArray<LoginAttempt>,
): Promise<Account> {
  if (attempt.succeeded) {
    return { ...account, lockedUntil: null };
  }

  const failures = [...recentFailures, attempt];
  if (failures.length >= 5) {
    const lockedUntil = new Date(attempt.at.getTime() + LOCKOUT_DURATION_MS);
    await sendLockoutEmail(account.email, lockedUntil);
    return { ...account, lockedUntil };
  }

  return account;
}
