import { HiveEngineConfigUtils } from 'src/popup/hive/utils/hive-engine-config.utils';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import Logger from 'src/utils/logger.utils';

// --- Types ---

export interface OrderBookEntry {
  price: number;
  quantity: number;
  total?: number;
}

export interface SwapEstimate {
  fromAmount: number;
  toAmount: number;
  rate: number;
  slippage: number;
  method: 'hive' | 'engine';
}

export interface HiveOrderBookEntry {
  order_price: { base: string; quote: string };
  real_price: string;
  hive: number;
  hbd: number;
}

// --- Hive Internal Market (HIVE ↔ HBD) ---

const getHiveOrderBook = async (
  limit: number = 500,
): Promise<{ bids: HiveOrderBookEntry[]; asks: HiveOrderBookEntry[] }> => {
  const result = await HiveTxUtils.getData(
    'condenser_api.get_order_book',
    [limit],
  );
  return result;
};

const estimateHiveSwap = async (
  fromAsset: string,
  amount: number,
): Promise<SwapEstimate | null> => {
  try {
    const orderBook = await getHiveOrderBook();
    if (!orderBook) return null;

    const sellingHive = fromAsset === 'HIVE';
    const orders = sellingHive ? orderBook.bids : orderBook.asks;

    if (!orders || orders.length === 0) return null;

    let remaining = amount;
    let accumulated = 0;
    const firstPrice = parseFloat(orders[0].real_price);

    for (const order of orders) {
      const available = sellingHive ? order.hive / 1000 : order.hbd / 1000;
      const price = parseFloat(order.real_price);
      const tradable = Math.min(available, remaining);

      if (sellingHive) {
        accumulated += tradable * price;
      } else {
        accumulated += tradable / price;
      }
      remaining -= tradable;
      if (remaining <= 0) break;
    }

    if (remaining > 0) return null; // Insufficient liquidity

    const effectiveRate = accumulated / amount;
    const slippage = Math.abs(effectiveRate - firstPrice) / firstPrice;

    // Floor to 3 decimals — never promise more than the book provides
    const toAmount = Math.floor(accumulated * 1000) / 1000;

    return {
      fromAmount: amount,
      toAmount,
      rate: parseFloat(effectiveRate.toFixed(6)),
      slippage: parseFloat((slippage * 100).toFixed(2)),
      method: 'hive',
    };
  } catch (err) {
    Logger.error('Failed to estimate Hive swap', err);
    return null;
  }
};

/**
 * Builds a limit_order_create that fills instantly against the
 * existing order book. Uses the estimated amount (already floor-rounded
 * from the book walk) as min_to_receive so the order matches at
 * or better than the estimated price.
 *
 * fill_or_kill=false: the order fills against existing book entries;
 * any unfilled remainder sits as a pending order (auto-expires).
 * In practice, if the estimate is correct the entire order fills
 * immediately since the book has the required liquidity.
 */
const buildLimitOrderOperation = (
  username: string,
  sellingHive: boolean,
  sellAmount: number,
  receiveAmount: number,
) => {
  const orderId = Math.floor(
    9e9 + parseInt(Date.now().toString().slice(-8)),
  );
  const expiration = new Date(
    Date.now() + 27 * 24 * 60 * 60 * 1000,
  ).toISOString().split('.')[0];

  return [
    'limit_order_create',
    {
      owner: username,
      orderid: orderId,
      amount_to_sell: sellingHive
        ? `${sellAmount.toFixed(3)} HIVE`
        : `${sellAmount.toFixed(3)} HBD`,
      min_to_receive: sellingHive
        ? `${receiveAmount.toFixed(3)} HBD`
        : `${receiveAmount.toFixed(3)} HIVE`,
      fill_or_kill: false,
      expiration,
    },
  ] as any;
};

// --- Hive Engine Market (Token ↔ SWAP.HIVE) ---

export interface EngineOrderBookEntry {
  txId: string;
  account: string;
  symbol: string;
  quantity: string;
  price: string;
}

const getEngineOrderBook = async (
  symbol: string,
  limit: number = 100,
): Promise<{ buy: EngineOrderBookEntry[]; sell: EngineOrderBookEntry[] }> => {
  const url = `${HiveEngineConfigUtils.getApi()}/contracts`;

  const fetchBook = async (
    table: string,
    sortDesc: boolean,
  ): Promise<EngineOrderBookEntry[]> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'find',
        params: {
          contract: 'market',
          table,
          query: { symbol },
          limit,
          offset: 0,
          indexes: [{ index: 'priceDec', descending: sortDesc }],
        },
      }),
    });
    const data = await res.json();
    return data.result || [];
  };

  const [buy, sell] = await Promise.all([
    fetchBook('buyBook', true),
    fetchBook('sellBook', false),
  ]);

  return { buy, sell };
};

const estimateEngineSwap = async (
  fromSymbol: string,
  toSymbol: string,
  amount: number,
): Promise<SwapEstimate | null> => {
  try {
    const symbol = fromSymbol === 'SWAP.HIVE' ? toSymbol : fromSymbol;
    const orderBook = await getEngineOrderBook(symbol);
    const buying = fromSymbol === 'SWAP.HIVE';

    const orders = buying ? orderBook.sell : orderBook.buy;
    if (!orders || orders.length === 0) return null;

    let remaining = amount;
    let accumulated = 0;
    const firstPrice = parseFloat(orders[0].price);

    for (const order of orders) {
      const qty = parseFloat(order.quantity);
      const price = parseFloat(order.price);

      if (buying) {
        // Spending SWAP.HIVE to buy tokens
        const orderCost = qty * price;
        if (remaining >= orderCost) {
          accumulated += qty;
          remaining -= orderCost;
        } else {
          accumulated += remaining / price;
          remaining = 0;
        }
      } else {
        // Selling tokens for SWAP.HIVE
        const tradable = Math.min(qty, remaining);
        accumulated += tradable * price;
        remaining -= tradable;
      }
      if (remaining <= 0) break;
    }

    if (remaining > 0.0001) return null;

    const effectiveRate = accumulated / amount;
    const slippage = Math.abs(effectiveRate - firstPrice) / firstPrice;

    return {
      fromAmount: amount,
      toAmount: parseFloat(accumulated.toFixed(8)),
      rate: parseFloat(effectiveRate.toFixed(8)),
      slippage: parseFloat((slippage * 100).toFixed(2)),
      method: 'engine',
    };
  } catch (err) {
    Logger.error('Failed to estimate Engine swap', err);
    return null;
  }
};

const buildEngineMarketOperation = (
  username: string,
  action: 'buy' | 'sell',
  symbol: string,
  quantity: number,
  price: number,
) => {
  return [
    'custom_json',
    {
      required_auths: [username],
      required_posting_auths: [],
      id: 'ssc-mainnet-hive',
      json: JSON.stringify({
        contractName: 'market',
        contractAction: action,
        contractPayload: {
          symbol,
          quantity: quantity.toFixed(8),
          price: price.toFixed(8),
        },
      }),
    },
  ] as any;
};

export const SwapUtils = {
  getHiveOrderBook,
  estimateHiveSwap,
  buildLimitOrderOperation,
  getEngineOrderBook,
  estimateEngineSwap,
  buildEngineMarketOperation,
};
