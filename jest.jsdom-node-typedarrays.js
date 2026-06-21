const { TestEnvironment: JSDOMEnvironment } = require('jest-environment-jsdom');

// jsdom ships its own TypedArray/ArrayBuffer constructors. Libraries that
// validate `instanceof Uint8Array` (e.g. @noble, used by @ecency/sdk for
// crypto) then fail in tests, because values created by Node code aren't
// instances of jsdom's Uint8Array. This environment runs in the Node realm, so
// its global TypedArrays are Node's - copy them into the jsdom global so
// crypto behaves the same as it does in the real extension.
module.exports = class JSDOMNodeTypedArrays extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context);
    const names = [
      'ArrayBuffer',
      'SharedArrayBuffer',
      'DataView',
      'Uint8Array',
      'Uint8ClampedArray',
      'Uint16Array',
      'Uint32Array',
      'Int8Array',
      'Int16Array',
      'Int32Array',
      'Float32Array',
      'Float64Array',
      'BigInt64Array',
      'BigUint64Array',
    ];
    for (const n of names) {
      if (globalThis[n]) this.global[n] = globalThis[n];
    }
  }
};
