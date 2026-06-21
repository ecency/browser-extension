import { createMessage } from '@background/requests/operations/operations.utils';
import { RequestsHandler } from '@background/requests/request-handler';
import {
  KeychainKeyTypesLC,
  RequestId,
  RequestSignBuffer,
} from '@interfaces/keychain.interface';
import { KeychainError } from 'src/keychain-error';
import { KeysUtils } from 'src/popup/hive/utils/keys.utils';
import Logger from 'src/utils/logger.utils';
import { signMessage } from 'src/utils/sign-message.utils';

export type SignedBuffer = string;

export const signBuffer = async (
  requestHandler: RequestsHandler,
  data: RequestSignBuffer & RequestId,
) => {
  let signed = null;
  let error = null;
  let err_message = null;
  let publicKey = requestHandler.data.publicKey;

  try {
    let key = requestHandler.data.key;
    if (!key) {
      [key, publicKey] = requestHandler.getUserKeyPair(
        data.username!,
        data.method.toLowerCase() as KeychainKeyTypesLC,
      ) as [string, string];
    }
    if (KeysUtils.isUsingLedger(key!)) {
      throw new KeychainError('sign_buffer_ledger_error');
    }
    signed = await signMessage(data.message, key!);
  } catch (err) {
    Logger.error(err);
    error = err;
    err_message = await chrome.i18n.getMessage(
      (err as KeychainError).message,
      (err as KeychainError).messageParams,
    );
  } finally {
    return await createMessage(
      error,
      signed,
      data,
      await chrome.i18n.getMessage('bgd_ops_sign_success'),
      err_message ?? (await chrome.i18n.getMessage('bgd_ops_sign_error')),
      publicKey,
    );
  }
};

