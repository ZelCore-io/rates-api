import 'dotenv/config';
import * as http from 'http';
import config from './config';
import app from './src/lib/server';
import * as log from './src/lib/log';
import apiServices from './src/services/apiServices';

const server = http.createServer(app);
const { port } = config.server;

/**
 * Starts the HTTP server when data is available.
 *
 * This function checks if the required data is loaded before starting the server.
 * If data is not yet available, it retries after a delay.
 */
function startService(): void {
  const data = apiServices.getData();
  console.log("startService -> data", !!data.rates[0][0], !!Object.keys(data.marketsUSD[0]).length);
  if (data.rates[0][0] && Object.keys(data.marketsUSD[0]).length) {
    setTimeout(() => {
      server.listen(port, () => {
        log.info(`rates-api launched, listening on port ${port}!`);
      });
    }, 1000); // Wait for 1 second before starting the server
  } else {
    setTimeout(() => {
      startService();
    }, 1000); // Retry after 1 second
  }
}

log.info('Starting data refresher');
// First, initialize by fetching data from repositories
apiServices.dataRefresher().then(() => {
  // Then start services
  log.info('Starting services');
  apiServices.serviceRefresher();
  startService();
});
