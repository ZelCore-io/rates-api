const http = require('http');
const config = require('config');
const app = require('./src/lib/server');
const log = require('./src/lib/log');

const apiServices = require('./src/services/apiServices');

const server = http.createServer(app);
const { port } = config.server;

log.info('Starting services');
apiServices.serviceRefresher();
setInterval(() => {
  apiServices.serviceRefresher();
}, 8 * 60 * 1000); // refresh every 8 minutes

setTimeout(() => {
  server.listen(port, () => {
    log.info(`rates-api launched, listening on port ${port}!`);
  });
}, 15 * 1000); // 15 secs delay
