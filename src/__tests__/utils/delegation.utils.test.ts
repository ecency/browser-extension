import { DelegationUtils } from '@hiveapp/utils/delegation.utils';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import delegations from 'src/__tests__/utils-for-testing/data/delegations';
import mk from 'src/__tests__/utils-for-testing/data/mk';

describe('delegation.utils.ts tests:/n', () => {
  const originalFetch = global.fetch;
  // The production util maps the balance-api `amount` (raw vests as a string)
  // to `vesting_shares` by dividing by 1_000_000. To preserve the existing
  // delegators fixture exactly, we synthesize the API response from it.
  const toBalanceApiResponse = (delegators: typeof delegations.delegators) => ({
    incoming_delegations: delegators.map((d) => ({
      delegator: d.delegator,
      amount: String(Math.round((d.vesting_shares as number) * 1_000_000)),
    })),
  });
  const expectedFromFixture = delegations.delegators.map((d) => ({
    delegator: d.delegator,
    vesting_shares:
      Math.round((d.vesting_shares as number) * 1_000_000) / 1_000_000,
    delegation_date: '',
  }));

  afterEach(() => {
    jest.clearAllMocks();
    global.fetch = originalFetch;
  });
  describe('getDelegators cases:\n', () => {
    it('Must return delegator list', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => toBalanceApiResponse(delegations.delegators),
      } as any);
      expect(await DelegationUtils.getDelegators(mk.user.one)).toEqual(
        expectedFromFixture,
      );
    });

    it('Must return delegator list removing 0 shares records', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          incoming_delegations: [
            ...toBalanceApiResponse(delegations.delegators)
              .incoming_delegations,
            { delegator: 'quentin', amount: '0' },
          ],
        }),
      } as any);
      expect(await DelegationUtils.getDelegators(mk.user.one)).toEqual(
        expectedFromFixture,
      );
    });
  });

  describe('getDelegatees cases:\n', () => {
    const delegateeListFiltered = delegations.delegatees.filter(
      (delegatee) =>
        parseFloat(delegatee.vesting_shares.toString().split(' ')[0]) > 0,
    );
    it('Must return delegatees list filtering 0 vests records', async () => {
      HiveTxUtils.getData = jest.fn().mockResolvedValue(delegations.delegatees);
      expect(await DelegationUtils.getDelegatees(mk.user.one)).toEqual(
        delegateeListFiltered,
      );
    });
  });

  describe('getPendingOutgoingUndelegation cases:\n', () => {
    it('Must return adjusted list', async () => {
      HiveTxUtils.getData = jest
        .fn()
        .mockResolvedValue(delegations.pendingOutgoingUndelegationAsset);
      expect(
        await DelegationUtils.getPendingOutgoingUndelegation(mk.user.one),
      ).toEqual(delegations.pendingOutgoingUndelegationAssetExpected);
    });
  });
});
