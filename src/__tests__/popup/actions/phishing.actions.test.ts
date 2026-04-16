import { getFakeStore } from 'src/__tests__/utils-for-testing/fake-store';
import { initialEmptyStateStore } from 'src/__tests__/utils-for-testing/initial-states';
import * as phishinActions from 'src/popup/hive/actions/phishing.actions';

describe('phishing.actions tests:\n', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.restoreAllMocks();
    jest.resetAllMocks();
    global.fetch = originalFetch;
  });
  test('Must set phising accounts', async () => {
    const phisingAccounts = ['account1', 'account2', 'account3'];
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => phisingAccounts.join('\n'),
    } as any);
    const fakeStore = getFakeStore(initialEmptyStateStore);
    await fakeStore.dispatch<any>(phishinActions.fetchPhishingAccounts());
    expect(fakeStore.getState().hive.phishing).toEqual(phisingAccounts);
  });
  test('If error, will fall back to an empty array', async () => {
    const error = new Error('Error Message');
    global.fetch = jest.fn().mockRejectedValueOnce(error);
    const fakeStore = getFakeStore(initialEmptyStateStore);
    await fakeStore.dispatch<any>(phishinActions.fetchPhishingAccounts());
    expect(fakeStore.getState().hive.phishing).toEqual([]);
  });
});
