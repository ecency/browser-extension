import { CurrencyPrices } from '@interfaces/bittrex.interface';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import Logger from 'src/utils/logger.utils';

// Derive prices from the on-chain median history price published by witnesses.
// HBD is pegged to ~$1 USD, so base/quote gives us the HIVE price in USD.
const getMedianPrices = async (): Promise<CurrencyPrices | null> => {
  try {
    const median = await HiveTxUtils.getData(
      'condenser_api.get_current_median_history_price',
      [],
    );
    const base = parseFloat(median.base);
    const quote = parseFloat(median.quote);
    if (!base || !quote) return null;
    const hiveUsd = base / quote;
    return {
      hive: { usd: hiveUsd },
      hive_dollar: { usd: 1 },
    };
  } catch (err) {
    Logger.error('Cannot fetch median price from chain', err);
    return null;
  }
};

const getPrices = async () => {
  let prices = await getMedianPrices();
  if (prices) {
    await LocalStorageUtils.saveValueInLocalStorage(
      LocalStorageKeyEnum.LAST_PRICE,
      prices,
    );
  } else {
    Logger.error('Cannot fetch median price. Using last known price...');
    prices = await LocalStorageUtils.getValueFromLocalStorage(
      LocalStorageKeyEnum.LAST_PRICE,
    );
  }
  return prices ?? {};
};

const CurrencyPricesUtils = {
  getPrices,
};

export default CurrencyPricesUtils;
