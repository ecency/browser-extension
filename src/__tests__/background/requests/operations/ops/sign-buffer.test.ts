import { signBuffer } from '@background/requests/operations/ops/sign-buffer';
import { RequestsHandler } from '@background/requests/request-handler';
import { KeysUtils } from 'src/popup/hive/utils/keys.utils';
import { DialogCommand } from '@reference-data/dialog-message-key.enum';
import {
  KeychainKeyTypes,
  KeychainRequestTypes,
  RequestId,
  RequestSignBuffer,
} from 'hive-keychain-commons';
import mk from 'src/__tests__/utils-for-testing/data/mk';
import userData from 'src/__tests__/utils-for-testing/data/user-data';
import mocksImplementation from 'src/__tests__/utils-for-testing/implementations/implementations';
import { KeychainError } from 'src/keychain-error';
import { PrivateKey, Signature } from '@ecency/sdk/hive';
import { sha256 } from '@noble/hashes/sha256';

// @ecency/sdk signatures are non-deterministic, so signBuffer results can't be
// compared to a freshly computed value. Verify the signature recovers the
// signer's public key instead (the property that actually matters).
const recoversKey = (signed: any, digest: Uint8Array, wif: string) =>
  Signature.from(signed.msg.result).getPublicKey(digest).toString() ===
  PrivateKey.fromString(wif).createPublic().toString();

describe('sign-buffer tests:\n', () => {
  const data = {
    domain: 'domain',
    type: KeychainRequestTypes.signBuffer,
    username: mk.user.one,
    message: '',
    method: KeychainKeyTypes.active,
    title: 'title',
  } as RequestSignBuffer & RequestId;

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });
  beforeEach(() => {
    jest.spyOn(chrome.i18n, 'getUILanguage').mockReturnValueOnce('en-US');
    chrome.i18n.getMessage = jest
      .fn()
      .mockImplementation(mocksImplementation.i18nGetMessageCustom);
  });

  it('Must call getUserKey', async () => {
    const requestHandler = new RequestsHandler();
    const sGetUserKeyPair = jest.spyOn(requestHandler, 'getUserKeyPair');
    await signBuffer(requestHandler, data);
    expect(sGetUserKeyPair).toHaveBeenCalledWith(
      data.username!,
      data.method.toLowerCase(),
    );
  });

  it('Must return success on string', async () => {
    const requestHandler = new RequestsHandler();
    requestHandler.data.key = userData.one.nonEncryptKeys.active;
    data.message = 'the key is very importat on HIVE';
    const signed = await signBuffer(requestHandler, data);
    const { request_id, ...datas } = data;
    expect(signed).toEqual({
      command: DialogCommand.ANSWER_REQUEST,
      msg: {
        success: true,
        error: null,
        result: expect.stringMatching(/^[0-9a-f]{130}$/),
        data: datas,
        message: chrome.i18n.getMessage('bgd_ops_sign_success'),
        request_id: request_id,
        publicKey: undefined,
      },
    });
    const digest = sha256(new TextEncoder().encode(data.message));
    expect(recoversKey(signed, digest, userData.one.nonEncryptKeys.active)).toBe(
      true,
    );
  });

  it('Must return success on buffer', async () => {
    const requestHandler = new RequestsHandler();
    requestHandler.data.key = userData.one.nonEncryptKeys.active;
    const _buffer = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]);
    data.message = JSON.stringify(_buffer);
    const signed = await signBuffer(requestHandler, data);
    const { request_id, ...datas } = data;
    expect(signed).toEqual({
      command: DialogCommand.ANSWER_REQUEST,
      msg: {
        success: true,
        error: null,
        result: expect.stringMatching(/^[0-9a-f]{130}$/),
        data: datas,
        message: chrome.i18n.getMessage('bgd_ops_sign_success'),
        request_id: request_id,
        publicKey: undefined,
      },
    });
    const digest = sha256(Uint8Array.from(_buffer));
    expect(recoversKey(signed, digest, userData.one.nonEncryptKeys.active)).toBe(
      true,
    );
  });

  it('Must return error if no key on handler', async () => {
    const requestHandler = new RequestsHandler();
    requestHandler.getUserKeyPair = jest.fn().mockReturnValue([]);
    KeysUtils.isUsingLedger = jest.fn().mockReturnValue(true);
    const signed = await signBuffer(requestHandler, data);
    const { request_id, ...datas } = data;
    expect(signed).toEqual({
      command: DialogCommand.ANSWER_REQUEST,
      msg: {
        success: false,
        error: new KeychainError('sign_buffer_ledger_error'),
        result: null,
        data: datas,
        message: chrome.i18n.getMessage('sign_buffer_ledger_error'),
        request_id: request_id,
        publicKey: undefined,
      },
    });
  });
});
