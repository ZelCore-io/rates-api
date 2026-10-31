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
  // priceHistory's, per process.
  //
  // Expected load, worst case. Two rates-api hosts share one CoinGecko key
  // (the other domains are mirrors of them), each with its own cache; two
  // explorers per coin, never inside one another's cache window. Each
  // explorer polls every periodSeconds (60 s bitcoin, 900 s the others) with
  // one simple/price plus market_chart days=1 and days=90 (usd), and once a
  // day, after 01:00 UTC, asks for the daily series in its ~46 quote
  // currencies. Caches: simple/price 5 min, days=1 15 min, days=90 6 h.
  // - bitcoin: 288 + 96 + 4 = ~390 calls a day per host, ~780 for both;
  // - 15 other CoinGecko coins at 900 s: price and days=1 can miss on every
  //   poll (2 x 96 each), days=90 at most 4 per host = ~390 a day each,
  //   ~5,850 for all;
  // - daily series: (16 CoinGecko coins + the frozen pre-`since` history of
  //   2 fallback coins) x 46 currencies = ~830 a day per host, ~1,660 for
  //   both, the same for the one-time backfill (days=max is the same call);
  // - fallback coins (groestlcoin, bitcoin-gold) cost no CoinGecko call but
  //   those daily histories: bitcoin's price is shared with the bitcoin
  //   explorer's.
  // That is ~8.3k a day, ~250k a month for the key. If all of it reaches one
  // host it is ~7.1k a day there. Budget on the Analyst plan (500/min, ~500k
  // credits a month, shared with the rates refresher and priceHistory, up to
  // ~150k), per process:
  // - CoinGecko Pro: 7,800/day (~10% headroom over one host taking it all;
  //   the bucket also refills 1/11.1 s, so a day's worth is never spendable in
  //   a burst), 100/min with burst 40: the 01:00 UTC wave of ~600 daily series
  //   clears in ~6 minutes, and any 60 s window is at most 140 calls, <=28% of
  //   the plan. The ids are an allowlist and every answer is cached, so abuse
  //   (varying vs on charts) can't go past these caps; both hosts sustained at
  //   the cap are 470k credits a month;
  // - CoinPaprika free (no key, 20k calls/month): 600/day (burst 30). The two
  //   fallback coins cost ~240 a day each in the worst case (ticker 10 min
  //   against a 900 s poll: 2 x 96; hourly 30 min: 48; daily: 1), 480 in
  //   total, ~14.5k a month.
  // A spent budget, a full concurrency slot or a cooldown after an upstream
  // 429 answers 429 + Retry-After: Blockbook only backs off on 429.
  blockbookMirror: {
    // The only ids the mirror serves (the explorers' coins); anything else is
    // a 404 before any upstream call, so no caller can spend the budget on
    // ids the explorers don't need. Each must also be a CoinGecko id ZelCore
    // lists (`isSupportedId`, checked by the tests).
    coins: [
      'bitcoin', 'groestlcoin', 'litecoin', 'zcash', 'digibyte', 'dogecoin', 'dash', 'vertcoin', 'ravencoin', 'ethereum-classic', 'bitcoin-cash', 'bitcoin-gold', 'clore-ai', 'zcoin', 'zclassic', 'zero', 'bitcoinz', 'komodo',
    ] as string[],
    coinGecko: { perMinute: 100, burst: 40, perDay: 7_800 },
    coinPaprika: { perDay: 600, burst: 30 },
    // Per provider.
    // 26 explorers hit the cold caches together after 01:00 UTC and Blockbook
    // waits 60 s on any 429, so 4 slots would stretch the daily wave to hours.
    maxConcurrentUpstream: 8,
    // CoinPaprika request timeout. CoinGecko calls reuse the zero-retry
    // price-history client and its priceHistory.upstreamTimeoutMs.
    upstreamTimeoutMs: 15 * 1000,
    // Full daily series per (id, vs), bounded by total point count (an
    // entry's size is its point count + 1, ~85 B per point): ~220 MB. The 13
    // coins' full histories (~50k points per currency, bitcoin 4.9k, clore-ai
    // under 1k) in 46 currencies are ~2.3M points; a smaller cap would evict
    // series that are asked again within the day and be re-bought from
    // CoinGecko.
    dailySeriesMaxPoints: 2_600_000,
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
    // through Bitcoin's price. groestlcoin: CoinGecko's last weeks miss 17
    // days that CoinPaprika has, so the cut-over is before them.
    fallbacks: {
      groestlcoin: { coinpaprikaId: 'grs-groestlcoin', since: '2026-07-20' },
      // CoinGecko's price froze at $0.2338 on 2026-07-27 (13:25 UTC); the
      // 07-27 point is its last, so CoinPaprika (live) takes over on that day.
      'bitcoin-gold': { coinpaprikaId: 'btg-bitcoin-gold', since: '2026-07-27' },
    } as Record<string, { coinpaprikaId: string; since: string }>,
  },
  coinPaprikaUrl: 'https://api.coinpaprika.com/v1/',
};

export default config;
