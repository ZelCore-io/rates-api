**rates-api v3.0.0** • [**Docs**](modules.md)

***

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
