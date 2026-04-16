import Logger from 'src/utils/logger.utils';

const BAD_ACTORS_URL =
  'https://raw.githubusercontent.com/openhive-network/watchmen/main/output/flat/badactors.txt';

const BUNDLED_BLACKLISTED_DOMAINS_PATH = 'data/blacklisted-domains.json';

const getPhishingAccounts = async (): Promise<string[]> => {
  try {
    const res = await fetch(BAD_ACTORS_URL, { cache: 'no-cache' });
    if (!res.ok) return [];
    const text = await res.text();
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
  } catch (err) {
    Logger.error('Failed to fetch phishing accounts list', err);
    return [];
  }
};

const getBlacklistedDomains = async (): Promise<string[]> => {
  try {
    const res = await fetch(
      chrome.runtime.getURL(BUNDLED_BLACKLISTED_DOMAINS_PATH),
    );
    if (!res.ok) return [];
    return (await res.json()) as string[];
  } catch (err) {
    Logger.error('Failed to load bundled blacklisted domains', err);
    return [];
  }
};

const PhishingUtils = {
  getPhishingAccounts,
  getBlacklistedDomains,
};

export default PhishingUtils;
