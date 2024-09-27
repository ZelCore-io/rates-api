import express, { Express } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

// Import route handlers written in TypeScript
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
   * The 'combined' format outputs the Apache combined log format, logging all HTTP requests.
   *
   * @see https://github.com/expressjs/morgan
   */
  app.use(morgan('combined'));
}

/**
 * Cross-Origin Resource Sharing (CORS) middleware.
 *
 * @remarks
 * Enables CORS for all routes by default, allowing the application to accept requests from different origins.
 *
 * @see https://github.com/expressjs/cors
 */
app.use(cors());

/**
 * Loads the Swagger documentation from the YAML file and configures the Swagger UI middleware.
 *
 * @remarks
 * The Swagger UI is accessible via the `/api-docs` endpoint and dynamically adjusts the server URL based on the environment.
 *
 * @see https://swagger.io/tools/swagger-ui/
 */
const swaggerDocument = YAML.load('./swagger.yaml');
const environment = nodeEnv || 'development';
const baseUrl = process.env.BASE_URL || 'http://localhost:3333';

swaggerDocument.servers = [
  {
    url: baseUrl,
    description: environment === 'production' ? 'Production server' : 'Development server',
  },
];

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

/**
 * Registers all application routes.
 *
 * @remarks
 * The `routes` function is responsible for setting up all the necessary routes in the Express application.
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
