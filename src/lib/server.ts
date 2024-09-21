import express, { Express } from 'express';
import morgan from 'morgan';
import cors from 'cors';

// If you have route handlers written in TypeScript, import them like this:
import routes from '../routes';

/**
 * The current Node environment, typically 'development', 'production', or 'test'.
 */
const nodeEnv: string | undefined = process.env.NODE_ENV;

/**
 * The main Express application instance.
 *
 * @remarks
 * This instance is configured with middleware and routes and is exported for use in the server.
 *
 * @example
 * ```typescript
 * import app from './server';
 *
 * const port = process.env.PORT || 3000;
 *
 * app.listen(port, () => {
 *   console.log(`Server is running on port ${port}`);
 * });
 * ```
 */
const app: Express = express();

// Use morgan for HTTP request logging in non-test environments
if (nodeEnv !== 'test') {
  /**
   * HTTP request logger middleware using 'morgan'.
   *
   * @remarks
   * The 'combined' format outputs the Apache combined log format.
   */
  app.use(morgan('combined'));
}

/**
 * Cross-Origin Resource Sharing (CORS) middleware.
 *
 * @remarks
 * Enables CORS for all routes by default.
 *
 * @see https://github.com/expressjs/cors
 */
app.use(cors());

/**
 * Registers application routes.
 *
 * @remarks
 * The 'routes' function is responsible for setting up all the routes for the application.
 *
 * @param app - The Express application instance.
 *
 * @example
 * ```typescript
 * // In routes/index.ts
 * export default function routes(app: Express) {
 *   app.get('/api', (req, res) => {
 *     res.send('API is working');
 *   });
 * }
 * ```
 */
routes(app);

export default app;
