import apicache from 'apicache';
import expressPrometheusMiddleware from 'express-prometheus-middleware';
import express, { Request, Response, Application } from 'express';
import apiService from './services/apiServices';

const cache = apicache.middleware;

export default (app: Application): void => {
  // Add the Prometheus middleware
  app.use(
    expressPrometheusMiddleware({
      metricsPath: '/metrics',
      collectDefaultMetrics: true,
      requestDurationBuckets: [0.1, 0.5, 1, 1.5],
    })
  );

  app.get('/', (req: Request, res: Response) => {
    res.redirect('/rates');
  });

  app.get('/rates', cache('30 seconds'), (req: Request, res: Response) => {
    apiService.getRates(req, res);
  });

  app.get('/marketsusd', cache('30 seconds'), (req: Request, res: Response) => {
    apiService.getMarketsUsd(req, res);
  });

  app.get('/v2/rates', cache('30 seconds'), (req: Request, res: Response) => {
    apiService.getRatesV2(req, res);
  });

  app.get('/v2/rates-compressed', cache('30 seconds'), (req: Request, res: Response) => {
    apiService.getRatesV2Compressed(req, res);
  });

  app.get('/v2/found-contracts', cache('30 seconds'), (req: Request, res: Response) => {
    res.json(apiService.getFoundContracts());
  });

  app.use(express.json({ limit: '50kb' }));
  app.post('/v2/check-contracts', (req: Request, res: Response) => {
    apiService.checkContractsV2(req, res);
  });
};
