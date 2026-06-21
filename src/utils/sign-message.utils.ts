import { PrivateKey } from '@ecency/sdk/hive';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Signs an arbitrary message the same way hive-js `Signature.signBuffer` did:
 * sha256 the buffer (utf8 bytes for a plain string), then sign that digest with
 * @ecency/sdk.
 *
 * `message` may be a plain string or a JSON-serialised Node Buffer
 * (`{ type: 'Buffer', data: number[] }`); the latter is revived before hashing.
 *
 * Bytes are passed as Uint8Array/TextEncoder rather than a Node Buffer because
 * @noble validates `instanceof Uint8Array`, which a Buffer can fail across
 * realms. The resulting signature is canonical and valid (it recovers the
 * signer's public key) but is not byte-identical to the previous library's
 * output, which is fine because signBuffer results are verified, not compared
 * byte-for-byte.
 *
 * Shared by the background sign-buffer op and the popup HiveUtils so the
 * realm-handling stays in one place (SW-safe: only @ecency/sdk + @noble).
 */
export const signMessage = (message: string, privateKey: string): string => {
  let buf: Buffer | string;
  try {
    const o = JSON.parse(message, (_k, v) => {
      if (
        v !== null &&
        typeof v === 'object' &&
        'type' in v &&
        v.type === 'Buffer' &&
        'data' in v &&
        Array.isArray(v.data)
      ) {
        return Buffer.from(v.data);
      }
      return v;
    });
    buf = Buffer.isBuffer(o) ? o : message;
  } catch (e) {
    buf = message;
  }
  const bytes =
    typeof buf === 'string'
      ? new TextEncoder().encode(buf)
      : new Uint8Array(buf);
  return PrivateKey.fromString(privateKey).sign(sha256(bytes)).customToString();
};
