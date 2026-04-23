# Hive Unified Wallet Protocol

**Status:** Draft proposal for standardization across Hive wallet extensions

## Problem

Three Hive wallet extensions exist today, each with a different global and API:

| Extension | Global | Events |
|---|---|---|
| Hive Keychain | `window.hive_keychain` | `swRequest_hive` / `hive_keychain_response` |
| Hive Keeper | `window.hive` | `swRequest_hive` / `hive_response` |
| Peak Vault | `window.peakvault` | `peak-vault-event` / `peak-vault-response` |

DApps must write extension-specific detection code for each wallet. Users can't easily switch wallets without the dApp supporting it. When multiple extensions share the same event channel (`swRequest_hive`), both respond to every request regardless of which one the user intended.

## Solution

All Hive wallet extensions share **`window.hive`** as the unified namespace. The API methods are the same across all wallets. Each wallet identifies itself with a boolean flag. Event isolation via `extension_id` ensures only the intended wallet processes a request.

## Standard API

All wallets implement these methods on `window.hive`:

```javascript
window.hive.requestHandshake(callback)
window.hive.requestBroadcast(account, operations, key, callback)
window.hive.requestTransfer(account, to, amount, memo, currency, callback)
window.hive.requestCustomJson(account, id, key, json, displayMsg, callback)
window.hive.requestSignBuffer(account, message, key, callback)
window.hive.requestSignTx(account, tx, key, callback)
window.hive.requestVote(account, author, permlink, weight, callback)
window.hive.requestPost(account, title, body, parent_author, parent_permlink, json_metadata, permlink, comment_options, callback)
window.hive.requestDelegation(account, delegatee, amount, unit, callback)
window.hive.requestWitnessVote(account, witness, vote, callback)
window.hive.requestProxy(account, proxy, callback)
// ... and other standard operations
```

## Identity Flags

Each wallet sets a boolean flag on the `window.hive` object:

```javascript
window.hive.isKeeper    // true - Hive Keeper (Ecency)
window.hive.isKeychain  // true - Hive Keychain
window.hive.isVault     // true - Peak Vault
```

## Multi-Wallet Coexistence

When multiple wallet extensions are installed, each registers itself in the `window.hive.providers` array:

```javascript
window.hive.providers = [
  { name: 'Hive Keeper',   rdns: 'com.ecency.keeper',  provider: <api> },
  { name: 'Hive Keychain', rdns: 'com.hivekeychain',   provider: <api> },
  { name: 'Peak Vault',    rdns: 'com.peakd.vault',    provider: <api> },
];
```

The `window.hive` object itself points to whichever wallet loaded last (same as the legacy behavior). DApps that want multi-wallet support check `window.hive.providers`.

## Event Isolation (extension_id)

When multiple wallets share the `swRequest_hive` event channel, each must include an `extension_id` field in the event detail so content scripts can filter requests meant for them.

### Page script (injected JS)

Each wallet's `dispatchCustomEvent` adds its own `extension_id`:

```javascript
dispatchCustomEvent: function (name, data, callback) {
  this.requests[this.current_id] = callback;
  data = Object.assign({
    request_id: this.current_id,
    extension_id: 'keeper',   // 'keeper', 'keychain', etc.
  }, data);
  document.dispatchEvent(new CustomEvent(name, { detail: data }));
  this.current_id++;
},
```

### Content script (event listener)

Each wallet's content script ignores events tagged for a different wallet:

```javascript
document.addEventListener('swRequest_hive', (request) => {
  const detail = request.detail;

  // Only process events meant for this wallet.
  // Events without extension_id are legacy - process for backward compat.
  const extId = detail.extension_id;
  if (extId && extId !== 'keeper') return;  // 'keeper', 'keychain', etc.

  // ... handle request
});
```

### Registered extension_id values

| Wallet | extension_id |
|---|---|
| Hive Keeper | `keeper` |
| Hive Keychain | `keychain` |
| Peak Vault | N/A (uses separate `peak-vault-event` channel) |

### Backward compatibility

- Events **without** `extension_id` (from legacy dApps or older extension versions) are processed by all listening extensions, preserving existing behavior.
- Events **with** `extension_id` are only processed by the matching extension.
- DApps do not need to set `extension_id` themselves - each wallet's page script adds it automatically when its API methods are called.

## DApp Integration

### Simple (works with any single wallet)

```javascript
if (window.hive) {
  window.hive.requestHandshake(() => {
    console.log('Connected to a Hive wallet');
  });
}
```

### With wallet detection

```javascript
if (window.hive) {
  if (window.hive.isKeeper) console.log('Using Hive Keeper');
  if (window.hive.isKeychain) console.log('Using Hive Keychain');
  if (window.hive.isVault) console.log('Using Peak Vault');
}
```

### Multi-wallet picker

```javascript
if (window.hive && window.hive.providers && window.hive.providers.length > 1) {
  // Show wallet chooser UI
  window.hive.providers.forEach(wallet => {
    console.log(`${wallet.name} available`);
    // Call methods on the specific provider - extension_id routing
    // ensures only the correct extension processes the request
    wallet.provider.requestBroadcast(...);
  });
} else if (window.hive) {
  // Only one wallet - use directly
  window.hive.requestBroadcast(...);
}
```

## Wallet Implementation Guide

Each wallet extension should add this to their injected page script:

```javascript
// 1. Create your API object with standard methods
var myWalletApi = {
  requestHandshake: function(cb) { /* ... */ },
  requestBroadcast: function(account, ops, key, cb) { /* ... */ },
  // ... all standard methods
  // dispatchCustomEvent must include extension_id (see Event Isolation above)
};

// 2. Set identity flag
myWalletApi.isMyWallet = true;  // e.g., isKeeper, isKeychain, isVault

// 3. Register on window.hive
if (!window.hive) {
  window.hive = myWalletApi;
}
if (!window.hive.providers) {
  window.hive.providers = [];
}
window.hive.providers.push({
  name: 'My Wallet Name',
  rdns: 'com.example.mywallet',
  provider: myWalletApi,
});

// 4. Legacy compat (optional)
if (typeof window.hive_keychain === 'undefined') {
  window.hive_keychain = myWalletApi;
}
```

## Adoption Status

| Wallet | window.hive | providers[] | Identity flag | extension_id | Status |
|---|---|---|---|---|---|
| Hive Keeper | Yes | Yes (`com.ecency.keeper`) | `isKeeper` | `keeper` | Fully adopted |
| Peak Vault | Yes | Yes (`com.peakd.vault`) | `isVault` | N/A (own events) | Fully adopted |
| Hive Keychain | Pending | Pending | Pending | `keychain` | extension_id added |

## Migration Path

| Phase | What happens |
|---|---|
| **Now** | Hive Keeper and Peak Vault implement the full protocol. Keychain has extension_id isolation. |
| **Next** | Propose to Keychain team to adopt `window.hive` + identity flags + providers registry. |
| **Future** | DApps migrate from `window.hive_keychain` / `window.peakvault` to `window.hive`. |
| **Eventually** | Legacy globals deprecated. All dApps use `window.hive` only. |

## Benefits

- **DApps write one integration** - `window.hive.requestBroadcast(...)` works with any wallet
- **Users can choose** - dApps with `providers[]` support show a wallet picker
- **Wallets don't conflict** - `extension_id` ensures only the selected wallet responds
- **Backward compatible** - legacy globals and events without extension_id still work
- **Extensible** - wallets can add custom methods beyond the standard set
