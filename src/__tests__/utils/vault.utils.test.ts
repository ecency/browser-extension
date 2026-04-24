import { VaultKey } from '@reference-data/vault-message-key.enum';
import VaultUtils from 'src/utils/vault.utils';

describe('vault.utils (chrome.storage.session)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getValueFromVault returns stored value', async () => {
    (chrome.storage.session.get as jest.Mock).mockResolvedValueOnce({
      vault___MK: 'my-secret',
    });
    const result = await VaultUtils.getValueFromVault(VaultKey.__MK);
    expect(chrome.storage.session.get).toHaveBeenCalledWith('vault___MK');
    expect(result).toBe('my-secret');
  });

  it('getValueFromVault returns undefined when key is missing', async () => {
    (chrome.storage.session.get as jest.Mock).mockResolvedValueOnce({});
    const result = await VaultUtils.getValueFromVault(VaultKey.__MK);
    expect(result).toBeUndefined();
  });

  it('saveValueInVault stores value and returns true', async () => {
    (chrome.storage.session.set as jest.Mock).mockResolvedValueOnce(undefined);
    const result = await VaultUtils.saveValueInVault(VaultKey.__MK, 'mk-value');
    expect(chrome.storage.session.set).toHaveBeenCalledWith({
      vault___MK: 'mk-value',
    });
    expect(result).toBe(true);
  });

  it('removeFromVault removes key and returns true', async () => {
    (chrome.storage.session.remove as jest.Mock).mockResolvedValueOnce(
      undefined,
    );
    const result = await VaultUtils.removeFromVault(VaultKey.__MK);
    expect(chrome.storage.session.remove).toHaveBeenCalledWith('vault___MK');
    expect(result).toBe(true);
  });
});
