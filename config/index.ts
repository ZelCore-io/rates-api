export const config = {
  server: {
    port: 3333,
  },
  cryptoCompareApiKey: '',
  liveCoinWatchApiKey: '',
  coinGeckoApiKey: '',
  coinGeckoUrl: 'https://pro-api.coingecko.com/api/v3/',
  bitPayUrl: 'https://bitpay.com/',
  cryptoCompareUrl: 'https://min-api.cryptocompare.com/',
  liveCoinWatchUrl: 'https://api.livecoinwatch.com/',
  zelCoinsUrl: 'https://raw.githubusercontent.com/ZelCore-io/Zelcore/master/coins.json',
  zelCoinInfoUrl: 'https://raw.githubusercontent.com/ZelCore-io/Zelcore/master/coininfo.json',
  binanceApiUrl: 'https://api.binance.com/',
  binanceAssetUrl: 'https://www.binance.com/',
  // Env kill switch: disabling in production should not require a code
  // change + redeploy. Defaults to enabled when unset.
  bStocksEnabled: (process.env.BSTOCKS_ENABLED ?? '').toLowerCase() !== 'false',
  // How long a failed Binance request (tokenised-asset list / trading-symbol
  // set) is negatively-cached before retrying, so an outage doesn't re-spend
  // the full AxiosWrapper retry budget on every 30s refresh cycle.
  binanceFailureCacheMs: 60 * 1000,
  // How long a bStock's last-known-good price is served after Binance stops
  // pricing it fresh. The outage this exists for (a stock split halt,
  // exchange maintenance) is naturally multi-day, so this is deliberately far
  // longer than the ticker windows themselves.
  bstocksLastGoodMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  // /v2/prices/history is public and each cache miss spends the shared
  // CoinGecko Pro key that the rates refresher depends on, so its upstream
  // use is capped on its own budget (see services/priceHistory.ts). The
  // Analyst plan allows 500 calls/min and 500k credits/month; these caps keep
  // the endpoint to at most 12% of the per-minute limit and ~150k calls a
  // month even under sustained abuse.
  priceHistory: {
    upstreamPerMinute: 60,
    upstreamBurst: 20,
    upstreamPerDay: 5000,
    maxConcurrentUpstream: 4,
    upstreamTimeoutMs: 15 * 1000,
    // Upper bound on cached price points across every coin/currency/day
    // (~55 MB at roughly 56 bytes a point, plus ~200 bytes per day entry).
    cacheMaxPoints: 1_000_000,
    cacheMaxEntries: 200_000,
    notFoundCacheMs: 10 * 60 * 1000,
    emptyDayCacheMs: 60 * 60 * 1000,
    defaultCooldownMs: 60 * 1000,
    maxCooldownMs: 60 * 60 * 1000,
  },
};

export default config;
