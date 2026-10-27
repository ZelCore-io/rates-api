import apicache from 'apicache';
import expressPrometheusMiddleware from 'express-prometheus-middleware';
import express, { Request, Response, Application } from 'express';
import apiService from './services/apiServices';

const cache = apicache.middleware;

// Cache-gate for endpoints that can 404/502: without it apicache would happily
// serve a transient upstream failure for the full TTL.
const onlyOk = (req: Request, res: Response): boolean => res.statusCode === 200;

/**
 * Configures the Express application by setting up routes, middleware, and caching.
 *
 * @param app - The Express application instance.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import configureApp from './app';
 *
 * const app = express();
 * configureApp(app);
 *
 * app.listen(3000, () => {
 *   console.log('Server is running on port 3000');
 * });
 * ```
 */
export default (app: Application): void => {
  // Add the Prometheus middleware for monitoring
  app.use(
    expressPrometheusMiddleware({
      metricsPath: '/metrics',
      collectDefaultMetrics: true,
      requestDurationBuckets: [0.1, 0.5, 1, 1.5],
    }),
  );

  /**
   * Health check endpoint
   */
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  /**
   * Redirects the root path to the /rates endpoint.
   *
   * @route GET /
   */
  app.get('/', (req: Request, res: Response) => {
    res.redirect('/rates');
  });

  /**
   * Retrieves exchange rates.
   *
   * @route GET /rates
   * @cache 30 seconds
   */
  app.get('/rates', cache('30 seconds'), (req: Request, res: Response) => {
    apiService.getRates(req, res);
  });

  /**
   * Retrieves market data in USD.
   *
   * @route GET /marketsusd
   * @cache 30 seconds
   */
  app.get('/marketsusd', cache('30 seconds'), (req: Request, res: Response) => {
    apiService.getMarketsUsd(req, res);
  });

  /**
   * Retrieves version 2 of the exchange rates.
   *
   * @route GET /v2/rates
   * @cache 30 seconds
   */
  app.get('/v2/rates', cache('30 seconds'), (req: Request, res: Response) => {
    apiService.getRatesV2(req, res);
  });

  /**
   * Retrieves compressed version 2 of the exchange rates.
   *
   * @route GET /v2/rates-compressed
   * @cache 30 seconds
   */
  app.get('/v2/rates-compressed', cache('30 seconds'), (req: Request, res: Response) => {
    apiService.getRatesV2Compressed(req, res);
  });

  /**
   * Retrieves USD price history for one bStock, shaped like CoinGecko's
   * market_chart response: `{prices: [[epochMs, price], ...]}`.
   *
   * @route GET /v2/bstocks/history/:code?days=30
   * @cache 10 minutes (successful responses only)
   */
  app.get('/v2/bstocks/history/:code', cache('10 minutes', onlyOk), (req: Request, res: Response) => {
    apiService.getBstockHistory(req, res);
  });

  /**
   * Retrieves one coin's fiat price history between two unix timestamps, for
   * wallet tax exports: `{prices: [[epochMs, price], ...], granularity, segments}`.
   * Backed by a bounded per-day cache and its own upstream budget in
   * `services/priceHistory`. There is no per-IP limiter in this app; the
   * upstream budget is the bound on what one client can spend.
   *
   * Deliberately no route-level apicache: it keys on the full URL with no
   * size bound, so shifting `to` by a second per request retained ~177 KB
   * per entry (~1 GB after 3k requests) with zero upstream calls. A warm
   * request costs 1-2 ms from the day cache anyway.
   *
   * @route GET /v2/prices/history/:geckoId?vs=eur&from=<unix s>&to=<unix s>
   */
  app.get('/v2/prices/history/:geckoId', (req: Request, res: Response) => {
    apiService.getPriceHistory(req, res);
  });

  /**
   * CoinGecko v3 subset for Blockbook's fiat downloader (`fiat_rates_params`
   * `url`/`tipUrl` = .../v2/blockbook/api/v3), so explorers need no
   * CoinGecko key. Same response shapes as CoinGecko; only ids ZelCore lists;
   * a spent upstream budget is a 429 + Retry-After. Coins CoinGecko dropped
   * are priced from CoinPaprika. See `services/blockbookMirror`.
   *
   * No route-level apicache, as for /v2/prices/history: the service keeps
   * bounded caches of its own, and failures must never be cached.
   *
   * @route GET /v2/blockbook/api/v3/simple/supported_vs_currencies
   * @route GET /v2/blockbook/api/v3/simple/price?ids=a,b&vs_currencies=x,y
   * @route GET /v2/blockbook/api/v3/coins/:id/market_chart?vs_currency=x&days=N|max[&interval=daily]
   */
  app.get('/v2/blockbook/api/v3/simple/supported_vs_currencies', (req: Request, res: Response) => {
    apiService.getBlockbookSupportedVs(req, res);
  });
  app.get('/v2/blockbook/api/v3/simple/price', (req: Request, res: Response) => {
    apiService.getBlockbookSimplePrice(req, res);
  });
  app.get('/v2/blockbook/api/v3/coins/:id/market_chart', (req: Request, res: Response) => {
    apiService.getBlockbookMarketChart(req, res);
  });

  /**
   * Retrieves found contracts.
   *
   * @route GET /v2/found-contracts
   * @cache 30 seconds
   */
  app.get('/v2/found-contracts', cache('30 seconds'), (req: Request, res: Response) => {
    res.json(apiService.getFoundContracts());
  });

  // Parse incoming JSON requests with a limit of 50kb
  app.use(express.json({ limit: '50kb' }));

  /**
   * Checks contracts and updates the store.
   *
   * @route POST /v2/check-contracts
   * @param req - The Express request object.
   * @param res - The Express response object.
   */
  app.post('/v2/check-contracts', (req: Request, res: Response) => {
    apiService.checkContractsV2(req, res);
  });
};
