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
import { PrivateKey } from '@ecency/sdk/hive';
import { sha256 } from '@noble/hashes/sha256';

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

const signMessage = (message: string, privateKey: string): SignedBuffer => {
  let buf;
  try {
    const o = JSON.parse(message, (k, v) => {
      if (
        v !== null &&
        typeof v === 'object' &&
        'type' in v &&
        v.type === 'Buffer' &&
        'data' in v &&
        Array.isArray(v.data)
      ) {
        return Buffer.from(v.data);
      }
      return v;
    });
    if (Buffer.isBuffer(o)) {
      buf = o;
    } else {
      buf = message;
    }
  } catch (e) {
    buf = message;
  }
  // Matches hive-js Signature.signBuffer: sha256 the buffer (utf8 bytes for a
  // string), then sign the digest. A different-but-valid canonical signature
  // from the previous lib is fine - signBuffer results are verified, not
  // compared byte-for-byte.
  // Use Uint8Array/TextEncoder (not Node Buffer): @noble validates
  // `instanceof Uint8Array`, and a Buffer fails that check across realms.
  const bytes =
    typeof buf === 'string' ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  return PrivateKey.fromString(privateKey).sign(sha256(bytes)).customToString();
};
