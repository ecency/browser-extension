import Hive from '@engrave/ledger-app-hive';
import type { Operation, Transaction } from '@hiveio/dhive';
import {
  Transaction as HiveTransaction,
  config as HiveTxConfig,
  setNodes,
  PrivateKey,
  callRPC,
} from '@ecency/sdk/hive';
import {
  HiveTxBroadcastResult,
  TransactionResult,
} from '@interfaces/hive-tx.interface';
import { Key, TransactionOptions } from '@interfaces/keys.interface';
import { Rpc } from '@interfaces/rpc.interface';
import Config from 'src/config';
import { KeychainError } from 'src/keychain-error';
import { ErrorUtils } from 'src/popup/hive/utils/error.utils';
import { KeysUtils } from 'src/popup/hive/utils/keys.utils';
import { AsyncUtils } from 'src/utils/async.utils';
import { LedgerUtils } from 'src/utils/ledger.utils';
import Logger from 'src/utils/logger.utils';

const MINUTE = 60;

// @ecency/sdk expiration is in MILLISECONDS (hive-tx used seconds).
const EXPIRATION_MS = Config.transactions.expirationTimeInMinutes * MINUTE * 1000;

const setRpc = async (rpc: Rpc) => {
  const uri = rpc.uri === 'DEFAULT' ? Config.rpc.DEFAULT.uri : rpc.uri;
  // Pin to the single node the user selected (preserves previous behaviour).
  setNodes([uri]);
  if (rpc.chainId) {
    HiveTxConfig.chain_id = rpc.chainId;
  }
};

// Adds each [name, body] operation tuple to an @ecency/sdk Transaction. The
// first addOperation lazily builds the tx (fetches ref_block / global props).
const buildTransaction = async (
  operations: Operation[],
): Promise<HiveTransaction> => {
  const hiveTransaction = new HiveTransaction({ expiration: EXPIRATION_MS });
  for (const operation of operations) {
    // Hive operations are [name, body] tuples. Index access (rather than array
    // destructuring) also accepts tuple-like objects passed by some callers.
    const op = operation as any;
    await hiveTransaction.addOperation(op[0], op[1]);
  }
  return hiveTransaction;
};

const sendOperation = async (
  operations: Operation[],
  key: Key,
  confirmation?: boolean,
  options?: TransactionOptions,
): Promise<TransactionResult | null> => {
  const transactionResult = await HiveTxUtils.createSignAndBroadcastTransaction(
    operations,
    key,
    options,
  );
  if (transactionResult) {
    return {
      id: transactionResult.tx_id,
      tx_id: transactionResult.tx_id,
      confirmed: confirmation
        ? await confirmTransaction(transactionResult.tx_id)
        : false,
    } as TransactionResult;
  } else {
    return null;
  }
};

const createTransaction = async (
  operations: Operation[],
): Promise<Transaction> => {
  const hiveTransaction = await buildTransaction(operations);
  // addOperation always populates `transaction`; the @ecency/sdk TransactionType
  // is structurally compatible with dhive's Transaction.
  const tx = hiveTransaction.transaction! as Transaction;
  Logger.log(`length of transaction => ${JSON.stringify(tx).length}`);
  return tx;
};

const createSignAndBroadcastTransaction = async (
  operations: Operation[],
  key: Key,
  options?: TransactionOptions,
): Promise<HiveTxBroadcastResult | undefined> => {
  if (key == null || key === '') {
    throw new Error('html_popup_error_while_signing_transaction');
  }
  const hiveTransaction = await buildTransaction(operations);
  const transaction = hiveTransaction.transaction! as Transaction;

  if (KeysUtils.isUsingLedger(key)) {
    let hashSignPolicy;
    try {
      hashSignPolicy = (await LedgerUtils.getSettings()).hashSignPolicy;
    } catch (err: any) {
      throw ErrorUtils.parseLedger(err);
    }
    if (!Hive.isDisplayableOnDevice(transaction) && !hashSignPolicy) {
      throw new KeychainError('error_ledger_no_hash_sign_policy');
    }
    try {
      let signedTransactionFromLedger;
      if (!Hive.isDisplayableOnDevice(transaction)) {
        const digest = Hive.getTransactionDigest(transaction);
        const signature = await LedgerUtils.signHash(digest, key);
        hiveTransaction.addSignature(signature);
      } else {
        signedTransactionFromLedger = await LedgerUtils.signTransaction(
          transaction,
          key,
        );
        hiveTransaction.addSignature(
          signedTransactionFromLedger!.signatures[0],
        );
      }
    } catch (err) {
      Logger.error(err);
      throw err;
    }
  } else {
    try {
      const privateKey = PrivateKey.fromString(key!.toString());
      hiveTransaction.sign(privateKey);
    } catch (err) {
      Logger.error(err);
      throw new Error('html_popup_error_while_signing_transaction');
    }
  }
  try {
    // @ecency/sdk broadcast resolves with { tx_id, status } and throws an
    // RPCError on blockchain-level errors (missing authority, RC, etc.).
    const result = await hiveTransaction.broadcast();
    return { ...result } as HiveTxBroadcastResult;
  } catch (err: any) {
    // RPCError.data.stack matches the shape ErrorUtils.parse expects (same as
    // hive-tx's old response.error), so auth-upgrade / RC detection keeps
    // working. Transport errors have no `.data` and parse() falls through to a
    // generic broadcast error.
    Logger.error('Error during broadcast', err);
    throw ErrorUtils.parse(err);
  }
};
/* istanbul ignore next */
const confirmTransaction = async (transactionId: string) => {
  let result: any = null;
  const MAX_RETRY_COUNT = 6;
  let retryCount = 0;
  do {
    result = await callRPC('transaction_status_api.find_transaction', {
      transaction_id: transactionId,
    });
    await AsyncUtils.sleep(1000);
    retryCount++;
  } while (
    ['within_mempool', 'unknown'].includes(result.status) &&
    retryCount < MAX_RETRY_COUNT
  );
  if (
    ['within_reversible_block', 'within_irreversible_block'].includes(
      result.status,
    )
  ) {
    Logger.info('Transaction confirmed');
    return true;
  } else {
    Logger.error(`Transaction failed with status: ${result.status}`);
    return false;
  }
};

