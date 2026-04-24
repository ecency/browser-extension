import { BackgroundCommand } from '@reference-data/background-message-key.enum';
import { LocalStorageKeyEnum } from '@reference-data/local-storage-key.enum';
import { VaultKey } from '@reference-data/vault-message-key.enum';
import { LocalAccount } from 'src/interfaces/local-account.interface';
import EncryptUtils from 'src/popup/hive/utils/encrypt.utils';
import LocalStorageUtils from 'src/utils/localStorage.utils';
import VaultUtils from 'src/utils/vault.utils';
import React from 'react';
import ReactDOM from 'react-dom';
import ImportFile from './import-file.component';

const importAccounts = async (
  fileData: string,
  filePassword: string,
): Promise<{ feedback?: { message: string; params?: string[] } | null }> => {
  const mk = await VaultUtils.getValueFromVault(VaultKey.__MK);
  if (!mk) {
    return { feedback: { message: 'import_html_error' } };
  }

  const decryptPassword = filePassword || mk;
  let importedAccounts: LocalAccount[];
  try {
    const decrypted = await EncryptUtils.decryptToJsonWithLegacySupport(
      fileData,
      decryptPassword,
    );
    importedAccounts = decrypted?.list;
  } catch (e) {
    return { feedback: { message: 'import_html_error' } };
  }

  if (!importedAccounts?.length) {
    return { feedback: { message: 'import_html_error' } };
  }

  // Load existing accounts
  const existing =
    (await EncryptUtils.decryptToJson(
      await LocalStorageUtils.getValueFromLocalStorage(
        LocalStorageKeyEnum.ACCOUNTS,
      ),
      mk,
    )) || {};

  // Merge
  const existingList: LocalAccount[] = existing.list || [];
  const merged: LocalAccount[] = [];

  for (const imported of importedAccounts) {
    const match = existingList.find((e) => e.name === imported.name);
    if (match) {
      const account = { name: match.name, keys: { ...match.keys } };
      if (imported.keys.active && !match.keys.active) {
        account.keys.active = imported.keys.active;
        account.keys.activePubkey = imported.keys.activePubkey;
      }
      if (imported.keys.memo && !match.keys.memo) {
        account.keys.memo = imported.keys.memo;
        account.keys.memoPubkey = imported.keys.memoPubkey;
      }
      if (imported.keys.posting && !match.keys.posting) {
        account.keys.posting = imported.keys.posting;
        account.keys.postingPubkey = imported.keys.postingPubkey;
      }
      merged.push(account);
    } else {
      merged.push(imported);
    }
  }
  for (const ex of existingList) {
    if (!merged.find((m) => m.name === ex.name)) {
      merged.push(ex);
    }
  }

  // Save re-encrypted with current MK
  const encrypted = await EncryptUtils.encryptJson({ list: merged }, mk);
  await LocalStorageUtils.saveValueInLocalStorage(
    LocalStorageKeyEnum.ACCOUNTS,
    encrypted,
  );

  // Notify popup so it refreshes
  chrome.runtime.sendMessage({
    command: BackgroundCommand.SEND_BACK_IMPORTED_ACCOUNTS,
    value: { accounts: merged },
  });

  return {};
};

ReactDOM.render(
  <ImportFile
    title={'import_html_title'}
    text={'import_html_text'}
    accept={'.kc'}
    askPassword
    onImport={importAccounts}
  />,
  document.getElementById('root'),
);

export {};
