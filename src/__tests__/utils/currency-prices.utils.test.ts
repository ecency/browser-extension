import CurrencyPricesUtils from '@hiveapp/utils/currency-prices.utils';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';

jest.mock('src/popup/hive/utils/hive-tx.utils', () => ({
  HiveTxUtils: {
    getData: jest.fn(),
  },
}));

describe('currency-prices-utils tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  afterAll(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getPrices tests:\n', () => {
    test('Must derive prices from on-chain median history price', async () => {
      (HiveTxUtils.getData as jest.Mock).mockResolvedValueOnce({
        base: '0.352 HBD',
        quote: '1.000 HIVE',
      });
      const result = await CurrencyPricesUtils.getPrices();
      expect(result).toEqual({
        hive: { usd: 0.352 },
        hive_dollar: { usd: 1 },
      });
    });

    test('If median price fails, falls back to last known price from storage', async () => {
      const lastKnown = {
        hive: { usd: 0.5 },
        hive_dollar: { usd: 1 },
      };
      (HiveTxUtils.getData as jest.Mock).mockRejectedValueOnce(
        new Error('RPC Failed'),
      );
      jest
        .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
        .mockResolvedValueOnce(lastKnown);
      const result = await CurrencyPricesUtils.getPrices();
      expect(result).toEqual(lastKnown);
    });

    test('Returns empty object if both median and cache fail', async () => {
      (HiveTxUtils.getData as jest.Mock).mockRejectedValueOnce(
        new Error('RPC Failed'),
      );
      jest
        .spyOn(LocalStorageUtils, 'getValueFromLocalStorage')
        .mockResolvedValueOnce(null);
      const result = await CurrencyPricesUtils.getPrices();
      expect(result).toEqual({});
    });
  });
});
