import 'dotenv/config'
import * as http from 'http';
import config from './config';
import app from './src/lib/server';
import * as log from './src/lib/log';
import apiServices from './src/services/apiServices';

const server = http.createServer(app);
const { port } = config.server;

log.info('Starting services');
apiServices.serviceRefresher();

function startService(): void {
  const data = apiServices.getData();
  console.log("startService -> data", !!data.rates[0][0], !!data.marketsUSD[0])
  if (data.rates[0][0] && data.marketsUSD[0]) {
    setTimeout(() => {
      server.listen(port, () => {
        log.info(`rates-api launched, listening on port ${port}!`);
      });
    }, 1 * 1000);
  } else {
    setTimeout(() => {
      startService();
    }, 1 * 1000);
  }
}

startService();
