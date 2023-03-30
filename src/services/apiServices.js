const log = require('../lib/log');

const zelcoreRates = require('./zelcoreRates');
const zelcoreMarketsUSD = require('./zelcoreMarketsUSD');

let rates = [[], {}, {}]; // btc to fiat, alts to fiat, errors
let marketsUSD = [];

async function getRates(req, res) {
  try {
    res.json(rates);
  } catch (error) {
    log.error(error);
  }
}

async function getMarketsUsd(req, res) {
  try {
    res.json(marketsUSD);
  } catch (error) {
    log.error(error);
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function serviceRefresher() {
  try {
    log.info('Refreshing Markets and Rates');
    const ratesFetched = await zelcoreRates.getAll();
    await delay(25000);
    const marketsUSDFetched = await zelcoreMarketsUSD.getAll();
    if (ratesFetched && ratesFetched[0] && ratesFetched[0].length > 20 && ratesFetched[1]) {
      if (Object.keys(ratesFetched[1]).length > 400) {
        rates = ratesFetched;
      }
    }
    if (marketsUSDFetched && marketsUSDFetched[0]) {
      if (Object.keys(marketsUSDFetched[0]).length > 400) {
        marketsUSD = marketsUSDFetched;
      }
    }
    log.info('Refreshment finished');
    await delay(60000);
    serviceRefresher();
  } catch (error) {
    log.error(error);
    await delay(60000);
    serviceRefresher();
  }
}

module.exports = {
  getRates,
  // getMarkets,
  getMarketsUsd,
  serviceRefresher,
};
