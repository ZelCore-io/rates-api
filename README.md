# zelcore-rates-api

A Service that supplies rates and market conversion for ZelCore assets to other currencies

## Requirements

Requires node version 10.0 and above

## Installation

Install npm dependencies with command:

```bash
npm install
```

## Usage

Start the service with command:

```bash
npm start
```

After the service has been started, you should be able to browse to it on port 3333.
Example: http://localhost:3333/rates

## Docker

```bash
docker run -e API_KEY=yourApiKey -p 4444:3333 zelcash/rates-api
```

## bStocks (Binance tokenized equities)

`GET /v2/rates` emits one synthetic `crypto` entry per Binance bStock — a
tokenized US equity on BNB Smart Chain (e.g. `bstock-tslab` for Tesla). Prices
come straight from Binance's public Spot API (no API key required):

- Universe: the intersection of Binance's tokenised-asset list
  (`GET https://www.binance.com/bapi/asset/v2/public/asset/asset/get-tokenised-asset`,
  filtered to assets with a BSC contract) with Spot symbols currently in
  `TRADING` status — about 56 of the ~66 listed assets qualify today.
- Quote currency: **USDT**, not USDC — verified live, no USDC pairs exist for
  these symbols.
- `rates.usd` = `<CODE>USDT` last price; `rates.btc` = that price divided by
  `BTCUSDT` from the same ticker batch (same venue, no cross-venue basis).
  `change24h`/`change7d` come from Binance's 24h ticker and 7d rolling-window
  ticker respectively.
- `provider` is always the literal string `"coingecko"`, never `"binance"`.
  The ZelCore client keys its market store on `${provider}-${id}` and the
  sibling `api` repo advertises each bStock's `coinInfo.coingeckoID` as
  `bstock-<code>`; the two literals only meet if the provider here is exactly
  `"coingecko"`. This is a cross-repo contract — do not change it in
  isolation.
- Binance does **not** omit a halted symbol (e.g. during a stock split) from
  its ticker response — it returns the symbol present with
  `lastPrice: "0.00000000"`. Prices are therefore accepted only when finite
  and strictly positive; a halted/zero-priced symbol keeps serving its last
  known-good price rather than a stale zero or a dropped entry, per the
  bStocks partner guide's "display-only during halts is acceptable" allowance.
- Toggle via `config.bStocksEnabled` (`config/index.ts`).

## Update Documentation

To update typedoc documentation please run.
```bash
npx typedoc
```

## Example .env file

```bash
# API keys for external services
COIN_GECKO_KEY='YOUR_COINGECKO_API_KEY'           # CoinGecko API key (placeholder)
CRYPTO_COMPARE_KEY='YOUR_CRYPTOCOMPARE_API_KEY'   # CryptoCompare API key (placeholder)
LIVE_COIN_WATCH_KEY='YOUR_LIVECOINWATCH_API_KEY'  # LiveCoinWatch API key (placeholder)

# Environment settings
NODE_ENV=development            # Node environment (can be 'development', 'production', or 'test')
BASE_URL=http://localhost:3333  # Base URL for the local development server
```

# Swagger docs at /docs