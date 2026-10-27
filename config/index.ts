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
  // /v2/blockbook/api/v3 serves the CoinGecko v3 subset Blockbook's fiat
  // downloader calls (see services/blockbookMirror.ts). It is public and
  // unauthenticated, so each upstream gets its own budget, separate from
  // priceHistory's, per process:
  // - CoinGecko Pro: 30/min (burst 10) and 3000/day, at most ~6% of the
  //   Analyst plan's 500/min and ~90k credits a month at sustained abuse;
  // - CoinPaprika free (no key, 20k calls/month): 600/day (burst 30), ~18k a
  //   month at sustained abuse. Normal use is ~200/day per fallback coin.
  // A spent budget, a full concurrency slot or a cooldown after an upstream
  // 429 answers 429 + Retry-After: Blockbook only backs off on 429.
  blockbookMirror: {
    // The only ids the mirror serves (the explorers' coins); anything else is
    // a 404 before any upstream call, so no caller can spend the budget on
    // ids the explorers don't need.
    coins: ['bitcoin', 'groestlcoin'] as string[],
    coinGecko: { perMinute: 30, burst: 10, perDay: 3000 },
    coinPaprika: { perDay: 600, burst: 30 },
    // Per provider.
    maxConcurrentUpstream: 4,
    // CoinPaprika request timeout. CoinGecko calls reuse the zero-retry
    // price-history client and its priceHistory.upstreamTimeoutMs.
    upstreamTimeoutMs: 15 * 1000,
    // Full daily series per (id, vs), bounded by total point count (an
    // entry's size is its point count + 1, ~85 B per point): ~42 MB. Bitcoin
    // plus one fallback coin in 47 currencies is ~440k points.
    dailySeriesMaxPoints: 500_000,
    // Pass-through market_chart (days 1 or 90) responses, by point count.
    chartCacheMaxPoints: 200_000,
    notFoundCacheMs: 10 * 60 * 1000,
    // After a failed supported_vs_currencies refresh the last good (or
    // static) list is served this long before CoinGecko is asked again.
    supportedVsRetryMs: 5 * 60 * 1000,
    defaultCooldownMs: 60 * 1000,
    maxCooldownMs: 60 * 60 * 1000,
    maxIds: 10,
    maxVsCurrencies: 60,
    // Coins CoinGecko stopped tracking. Their history up to the day before
    // `since` (UTC date) still comes from CoinGecko; from `since` on, and for
    // current and intraday prices, from CoinPaprika's USD quote converted
    // through Bitcoin's price.
    fallbacks: {
      groestlcoin: { coinpaprikaId: 'grs-groestlcoin', since: '2026-08-12' },
    } as Record<string, { coinpaprikaId: string; since: string }>,
  },
  coinPaprikaUrl: 'https://api.coinpaprika.com/v1/',
};

export default config;
