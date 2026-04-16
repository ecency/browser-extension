# Hive Keeper

Secure browser-extension wallet for the Hive blockchain.

Hive Keeper stores Hive account keys locally (encrypted with a master password) and signs operations on demand. It exposes a `window.hive` API to dApps so they can request transfers, votes, custom JSON, and other Hive operations without ever touching the user's keys.

## Build locally

#### Clone the repository

```bash
git clone https://github.com/ecency/browser-extension
cd browser-extension
```

#### Install dependencies

```bash
npm install
```

#### Run the dev server

```bash
npm run dev
```

This builds both browsers and watches for changes. The output goes to `dist-dev/` (Chromium) and `dist-dev-firefox/` (Firefox). To target a single browser, use `npm run dev:chromium` or `npm run dev:firefox`.

#### Make a production build

```bash
npm run build
```

Outputs land in `dist-prod/` and `dist-prod-firefox/`. Single-browser variants: `npm run build:chromium`, `npm run build:firefox`.

#### Load the build

##### Chromium

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Load unpacked → select the `dist-dev/` folder

After background-script changes, reload the extension.

##### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Load Temporary Add-on → select `dist-dev-firefox/manifest.json`

After background-script changes, reload the extension.

## dApp integration

dApps interact with the extension through `window.hive`. To detect availability:

```js
const api = window.hive;
if (api) {
  api.requestHandshake(() => console.log('Hive Keeper installed'));
}
```

If you previously integrated with Hive Keychain (`window.hive_keychain`), add a fallback:

```js
const api = window.hive || window.hive_keychain;
```

Method shapes (`requestBroadcast`, `requestSignBuffer`, `requestCustomJson`, etc.) are unchanged.

## License

MIT
