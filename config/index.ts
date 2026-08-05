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
};

export default config;