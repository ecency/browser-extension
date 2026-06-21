const path = require('path');
const ts = require('typescript');
const { pathsToModuleNameMapper } = require('ts-jest');

const tsconfigPath = path.join(__dirname, 'tsconfig.json');
const { config } = ts.readConfigFile(tsconfigPath, ts.sys.readFile);

// Align Jest resolution with tsconfig paths (Jest resolves before ts-jest transform).
// Exclude `react` → @types/react — tests must resolve the real `react` package.
const tsPaths = { ...(config.compilerOptions?.paths || {}) };
delete tsPaths.react;
const fromTsconfigPaths = pathsToModuleNameMapper(tsPaths, {
  prefix: '<rootDir>/',
});

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  setupFiles: ['dotenv/config'],
  preset: 'ts-jest',
  testEnvironment: '<rootDir>/jest.jsdom-node-typedarrays.js', // jsdom + Node TypedArrays (for @noble/@ecency crypto)
  // Resolve package "exports" using node/require conditions instead of jsdom's
  // default "browser", so modern deps (e.g. @ecency/sdk, @noble/*) load their
  // CJS node builds that jest can require, rather than ESM browser builds.
  testEnvironmentOptions: {
    customExportConditions: ['node', 'require', 'default'],
  },
  rootDir: '.',
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
    // @ecency/sdk and its nested @noble/* ship ESM .js; transpile them to CJS
    // for jest (transpile-only, no type-check).
    '^.+\\.(js|cjs|mjs)$': [
      'ts-jest',
      { isolatedModules: true, tsconfig: { allowJs: true } },
    ],
  },
  // By default jest skips node_modules; allow @ecency/sdk + @noble through so
  // the transform above can convert their ESM to CJS.
  transformIgnorePatterns: ['/node_modules/(?!(@ecency/sdk|@noble)/)'],
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: {
    ...fromTsconfigPaths,
    // jsdom resolves @ecency/sdk/hive to its ESM browser build, which jest
    // can't parse from node_modules. Map to the CJS node build for tests (same
    // approach as axios below). Runtime/webpack still use the browser build.
    '^@ecency/sdk/hive$':
      '<rootDir>/node_modules/@ecency/sdk/dist/node/hive.cjs',
    '^axios$': 'axios/dist/node/axios.cjs',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '@ledgerhq/devices/hid-framing': '@ledgerhq/devices/lib/hid-framing',
  },
  modulePaths: ['<rootDir>'],
  collectCoverageFrom: ['<rootDir>/**/*.{ts, tsx}'],
  collectCoverage: false,
  modulePathIgnorePatterns: [
    '<rootDir>/src/__tests__/utils-for-testing/',
    'mocks',
    'othercases',
  ],
  //until here
  //working configuration until here E2E/utils/actions tests.

  //added new config for background section
  setupFilesAfterEnv: ['./jest.setup.js'], //only for jest-chrome
  //end added
};
