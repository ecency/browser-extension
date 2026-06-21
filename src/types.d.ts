declare module 'sscjs';
declare module 'valid-url';

// @ecency/sdk exposes its react-free engine via the "./hive" exports subpath.
// TypeScript 4.7 with moduleResolution "node" doesn't read exports maps, so we
// re-export the shipped types from the internal dist path (classic resolution
// resolves the file directly). Webpack still resolves the real runtime module
// via the package's exports map.
declare module '@ecency/sdk/hive' {
  export * from '@ecency/sdk/dist/browser/hive';
}
declare module '*.svg' {
  import React = require('react');

  export const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}
