/**
 * getData tests use a dedicated file so `@ecency/sdk/hive` `callRPC` can be
 * mocked without conflicting with hive-tx.utils.test.ts, which replaces
 * HiveTxUtils.getData in beforeEach.
 */
const mockCallRPC = jest.fn();

jest.mock('@ecency/sdk/hive', () => {
  const actual = jest.requireActual('@ecency/sdk/hive');
  return {
    ...actual,
    // @ecency/sdk callRPC returns the RPC `result` directly (unlike hive-tx's
    // `call`, which wrapped it in { result }).
    callRPC: (method: string, params: unknown, timeout?: number) =>
      mockCallRPC(method, params, timeout),
  };
});

import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';

describe('HiveTxUtils.getData', () => {
  beforeEach(() => {
    mockCallRPC.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns full RPC result when key is omitted', async () => {
    mockCallRPC.mockResolvedValue({ accounts: ['a'] });

    const out = await HiveTxUtils.getData('condenser_api.get_accounts', [
      'alice',
    ]);

    expect(mockCallRPC).toHaveBeenCalledWith(
      'condenser_api.get_accounts',
      ['alice'],
      3000,
    );
    expect(out).toEqual({ accounts: ['a'] });
  });

  it('returns result[key] when key is provided', async () => {
    mockCallRPC.mockResolvedValue({ rows: [{ id: 1 }] });

    const out = await HiveTxUtils.getData('condenser_api.foo', ['x'], 'rows');

    expect(out).toEqual([{ id: 1 }]);
  });
});
