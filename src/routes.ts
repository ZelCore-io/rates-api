import apicache from 'apicache';
import expressPrometheusMiddleware from 'express-prometheus-middleware';
import express, { Request, Response, Application } from 'express';
import apiService from './services/apiServices';

const cache = apicache.middleware;

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
    })
  );

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
