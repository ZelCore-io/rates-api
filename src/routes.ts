import apicache from 'apicache';
import { Request, Response, Application } from 'express';
import apiService from './services/apiServices';

const cache = apicache.middleware;

export default (app: Application): void => {
  app.get('/', (req: Request, res: Response) => {
    res.redirect('/rates');
  });

  app.get('/rates', cache('30 seconds'), (req: Request, res: Response) => {
    apiService.getRates(req, res);
  });

  // Uncomment if needed
  // app.get('/markets', cache('30 seconds'), (req: Request, res: Response) => {
  //   apiService.getMarkets(req, res);
  // });

  app.get('/marketsusd', cache('30 seconds'), (req: Request, res: Response) => {
    apiService.getMarketsUsd(req, res);
  });
};
