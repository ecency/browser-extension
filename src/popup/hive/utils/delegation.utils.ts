import type { DelegateVestingSharesOperation } from '@hiveio/dhive';
import {
  Delegator,
  PendingOutgoingUndelegation,
} from '@interfaces/delegations.interface';
import { Key, TransactionOptions } from '@interfaces/keys.interface';
import { config as HiveTxConfig } from 'hive-tx';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import Logger from 'src/utils/logger.utils';

interface BalanceApiIncomingDelegation {
  delegator: string;
  amount: string | number;
  block_num?: number;
}

const VESTS_PER_RAW = 1_000_000;

// hive-mainnet's balance-api exposes incoming/outgoing delegations from
// an indexer node. Replaces the legacy api.hive-keychain.com
// hive/delegators/{username} endpoint.
const getDelegators = async (name: string): Promise<Delegator[] | null> => {
  try {
    const baseUrl = (HiveTxConfig.node || 'https://api.hive.blog').replace(
      /\/$/,
      '',
    );
    const res = await fetch(
      `${baseUrl}/balance-api/accounts/${encodeURIComponent(name)}/delegations`,
      { cache: 'no-cache' },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      incoming_delegations?: BalanceApiIncomingDelegation[];
    };
    const incoming = body.incoming_delegations ?? [];
    return incoming
      .map((d) => ({
        delegator: d.delegator,
        // amount is stringified raw vests (1 VESTS = 1e6 raw)
        vesting_shares: Number(d.amount) / VESTS_PER_RAW,
        delegation_date: '',
      }))
      .filter((d) => d.vesting_shares !== 0)
      .sort((a, b) => b.vesting_shares - a.vesting_shares);
  } catch (err) {
    Logger.error('Failed to fetch incoming delegators', err);
    return null;
  }
};

const getDelegatees = async (name: string) => {
  const LIMIT = 1000;
  let delegatees: any[] = [];
  let from = '';
  delegatees = await HiveTxUtils.getData(
    'condenser_api.get_vesting_delegations',
    [name, from, LIMIT],
  );

  return delegatees
    .filter((e) => parseFloat(e.vesting_shares + '') !== 0)
    .sort(
      (a, b) =>
        parseFloat(b.vesting_shares + '') - parseFloat(a.vesting_shares + ''),
    );
};

const getPendingOutgoingUndelegation = async (name: string) => {
  const pendingDelegations = await HiveTxUtils.getData(
    'database_api.find_vesting_delegation_expirations',
    { account: name },
    'delegations',
  );
  return pendingDelegations.map((pendingUndelegation: any) => {
    return {
      delegator: pendingUndelegation.delegator,
      expiration_date: pendingUndelegation.expiration,
      vesting_shares:
        parseInt(pendingUndelegation.vesting_shares.amount) / 1000000,
    } as PendingOutgoingUndelegation;
  });
};

/* istanbul ignore next */
const delegateVestingShares = async (
  delegator: string,
  delegatee: string,
  vestingShares: string,
  activeKey: Key,
  options?: TransactionOptions,
) => {
  return await HiveTxUtils.sendOperation(
    [getDelegationOperation(delegatee, delegator, vestingShares)],
    activeKey,
    false,
    options,
  );
};
/* istanbul ignore next */
const getDelegationOperation = (
  delegatee: string,
  delegator: string,
  amount: string,
) => {
  return [
    'delegate_vesting_shares',
    {
      delegatee,
      delegator,
      vesting_shares: amount,
    },
  ] as DelegateVestingSharesOperation;
};
/* istanbul ignore next */
const getDelegationTransaction = (
  delegatee: string,
  delegator: string,
  amount: string,
) => {
  return HiveTxUtils.createTransaction([
    DelegationUtils.getDelegationOperation(delegatee, delegator, amount),
  ]);
};

export const DelegationUtils = {
  getDelegationOperation,
  delegateVestingShares,
  getDelegators,
  getDelegatees,
  getPendingOutgoingUndelegation,
  getDelegationTransaction,
};
