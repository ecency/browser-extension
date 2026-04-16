import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import Logger from 'src/utils/logger.utils';

// CoinGecko returns the same shape the legacy api.hive-keychain.com proxy
// used to return — { bitcoin, hive, hive_dollar } each with `usd` and
// optional `usd_24h_change`.
const COINGECKO_PRICE_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,hive,hive_dollar&vs_currencies=usd&include_24hr_change=true';

const getPrices = async () => {
  let prices;
  try {
    const res = await fetch(COINGECKO_PRICE_URL, { cache: 'no-cache' });
    prices = res.ok ? await res.json() : null;
    if (prices) {
      await LocalStorageUtils.saveValueInLocalStorage(
        LocalStorageKeyEnum.LAST_PRICE,
        prices,
      );
    } else {
      Logger.error('Cannot fetch prices from API. Using last known price...');
      prices = await LocalStorageUtils.getValueFromLocalStorage(
        LocalStorageKeyEnum.LAST_PRICE,
      );
    }
  } catch (err) {
    Logger.error(
      'Cannot fetch prices from API. Using last known price...',
      err,
    );
    prices = await LocalStorageUtils.getValueFromLocalStorage(
      LocalStorageKeyEnum.LAST_PRICE,
    );
  } finally {
    return prices ?? {};
  }
};

const getBittrexCurrency = async (currency: string) => {
  const response = await fetch(
    'https://api.bittrex.com/api/v1.1/public/getcurrencies',
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
  );
  if (response.status === 200) {
    return (await response.json()).find((c: any) => c.Currency == currency);
  }
  return null;
};

const CurrencyPricesUtils = {
  getBittrexCurrency,
  getPrices,
};

export default CurrencyPricesUtils;
