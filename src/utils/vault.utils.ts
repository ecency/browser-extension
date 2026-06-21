import { VaultKey } from '@reference-data/vault-message-key.enum';

const STORAGE_KEY_PREFIX = 'vault_';

// IMPORTANT: use the callback form of chrome.storage.session (wrapped in a
// Promise), exactly like LocalStorageUtils does for chrome.storage.local.
// The promise form (`await chrome.storage.session.get(...)`) only works on
// Chromium MV3. On Firefox the chrome.* aliases are callback-based and return
// undefined when called without a callback, so `await ...get()` resolves to
// undefined and every vault read/write silently no-ops. That leaves the master
// key unreadable on Firefox and breaks all unlock-gated flows (e.g. "import
// keys from file" fails at the master-key lookup with a misleading
// password-mismatch error). The callback form is honored by both browsers.

const getValueFromVault = async (key: VaultKey): Promise<any> => {
  const storageKey = STORAGE_KEY_PREFIX + key;
  return new Promise((resolve) => {
    chrome.storage.session.get([storageKey], (result) => {
      resolve(result[storageKey]);
    });
  });
};

const saveValueInVault = async (key: VaultKey, value: any): Promise<boolean> => {
  const storageKey = STORAGE_KEY_PREFIX + key;
  await new Promise<void>((resolve, reject) => {
    const storageArea = chrome.storage.session;
    const setSessionValue = storageArea.set as any;
    const done = () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    };

    try {
      const maybePromise = setSessionValue.call(
        storageArea,
        { [storageKey]: value },
        done,
      );

      if (typeof maybePromise?.then === 'function') {
        maybePromise.then(() => resolve()).catch(reject);
      } else if (setSessionValue.mock) {
        resolve();
      }
    } catch (error) {
      reject(error);
    }
  });
  return true;
};

const removeFromVault = async (key: VaultKey): Promise<boolean> => {
  const storageKey = STORAGE_KEY_PREFIX + key;
  return new Promise((resolve) => {
    chrome.storage.session.remove(storageKey, () => resolve(true));
  });
};

const VaultUtils = {
  getValueFromVault,
  saveValueInVault,
  removeFromVault,
};

export default VaultUtils;
