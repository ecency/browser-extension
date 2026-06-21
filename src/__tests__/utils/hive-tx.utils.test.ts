import Hive, { Settings } from '@engrave/ledger-app-hive';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import { KeysUtils } from '@popup/hive/utils/keys.utils';
import AccountUtils from '@popup/hive/utils/account.utils';
import TransferUtils from '@hiveapp/utils/transfer.utils';
import {
  AccountCreateOperation,
  Operation,
  SignedTransaction,
} from '@hiveio/dhive';
import { DefaultRpcs } from '@reference-data/default-rpc.list';
import {
  Transaction as HiveTransaction,
  config as HiveTxConfig,
} from '@ecency/sdk/hive';
import Config from 'src/config';
import accounts from 'src/__tests__/utils-for-testing/data/accounts';
import mk from 'src/__tests__/utils-for-testing/data/mk';
import userData from 'src/__tests__/utils-for-testing/data/user-data';
import { KeychainError } from 'src/keychain-error';
import { LedgerUtils } from 'src/utils/ledger.utils';
import Logger from 'src/utils/logger.utils';
import VaultUtils from 'src/utils/vault.utils';

describe('hive-tx.utils.ts tests:\n', () => {
  const constants = {
    operations: [
      {
        0: 'account_create',
        1: {
          fee: '1 HIVE',
          creator: mk.user.one,
          new_account_name: 'new_account',
          owner: accounts.extended.owner,
          active: accounts.extended.active,
          posting: accounts.extended.posting,
          memo_key: accounts.extended.memo_key,
          json_metadata: {},
        } as unknown as AccountCreateOperation,
      },
    ] as Operation[],
    tx: {
      expiration: '10/10/2023',
      extensions: [],
      operations: [
        TransferUtils.getRecurrentTransferOperation(
          'sender',
          'receiver',
          '1.000 HBD',
          '',
          24,
          2,
        ),
      ],
      ref_block_num: 1125554,
      ref_block_prefix: 1111222,
      signatures: [],
    },
  };

  // @ecency/sdk builds a transaction by calling addOperation (which hits the
  // chain for ref_block data). Stub it to set the built transaction offline so
  // these unit tests never make network calls.
  const mockBuild = (builtTx: any) =>
    jest
      .spyOn(HiveTransaction.prototype, 'addOperation')
      .mockImplementation(async function (this: any) {
        this.transaction = builtTx;
      });

  beforeEach(() => {
    jest
      .spyOn(HiveTxUtils, 'getData')
      .mockImplementation(async (method: string) => {
        if (method === 'condenser_api.get_accounts') {
          return [accounts.extended];
        }
        return undefined;
      });
    jest
      .spyOn(AccountUtils, 'getExtendedAccount')
      .mockResolvedValue(accounts.extended as any);
    jest.spyOn(AccountUtils, 'getAccountsFromLocalStorage').mockResolvedValue([]);
    jest.spyOn(VaultUtils, 'getValueFromVault').mockResolvedValue('mk');
    jest
      .spyOn(AccountUtils, 'getAccountFromLocalStorage')
      .mockResolvedValue(accounts.local.oneAllkeys as any);
    jest.spyOn(KeysUtils, 'isUsingMultisig').mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('createTransaction', () => {
    it('returns the transaction built by addOperation', async () => {
      const created = { ...constants.tx, id: 'created' };
      mockBuild(created);

      const tx = await HiveTxUtils.createTransaction(constants.operations);

      expect(tx).toEqual(created);
    });

    it('passes each operation to addOperation as separate (name, body) args', async () => {
      const addOp = mockBuild({ ...constants.tx });

      await HiveTxUtils.createTransaction(constants.operations);

      // The core of the hive-tx -> @ecency/sdk migration: each [name, body]
      // tuple must be forwarded to addOperation as two positional args.
      expect(addOp).toHaveBeenCalledTimes(constants.operations.length);
      expect(addOp).toHaveBeenCalledWith(
        'account_create',
        expect.objectContaining({
          creator: mk.user.one,
          new_account_name: 'new_account',
        }),
      );
    });
  });

  describe('setRpc cases:\n', () => {
    it('Must set bundled default Rpc when uri is DEFAULT', async () => {
      await HiveTxUtils.setRpc({ uri: 'DEFAULT', testnet: false });
      expect(HiveTxConfig.nodes[0]).toEqual(Config.rpc.DEFAULT.uri);
    });

    it('Must set Rpc', async () => {
      await HiveTxUtils.setRpc({ ...DefaultRpcs[2], chainId: 'chain_Id' });
      expect(HiveTxConfig.nodes[0]).toEqual(DefaultRpcs[2].uri);
    });
  });

  describe('createSignAndBroadcastTransaction cases: \n', () => {
    describe('not using ledger & no signHash:\n', () => {
      it('Must catch error, call logger and throw signing Error if not valid key', async () => {
        mockBuild(constants.tx);
        const sLoggerError = jest.spyOn(Logger, 'error');
        await expect(
          HiveTxUtils.createSignAndBroadcastTransaction(
            constants.operations,
            userData.one.encryptKeys.posting,
          ),
        ).rejects.toThrow('html_popup_error_while_signing_transaction');
        expect(sLoggerError).toHaveBeenCalled();
      });
    });

    describe('using ledger:\n', () => {
      it('Must catch and throw error if is not Displayable On Device', async () => {
        mockBuild(constants.tx);
        jest
          .spyOn(LedgerUtils, 'getSettings')
          .mockResolvedValue({ hashSignPolicy: false } as Settings);
        jest.spyOn(Hive, 'isDisplayableOnDevice').mockReturnValue(false);
        await expect(
          HiveTxUtils.createSignAndBroadcastTransaction(
            constants.operations,
            '#ajjsk1121312312',
          ),
        ).rejects.toThrow('error_ledger_no_hash_sign_policy');
      });

      it('Must throw when the ledger returns no signatures', async () => {
        mockBuild(constants.tx);
        jest
          .spyOn(LedgerUtils, 'getSettings')
          .mockResolvedValue({ hashSignPolicy: true } as Settings);
        jest.spyOn(Hive, 'isDisplayableOnDevice').mockReturnValue(true);
        jest
          .spyOn(LedgerUtils, 'signTransaction')
          .mockResolvedValue({} as SignedTransaction);
        const sLoggerError = jest.spyOn(Logger, 'error');
        await expect(
          HiveTxUtils.createSignAndBroadcastTransaction(
            constants.operations,
            '#ajjsk1121312312',
          ),
        ).rejects.toThrow("Cannot read properties of undefined (reading '0')");
        expect(sLoggerError).toHaveBeenCalled();
      });

      it('Must throw error and call logger if getSettings fails', async () => {
        mockBuild(constants.tx);
        jest
          .spyOn(LedgerUtils, 'getSettings')
          .mockRejectedValue(new Error('error getting settings'));

        await expect(
          HiveTxUtils.createSignAndBroadcastTransaction(
            constants.operations,
            '#ajjsk1121312312',
          ),
        ).rejects.toThrow('popup_html_ledger_unknown_error');
      });

      it('Must throw a broadcast error if broadcast fails', async () => {
        mockBuild(constants.tx);
        jest
          .spyOn(LedgerUtils, 'getSettings')
          .mockResolvedValue({ hashSignPolicy: true } as Settings);
        jest.spyOn(Hive, 'isDisplayableOnDevice').mockReturnValue(false);
        jest
          .spyOn(HiveTransaction.prototype, 'addSignature')
          .mockReturnValue({ ...constants.tx, signatures: ['signature'] } as any);
        jest
          .spyOn(Hive, 'getTransactionDigest')
          .mockReturnValue('string_digest');
        jest.spyOn(LedgerUtils, 'signHash').mockResolvedValue('signed_string');
        jest
          .spyOn(HiveTransaction.prototype, 'broadcast')
          .mockRejectedValue(new Error('error broadcasting'));

        // A transport-style error (no chain `.data`) maps to the generic
        // broadcast error via ErrorUtils.parse.
        await expect(
          HiveTxUtils.createSignAndBroadcastTransaction(
            constants.operations,
            '#ajjsk1121312312',
          ),
        ).rejects.toThrow('html_popup_error_while_broadcasting');
      });
    });
  });

  describe('signTransaction cases:\n', () => {
    describe('isUsingLedger cases:\n', () => {
      it('Must throw error if getSettings fails', async () => {
        jest
          .spyOn(LedgerUtils, 'getSettings')
          .mockRejectedValue(new Error('ledger not detected'));
        await expect(
          HiveTxUtils.signTransaction(constants.tx as any, '#1qw23eer4e'),
        ).rejects.toThrow('popup_html_ledger_unknown_error');
      });

      it('Must throw error if not Displayable On Device & hashSignPolicy is false', async () => {
        jest
          .spyOn(LedgerUtils, 'getSettings')
          .mockResolvedValue({ hashSignPolicy: false } as Settings);
        jest.spyOn(Hive, 'isDisplayableOnDevice').mockReturnValue(false);
        await expect(
          HiveTxUtils.signTransaction(constants.tx as any, '#1qw23eer4e'),
        ).rejects.toThrow('error_ledger_no_hash_sign_policy');
      });

      it('Must return signature using LedgerUtils.signTransaction', async () => {
        jest
          .spyOn(LedgerUtils, 'getSettings')
          .mockResolvedValue({ hashSignPolicy: true } as Settings);
        jest.spyOn(Hive, 'isDisplayableOnDevice').mockReturnValue(true);
        jest.spyOn(LedgerUtils, 'signTransaction').mockResolvedValue({
          ...constants.tx,
          signatures: ['signed_here'],
        } as any);
        expect(
          await HiveTxUtils.signTransaction(constants.tx as any, '#qqqw11'),
        ).toEqual({
          ...constants.tx,
          signatures: ['signed_here'],
        });
      });

      it('Must throw error and call logger if signHash fails', async () => {
        jest
          .spyOn(LedgerUtils, 'getSettings')
          .mockResolvedValue({ hashSignPolicy: true } as Settings);
        jest.spyOn(Hive, 'isDisplayableOnDevice').mockReturnValue(false);
        jest
          .spyOn(Hive, 'getTransactionDigest')
          .mockReturnValue('string_digest');
        jest
          .spyOn(LedgerUtils, 'signHash')
          .mockRejectedValue(new Error('signHash error'));
        const sLoggerError = jest.spyOn(Logger, 'error');
        await expect(
          HiveTxUtils.signTransaction(constants.tx as any, '#qqqw11'),
        ).rejects.toThrow('signHash error');
        expect(sLoggerError).toHaveBeenCalledWith(new Error('signHash error'));
      });
    });

    describe('not using Ledger cases:\n', () => {
      it('Must return transaction signed', async () => {
        const signed = { ...constants.tx, signatures: ['signed'] };
        jest
          .spyOn(HiveTransaction.prototype, 'sign')
          .mockReturnValue(signed as any);
        expect(
          await HiveTxUtils.signTransaction(
            constants.tx as any,
            userData.one.nonEncryptKeys.active,
          ),
        ).toEqual(signed);
      });

      it('Must throw error and call logger if not valid key', async () => {
        const sLoggerError = jest.spyOn(Logger, 'error');
        await expect(
          HiveTxUtils.signTransaction(
            constants.tx as any,
            userData.one.encryptKeys.active,
          ),
        ).rejects.toThrow('html_popup_error_while_signing_transaction');
        expect(sLoggerError).toHaveBeenCalled();
      });
    });
  });

  describe('broadcastAndConfirmTransactionWithSignature cases:\n', () => {
    it('adds multiple signatures when signature is a string array', async () => {
      const addSig = jest
        .spyOn(HiveTransaction.prototype, 'addSignature')
        .mockReturnValue({ ...constants.tx, signatures: ['a', 'b'] } as any);
      jest
        .spyOn(HiveTransaction.prototype, 'broadcast')
        .mockResolvedValue({ tx_id: 'multi-sig-tx', status: 'unknown' } as any);

      const result =
        await HiveTxUtils.broadcastAndConfirmTransactionWithSignature(
          constants.tx as any,
          ['sig-one', 'sig-two'],
          false,
        );

      expect(addSig).toHaveBeenCalledTimes(2);
      expect(addSig).toHaveBeenNthCalledWith(1, 'sig-one');
      expect(addSig).toHaveBeenNthCalledWith(2, 'sig-two');
      expect(result).toMatchObject({
        tx_id: 'multi-sig-tx',
        id: 'multi-sig-tx',
        confirmed: false,
      });
    });

    it('Must throw a broadcast error and call logger if broadcast rejects', async () => {
      jest
        .spyOn(HiveTransaction.prototype, 'addSignature')
        .mockReturnValue({ ...constants.tx, signatures: ['signature'] } as any);
      jest
        .spyOn(HiveTransaction.prototype, 'broadcast')
        .mockRejectedValue(new Error('error on broadcast'));
      const sLoggerError = jest.spyOn(Logger, 'error');

      await expect(
        HiveTxUtils.broadcastAndConfirmTransactionWithSignature(
          constants.tx as any,
          'signature',
        ),
      ).rejects.toThrow('html_popup_error_while_broadcasting');
      expect(sLoggerError).toHaveBeenCalled();
    });
  });
});
