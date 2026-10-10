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
  // use is capped on its own budget (see services/priceHistory.ts). Against
  // the Analyst plan (500 calls/min, 500k credits/month), per process:
  // - any 60 s window: at most 80 calls (burst 20 + 60 refill), <=16%;
  // - 5000/day is the daily bucket's refill rate, and the bucket holds 5000,
  //   so any rolling 24 h after an idle spell can reach ~10,000 calls;
  //   sustained abuse settles at 5000/day, ~150k/month.
  priceHistory: {
    upstreamPerMinute: 60,
    upstreamBurst: 20,
    upstreamPerDay: 5000,
    maxConcurrentUpstream: 4,
    upstreamTimeoutMs: 15 * 1000,
    // Day-cache bounds. A day entry's size is its point count + 1, so
    // cacheMaxSize caps points + entries together. Measured cost is ~360 B
    // per entry plus ~85 B per point; the worst fill is every entry at the
    // cap with the remaining size as points: 150k x 360 B + 550k x 85 B
    // = ~101 MB (96 MiB). All-hourly (25 per day) is ~28k days, ~67 MB;
    // all-daily (2 per day) hits the entry cap first, ~67 MB.
    cacheMaxSize: 700_000,
    cacheMaxEntries: 150_000,
    notFoundCacheMs: 10 * 60 * 1000,
    emptyDayCacheMs: 60 * 60 * 1000,
    defaultCooldownMs: 60 * 1000,
    maxCooldownMs: 60 * 60 * 1000,
  },
};

export default config;
