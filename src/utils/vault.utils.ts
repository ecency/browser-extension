import { VaultKey } from '@reference-data/vault-message-key.enum';

const STORAGE_KEY_PREFIX = 'vault_';

const getValueFromVault = async (key: VaultKey): Promise<any> => {
  const storageKey = STORAGE_KEY_PREFIX + key;
  const result = await chrome.storage.session.get(storageKey);
  return result[storageKey];
};

const saveValueInVault = async (key: VaultKey, value: any): Promise<boolean> => {
  const storageKey = STORAGE_KEY_PREFIX + key;
  await chrome.storage.session.set({ [storageKey]: value });
  return true;
};

const removeFromVault = async (key: VaultKey): Promise<boolean> => {
  const storageKey = STORAGE_KEY_PREFIX + key;
  await chrome.storage.session.remove(storageKey);
  return true;
};

const VaultUtils = {
  getValueFromVault,
  saveValueInVault,
  removeFromVault,
};

export default VaultUtils;
