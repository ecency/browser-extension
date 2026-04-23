// Content script interfacing the website and the extension
/* istanbul ignore file */
import { DialogCommand } from '@reference-data/dialog-message-key.enum';
import schemas, {
  commonRequestParams,
} from 'src/content-scripts/web-interface/input-validation';
import {
  cancelPreviousRequest,
  sendIncompleteDataResponse,
  sendRequestToBackground,
  sendResponse,
} from 'src/content-scripts/web-interface/response.logic';
import { KeychainRequest } from 'src/interfaces/keychain.interface';
import Logger from 'src/utils/logger.utils';
if (window.chrome) {
  //@ts-ignore
  window.chrome.storage = undefined;
}

let req: KeychainRequest | null = null;

// Hydration-safe extension detection for dApps — avoids SSR/Next.js
// hydration issues by setting the marker at most once per page.
if (!(window as any).hive_extension) {
  (window as any).hive_extension = true;
  window.dispatchEvent(new Event('hive-loaded'));
}

// Injecting the page-level `window.hive` API
const setupInjection = () => {
  try {
    var scriptTag = document.createElement('script');
    scriptTag.src = chrome.runtime.getURL('./hive.js');
    var container = document.head || document.documentElement;
    container.insertBefore(scriptTag, container.children[0]);
  } catch (e) {
    Logger.error('Hive injection failed.', e);
  }
};
setupInjection();
// Answering the handshakes (both new and legacy message types)
document.addEventListener('swHandshake_hive', () => {
  window.postMessage({ type: 'hive_handshake' }, window.location.origin);
  window.postMessage({ type: 'hive_keychain_handshake' }, window.location.origin);
});

// Answering the requests
type KeychainRequestWrapper = {
  detail: KeychainRequest;
};
document.addEventListener('swRequest_hive', (request: object) => {
  const detail = (request as KeychainRequestWrapper).detail;

  // When extension_id is present, only process events meant for Keeper.
  // Events without extension_id are legacy (from dApps or Keychain's page script)
  // and should be processed for backward compatibility.
  const extId = (detail as any).extension_id;
  if (extId && extId !== 'keeper') return;

  const prevReq = req;
  req = detail;
  const validation = validateRequest(req);
  const { error, value } = validation;
  if (!error) {
    sendRequestToBackground(value, chrome);
    if (prevReq) {
      cancelPreviousRequest(prevReq);
    }
  } else {
    sendIncompleteDataResponse(value!, error);
    req = prevReq;
  }
});

// Get notification from the background upon request completion and pass it back to the dApp.
chrome.runtime.onMessage.addListener(function (obj, sender, sendResp) {
  if (obj.command === DialogCommand.ANSWER_REQUEST) {
    sendResponse(obj.msg);
    req = null;
  }
});

// Request validation
const validateRequest = (req: KeychainRequest) => {
  if (!req) return { value: req, error: 'Missing request.' };
  if (!req.type) return { value: req, error: 'Missing request type.' };
  //@ts-ignore
  return schemas[req.type].append(commonRequestParams).validate(req);
};
