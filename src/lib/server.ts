import express, { Express } from 'express';
import morgan from 'morgan';
import cors from 'cors';

// If you have route handlers written in TypeScript, import them like this:
import routes from '../routes';

const nodeEnv: string | undefined = process.env.NODE_ENV;

const app: Express = express();

if (nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

app.use(cors());

routes(app);

export default app;
