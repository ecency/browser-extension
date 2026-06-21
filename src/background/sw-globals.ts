// MUST be the FIRST import of the background service-worker entry.
//
// Service workers expose `self`/`globalThis` but not `window`/`global`. Some
// bundled libraries decide capabilities at MODULE-EVALUATION time by checking
// `typeof window` - notably @hiveio/hive-js's WebSocket transport, which does
// `else if (typeof window !== 'undefined') WebSocket = window.WebSocket; else
// throw new Error("Couldn't decide on a `WebSocket` class")`. If `window` is
// missing it throws during import, which aborts the whole service-worker script
// evaluation, so the worker never registers (no popup, sign requests hang).
//
// This aliasing CANNOT live as inline code at the top of index.ts: ES module
// imports are hoisted and evaluated before the importing module's body, so
// hive-js would be imported (and throw) before the inline alias runs. Putting
// the alias in its own module that is imported first guarantees it executes
// before any dependency that pulls in hive-js.
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (typeof (globalThis as any).global === 'undefined') {
  (globalThis as any).global = globalThis;
}

export {};
