import { Memo, PrivateKey, Signature } from '@ecency/sdk/hive';
import { sha256 } from '@noble/hashes/sha256';

// Crypto parity gate for the @hiveio/hive-js -> @ecency/sdk migration.
//
// HIVEJS_FIXTURE.encoded is a memo that was encrypted by @hiveio/hive-js (the
// previous library). The decode test below proves @ecency/sdk can still open
// memos produced by the old library, so existing encrypted memos keep working.
// To regenerate: encode HIVEJS_FIXTURE.plaintext for HIVEJS_FIXTURE.pub with
// `@hiveio/hive-js`'s `memo.encode(wif, pub, plaintext)`.
const HIVEJS_FIXTURE = {
  wif: '5JsmesSHSG38UQa9LyHz8Pr6iTJ7ZnD3SstBL7vhiheYCa6z7kV',
  pub: 'STM7ziHYdPzH7fiSSzBtLTHx7jstmfZdM7PHbWqeWVdo8uc5SNcRU',
  plaintext: '#Keeper 3.18.0 memo interop fixture - éü 漢字',
  encoded:
    '#3dy2dHbxcWVxeQC69CJuJ1CMULwr6KdxKeYAfv5r6aXxNNwCo27MTrAohEFR4BAErHLuJFFSiKZ8dkgT5svpKZNPUrmWULhZ9gmY6GXQNxNW5QmCkk8XiFVg8C5XYfamgU8BBMmMB19JzwemVcgTEb25zdmMJrVc6rMqyFVVGZhgfEspFAZywd6zHbvKvdxM2dc',
};

describe('@ecency/sdk crypto parity (hive-js migration)', () => {
  it('decodes a memo that @hiveio/hive-js encoded (backward compatible)', () => {
    expect(Memo.decode(HIVEJS_FIXTURE.wif, HIVEJS_FIXTURE.encoded)).toBe(
      HIVEJS_FIXTURE.plaintext,
    );
  });

  it('round-trips memo encode/decode', () => {
    const msg = '#round trip secret 123';
    const enc = Memo.encode(HIVEJS_FIXTURE.wif, HIVEJS_FIXTURE.pub, msg);
    expect(enc.startsWith('#')).toBe(true);
    expect(Memo.decode(HIVEJS_FIXTURE.wif, enc)).toBe(msg);
  });

  it('signBuffer yields a valid signature that recovers the signing key', () => {
    // @ecency/sdk signatures are non-deterministic, so verify validity (the
    // signature recovers the signer's public key) rather than a fixed value.
    const priv = PrivateKey.fromString(HIVEJS_FIXTURE.wif);
    const digest = sha256(
      new TextEncoder().encode('keychain requestSignBuffer message'),
    );
    const sig = priv.sign(digest).customToString();
    expect(sig).toHaveLength(130);
    const recovered = Signature.from(sig).getPublicKey(digest).toString();
    expect(recovered).toBe(priv.createPublic().toString());
  });
});
