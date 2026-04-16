import { HiveEngineConfig } from '@interfaces/hive-engine-rpc.interface';
const Config = {
  hiveEngine: {
    mainnet: 'ssc-mainnet-hive',
    accountHistoryApi: 'https://history.hive-engine.com/',
    rpc: 'https://api.hive-engine.com/rpc',
    maxSpread: 100,
  } as HiveEngineConfig,
  claims: {
    FREQUENCY: +(process.env.DEV_CLAIM_FREQUENCY || 10),
    freeAccount: {
      MIN_RC_PCT: +(process.env.DEV_CLAIM_ACCOUNT_RC_PCT || 85),
      MIN_RC: +(process.env.DEV_CLAIM_ACCOUNT_MIN_RC || 9484331370472),
    },
    savings: {
      delay: +(process.env.DEV_CLAIM_SAVINGS_DELAY || 30),
    },
  },
  autoStakeTokens: {
    FREQUENCY: +(process.env.DEV_CLAIM_FREQUENCY || 10),
  },
  KEYCHAIN_PROPOSAL: 341,
  PROPOSAL_MIN_VOTE_DIFFERENCE_HIDE_POPUP: 8 * 10 ** 6,
  MIN_LOADING_TIME: 1000,
  rpc: {
    DEFAULT: { uri: 'https://api.hive.blog', testnet: false },
  },
  governanceReminderDelayInSeconds: 30 * 24 * 3600, //days
  loader: {
    minDuration: process.env.NODE_ENV === 'test' ? 0 : 1000,
  },
  transactions: {
    expirationTimeInMinutes: 10,
  },
  witnesses: {
    feedWarningLimitInHours: 5,
  },
  keyless: {
    host: process.env.KEYLESS_HOST || 'https://hive-auth.arcange.eu/',
  },
  vault: {
    portName: 'vault-connection',
  },
};

export default Config;
