const http = require('http');
const config = require('config');
const app = require('./src/lib/server');
const log = require('./src/lib/log');

const apiServices = require('./src/services/apiServices');

const server = http.createServer(app);
const { port } = config.server;

log.info('Starting services');
apiServices.serviceRefresher();

function startService() {
  const data = apiServices.getData();
  if (data.rates[0][0] && data.marketsUSD[0]) {
    setTimeout(() => {
      server.listen(port, () => {
        log.info(`rates-api launched, listening on port ${port}!`);
      });
    }, 5 * 1000);
  } else {
    setTimeout(() => {
      startService();
    }, 60 * 1000);
  }
}

startService();
