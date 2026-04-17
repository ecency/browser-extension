# Hive Keeper

Secure browser-extension wallet for the Hive blockchain.

Hive Keeper stores Hive account keys locally (encrypted with a master password) and signs operations on demand. It exposes a `window.hive` API to dApps so they can request transfers, votes, custom JSON, and other Hive operations without ever touching the user's keys.

## Credits

Hive Keeper is a fork of [Hive Keychain](https://github.com/hive-keychain/hive-keychain-extension), originally created by [@stoodkev](https://peakd.com/@stoodkev) and the Hive Keychain team. We are grateful to the original authors and contributors for building the foundation that Hive Keeper builds upon.

This fork is maintained by [Ecency](https://ecency.com) under the MIT license.

## Build locally

```bash
git clone https://github.com/ecency/browser-extension
cd browser-extension
npm install
```

### Dev server

```bash
npm run dev
```

Builds both Chromium (`dist-dev/`) and Firefox (`dist-dev-firefox/`) and watches for changes. Single-browser: `npm run dev:chromium` or `npm run dev:firefox`.

### Production build

```bash
npm run build
```

Outputs: `dist-prod/` (Chromium), `dist-prod-firefox/` (Firefox).

### Load in browser

**Chromium:** `chrome://extensions` → Developer mode → Load unpacked → `dist-dev/`

**Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → `dist-dev-firefox/manifest.json`

## dApp integration

```js
const api = window.hive;
if (api) {
  api.requestHandshake(() => console.log('Hive Keeper installed'));
}
```

If migrating from Hive Keychain:

```js
const api = window.hive || window.hive_keychain;
```

Method shapes (`requestBroadcast`, `requestSignBuffer`, `requestCustomJson`, etc.) are unchanged.

## Terms and Privacy

Hive Keeper is open-source software provided under the [MIT License](LICENSE). The extension stores all private keys locally on your device, encrypted with your master password. No keys or personal data are transmitted to any server.

By using this extension you acknowledge that you are solely responsible for the security of your keys and passwords. The developers of Hive Keeper and Ecency are not liable for any loss of funds.

For questions or security reports, please open an issue at https://github.com/ecency/browser-extension/issues or email security@ecency.com.

## License

MIT