const signTransaction = async (tx: Transaction, key: Key) => {
  const hiveTransaction = new HiveTransaction({ transaction: tx as any });
  if (KeysUtils.isUsingLedger(key)) {
    let hashSignPolicy;
    try {
      hashSignPolicy = (await LedgerUtils.getSettings()).hashSignPolicy;
    } catch (err: any) {
      throw ErrorUtils.parseLedger(err);
    }

    if (!Hive.isDisplayableOnDevice(tx) && !hashSignPolicy) {
      throw new KeychainError('error_ledger_no_hash_sign_policy');
    }

    try {
      if (!Hive.isDisplayableOnDevice(tx)) {
        const digest = Hive.getTransactionDigest(tx);
        const signature = await LedgerUtils.signHash(digest, key);
        hiveTransaction.addSignature(signature);
      } else {
        return await LedgerUtils.signTransaction(tx, key);
      }
    } catch (err) {
      Logger.error(err);
      throw err;
    }
  } else {
    try {
      const privateKey = PrivateKey.fromString(key!.toString());
      return hiveTransaction.sign(privateKey);
    } catch (err) {
      Logger.error(err);
      throw new KeychainError('html_popup_error_while_signing_transaction');
    }
  }
};

const broadcastAndConfirmTransactionWithSignature = async (
  transaction: Transaction,
  signature: string | string[],
  confirmation?: boolean,
): Promise<TransactionResult | undefined> => {
  const hiveTransaction = new HiveTransaction({
    transaction: transaction as any,
  });
  if (typeof signature === 'string') {
    hiveTransaction.addSignature(signature);
  } else {
    for (const si of signature) {
      hiveTransaction.addSignature(si);
    }
  }
  try {
    Logger.log(hiveTransaction);
    const result = await hiveTransaction.broadcast();
    return {
      id: result.tx_id,
      tx_id: result.tx_id,
      confirmed: confirmation ? await confirmTransaction(result.tx_id) : false,
    } as TransactionResult;
  } catch (err: any) {
    Logger.error('Error during broadcast', err);
    throw ErrorUtils.parse(err);
  }
};
/* istanbul ignore next */
const getData = async (
  method: string,
  params: any[] | object,
  key?: string,
) => {
  try {
    // callRPC returns the RPC `result` directly (and throws on error).
    const result = await callRPC<any>(method, params, 3000);
    if (result !== undefined && result !== null) {
      return key ? result[key] : result;
    } else {
      switchToWorkingRpc(method, 'empty result');
    }
  } catch (err) {
    switchToWorkingRpc(method, err);
  }
};

const switchToWorkingRpc = (method: string, error: any) => {
  // getData calls this fire-and-forget on an RPC failure. Log the error here
  // rather than throwing from an un-awaited async function (which would surface
  // as a swallowed unhandled promise rejection). getData still resolves to
  // undefined on failure, so callers are unaffected.
  Logger.error(
    `Error while retrieving data from ${method} : ${JSON.stringify(error)}`,
  );
  // Only the popup (a DOM document) can run the RPC switcher. Use `typeof
  // window` rather than a bare `window` so this never throws a ReferenceError
  // in a worker-like scope, regardless of how the background global is set up.
  if (typeof window !== 'undefined' && window.document) {
    import('src/utils/rpc-switcher.utils').then(({ useWorkingRPC }) => {
      useWorkingRPC();
    });
  }
};

const getTransaction = async (txId: string) => {
  await AsyncUtils.sleep(3000);
  return HiveTxUtils.getData('condenser_api.get_transaction', [txId]);
};

export const HiveTxUtils = {
  getTransaction,
  sendOperation,
  createSignAndBroadcastTransaction,
  getData,
  setRpc,
  createTransaction,
  signTransaction,
  broadcastAndConfirmTransactionWithSignature,
};
