# Hive Multi-Wallet Discovery Protocol

**Status:** Draft
**Inspired by:** [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) (Ethereum Multi Injected Provider Discovery)

## Problem

Multiple Hive wallet extensions (Hive Keeper, Hive Keychain, Peak Vault) compete for `window.hive_keychain`. The last extension to inject wins, and users can't choose which wallet to use. DApps have no standard way to detect all available wallets.

## Solution

An event-based announcement protocol where each wallet announces itself independently. DApps collect all announcements and present a wallet chooser to the user.

## Protocol

### Events

| Event | Direction | Payload |
|---|---|---|
| `hive:announceProvider` | Wallet → DApp | `CustomEvent` with `detail: { info, provider }` |
| `hive:requestProvider` | DApp → Wallets | Plain `Event` (no payload) |

### Provider Info (`info`)

| Field | Type | Description |
|---|---|---|
| `uuid` | `string` | Unique identifier per session (UUIDv4). Changes on each page load. |
| `name` | `string` | Human-readable wallet name (e.g., `"Hive Keeper"`, `"Hive Keychain"`, `"Peak Vault"`) |
| `icon` | `string` | Data URI (SVG or PNG) of the wallet icon, square, minimum 96x96 |
| `rdns` | `string` | Reverse domain name identifier, stable across sessions |

### Known `rdns` values

| Wallet | `rdns` |
|---|---|
| Hive Keeper | `com.ecency.keeper` |
| Hive Keychain | `com.hivekeychain` |
| Peak Vault | `com.peakd.vault` |

### Provider Object (`provider`)

The standard Hive signing API with methods like:
- `requestHandshake(callback)`
- `requestBroadcast(account, operations, key, callback)`
- `requestSignBuffer(account, message, key, callback)`
- `requestTransfer(account, to, amount, memo, currency, callback)`
- `requestCustomJson(account, id, key, json, display_msg, callback)`
- etc.

## Wallet Implementation

Each wallet extension's injected page script should:

```javascript
(function () {
  var announceDetail = Object.freeze({
    info: Object.freeze({
      uuid: crypto.randomUUID(),
      name: 'My Wallet Name',
      icon: 'data:image/svg+xml;base64,...',
      rdns: 'com.example.mywallet',
    }),
    provider: myWalletApiObject,
  });

  function announce() {
    window.dispatchEvent(
      new CustomEvent('hive:announceProvider', { detail: announceDetail })
    );
  }

  // Announce on load
  announce();

  // Re-announce when dApps request discovery
  window.addEventListener('hive:requestProvider', announce);
})();
```

`Object.freeze()` prevents tampering by other scripts on the page.

## DApp Implementation

```javascript
const hiveWallets = [];

// Listen for wallet announcements
window.addEventListener('hive:announceProvider', (event) => {
  const { info, provider } = event.detail;

  // Deduplicate by rdns (same wallet re-announcing)
  const existing = hiveWallets.findIndex(w => w.info.rdns === info.rdns);
  if (existing >= 0) {
    hiveWallets[existing] = { info, provider };
  } else {
    hiveWallets.push({ info, provider });
  }
});

// Request all wallets to announce
window.dispatchEvent(new Event('hive:requestProvider'));

// After a short delay, hiveWallets[] contains all installed wallets.
// Present a wallet chooser UI to the user:
//
// hiveWallets.forEach(w => {
//   console.log(w.info.name, w.info.rdns);
//   // w.provider.requestTransfer(...) to use this wallet
// });
```

## Backward Compatibility

Wallets SHOULD continue to set legacy globals for old dApps:
- `window.hive_keychain` — for dApps that check this directly
- `window.hive` — for dApps using the newer convention

The discovery protocol is purely additive. Old dApps that don't use it continue to work via the global variables. New dApps can use the discovery protocol for a better multi-wallet experience.

## FAQ

**Q: What if only one wallet is installed?**
A: The dApp receives one announcement and can auto-select it (no chooser needed).

**Q: What if the user has both Hive Keeper and Hive Keychain?**
A: The dApp receives two announcements and shows a wallet picker. Each wallet's `provider` object works independently.

**Q: Does this affect existing dApp integrations?**
A: No. Existing `window.hive_keychain` checks continue to work. The discovery protocol is opt-in for dApps that want multi-wallet support.
