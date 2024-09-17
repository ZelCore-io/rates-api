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

  app.get('/marketsusd', cache('30 seconds'), (req: Request, res: Response) => {
    apiService.getMarketsUsd(req, res);
  });

  app.get('/v2/rates', cache('30 seconds'), (req: Request, res: Response) => {
    apiService.getRatesV2(req, res);
  });

  app.get('/v2/rates-compressed', cache('30 seconds'), (req: Request, res: Response) => {
    apiService.getRatesV2Compressed(req, res);
  });
};
