const coinsSimmple = require('../../config/coinsSimple');

const coinIds = Object.keys(coinsSimmple);

const cryptoUnits = [];
coinIds.forEach((coin) => {
  if (!cryptoUnits.includes(coinsSimmple[coin].unit)) {
    cryptoUnits.push(coinsSimmple[coin].unit);
  }
});

/**
 * @const { cryptoCompare:String[], coingecko:String[] } dictionary with Cryptocompare and Congecko IDS
 */
const coinAggregatorIDs = {
  // Just add the cryptoCompare ID in the end of this list
  cryptoCompare: [
    'TOK', 'CONI', 'PAX', 'GUSD', 'USDC', 'ETC', 'XMR', 'DASH', 'BTC', 'ETH',
    'ZEC', 'USDT', 'LTC', 'BTCZ', 'RVN', 'BCH', 'BNB', 'BTX', 'OMG',
    'ZIL', 'ZRX', 'GNT', 'SPHTX', 'BAT', 'MKR', 'ENG', 'PAY', 'SUB', 'CVC',
    'STX', 'BTG', 'KCS', 'SRN', 'EVX', 'FET', 'GTO', 'GVT', 'INS', 'IOTX',
    'KEY', 'LUN', 'MDA', 'MITH', 'MTH', 'OAX', 'OST', 'PPT', 'QSP', 'REN',
    'RLC', 'SNGLS', 'TNB', 'TNT', 'VIB', 'VIBE', 'WABI', 'WPR', 'DOCK', 'FUEL',
    'CDT', 'CELR', 'CND', 'DATA', 'DGD', 'DLT', 'AGI', 'HUSH', 'TENT', 'BTCP',
    'ZEN', 'KMD', 'XZC', 'ABT', 'ADX', 'AE', 'AION', 'AST', 'BBO', 'APPC', 'BLZ',
    'BNT', 'ETHOS', 'COFI', 'DAI', 'DGX', 'ELEC', 'ELF', 'ENJ', 'STORJ', 'IOST',
    'DENT', 'LEND', 'LINK', 'MANA', 'LRC', 'QASH', 'ICN', 'MCO', 'MTL', 'POE',
    'POLY', 'POWR', 'RCN', 'RDN', 'REQ', 'SNT', 'SALT', 'STORM', 'EDO', 'TUSD',
    'DCN', 'WAX', 'WINGS', 'DTA', 'FUN', 'KIN', 'BSV', 'AOA', 'THETA', 'ADT',
    'MFT', 'ATL', 'ANT', 'ARNX', 'BRD', 'REP', 'QKC', 'LOOM', 'ANON', 'EURS',
    'AMB', 'BCPT', 'SIN', 'MER', 'ALEPH', 'QTUM', 'XEM', 'ONGAS',
    'ONT', 'MIOTA', 'GAS', 'TRX', 'DGB', 'XLM', 'DOGE', 'EOS', 'ADA', 'XRP', 'DOCK',
    'NEO', 'BTTOLD', 'SAFE', 'BTH', 'GRS', 'XCASH', 'LEO', 'USDS', 'ENQ', 'FTM',
    '0XBTC', 'AERGO', 'UBT', 'ILC', 'HEX', 'COMP', 'VIDT', 'DRGN', 'WBTC', 'OM', 'UNI',
    'JST', 'BDX', 'FIRO', 'CAKE', 'MATIC', 'VBK', 'STETH', 'AMP', 'TEL', 'ONE',
    'AVAX', 'ATOM', 'AXS', 'XTZ', 'BTCB', 'SHIB', 'UST', 'YFI', 'SNX', 'NEAR', 'C98',
    'ANKR', 'SXP', 'WRX', 'QUICK', 'SAITO', 'PLANETS', 'XET', 'OPUL',
  ],
  /**
   * CoinGecko API ID
   * Found under the "Info" column, and part of the URL, eg. https://www.coingecko.com/en/coins/[API-ID]
   * Add to the end of the list
   */
  coingecko: [
    'solfarm', 'cope', 'bonfida', 'maps', 'media-network', 'oxygen', 'raydium', 'step-finance', 'rope-token', 'presearch', 'kyber-network', 'kyber-network-crystal', 'solana',
    'serum', 'gatechain-token', 'snowgem', 'zclassic', '1inch', 'hotbit-token', 'binance-usd', 'huobi-pool-token', 'huobi-token', 'zb-token', 'mx-token', 'bitforex',
    'okb', 'veriblock', 'dmme-app', 'suqa', 'holotoken', 'half-life', 'axe', 'safe-coin-2', 'bzedge', 'commercium', 'bitcoin-zero', 'zelcash', 'kadena',
    'whale', 'alpha-finance', 'polkadot', 'kusama', 'nxm', 'just-stablecoin', 'sun-token', 'chiliz', 'gnosis', 'cybervein', 'husd', 'ocean-protocol', 'quant-network',
    'hedgetrade', 'terrausd', 'reserve-rights-token', 'ampleforth', 'swissborg', 'renbtc', 'uma', 'crypto-com-chain', 'celsius-degree-token', 'sushi', 'the-graph', 'ftx-token',
    'yearn-finance', 'havven', 'aave', 'revain', 'xdai-stake', 'dai', 'nexo', 'true-usd', 'thorchain', 'bitcoin-bep2', 'maidsafecoin', 'bakerytoken', 'safemoon', 'huplife',
    'raptoreum', 'axie-infinity', 'vertcoin', 'lido-staked-ether', 'amp', 'telcoin', 'harmony', 'waves', 'perpetual-protocol', 'audius', 'curve-dao-token', 'the-sandbox',
    'fetch-ai', 'golem', 'neutrino', 'skale', 'numeraire', 'livepeer', 'my-neighbor-alice', 'fei-protocol', 'origin-protocol', 'injective-protocol', 'singularitynet',
    'pax-gold', 'band-protocol', 'storm', 'reef-finance', 'cartesi', 'nkn', 'quick', 'woo-network', 'polycat-finance', 'stratis', 'energy-web-token',
    'prometeus', 'coti', 'orchid-protocol', 'tomochain', 'orbs', 'ultra', 'badger-dao', 'pha', 'smooth-love-potion', 'mass-vehicle-ledger', 'nucypher', 'dodo', 'xyo-network', 'utrust',
    'yfii-finance', 'melon', 'balancer', 'bora', 'strike', 'videocoin', 'weth', 'dydx', 'digitalbits', 'velas', 'fx-coin', 'asd', 'tribe-2', 'gods-unchained', 'ore-token', 'paribus',
    'crowny-token', 'samoyedcoin', 'mango-markets', 'star-atlas', 'star-atlas-dao', 'orca', 'aurory', 'solend', 'saber', 'liq-protocol', 'synthetify-token', 'port-finance', 'allbridge',
    'cropperfinance', 'investin', 'grape-2', 'ninja-protocol', 'msol', 'lido-staked-sol', 'solanium', 'defi-land', 'invictus', 'jet', 'dexlab', 'only1', 'marinade', 'hapi', 'aldrin',
    'cyclos', 'fabric', 'waggle-network', 'moonlana', 'solanax', 'cato', 'corestarter', 'sator', 'apyswap', 'sunny-aggregator', 'kurobi', 'frax', 'fio-protocol', 'avalanche-2', 'terra-luna',
    'terra-sdt', 'terra-krw', 'mirrored-amazon', 'mirrored-apple', 'mirrored-airbnb', 'mirrored-coinbase', 'mirrored-microsoft', 'mirrored-google', 'mirrored-tesla', 'mirrored-twitter', 'mirrored-netflix',
    'safemoon-2', 'bittorrent', 'elrond-erd-2', 'hollaex-token', 'zero', 'sonm', 'ergo', 'kdlaunch', 'kaddex', 'miners-of-kadenia', 'kdswap', 'algorand', 'kaspa', 'planetwatch', 'xfinite-entertainment-token',
    'opulous', 'clore-ai',
  ],
  // This is an array with coingecko IDs for the cryptocompare IDs. This array will be used in markets to replace cryptocompare data.
  cg4cc: ['tokok', 'coinbene-token', 'paxos-standard', 'gemini-dollar', 'usd-coin', 'ethereum-classic', 'monero', 'dash', 'bitcoin', 'ethereum', 'zcash', 'tether', 'litecoin', 'bitcoinz', 'ravencoin',
    'bitcoin-cash', 'binancecoin', 'bitcore', 'omisego', 'zilliqa', '0x', 'basic-attention-token', 'maker', 'enigma', 'tenx', 'substratum', 'civic', 'blockstack', 'bitcoin-gold', 'kucoin-shares',
    'sirin-labs-token', 'everex', 'fetch-ai', 'gifto', 'genesis-vision', 'iotex', 'selfkey', 'lunyr', 'monetha', 'openanx', 'simple-token', 'populous', 'quantstamp', 'republic-protocol', 'iexec-rlc',
    'singulardtv', 'viberate', 'vibe', 'wepower', 'dock', 'etherparty', 'blox', 'celer-network', 'cindicator', 'streamr', 'agrello', 'hush', 'snowgem', 'bitcoin-private', 'zencash', 'komodo', 'arcblock',
    'aeternity', 'airswap', 'bigbom-eco', 'appcoins', 'bluzelle', 'bancor', 'coinfi', 'dai', 'digix-gold', 'electrify-asia', 'aelf', 'enjincoin', 'storj', 'iostoken', 'dent', 'chainlink', 'decentraland',
    'loopring', 'qash', 'metal', 'poet', 'polymath', 'power-ledger', 'ripio-credit-network', 'raiden-network', 'request-network', 'status', 'salt', 'storm-token', 'true-usd', 'dentacoin', 'wings', 'data',
    'funfair', 'kin', 'aurora', 'theta-token', 'adtoken', 'mainframe', 'atlant', 'aragon', 'aeron', 'augur', 'quark-chain', 'loom-network', 'anon', 'stasis-eurs', 'blockmason-credit-protocol', 'suqa', 'mercurial',
    'aleph', 'ontology', 'gas', 'tron', 'digibyte', 'stellar', 'dogecoin', 'eos', 'cardano', 'ripple', 'dock', 'neo', 'bittorrent-old', 'safe-coin-2', 'groestlcoin', 'leo-token', 'enq-enecuum', 'fantom', 'aergo',
    'unibright', 'ilcoin', 'hex', 'compound-governance-token', 'wrapped-bitcoin', 'mantra-dao', 'uniswap', 'just', 'beldex', 'zcoin', 'pancakeswap-token', 'matic-network', 'zclassic', 'veriblock', 'staked-ether',
    'amp-token', 'telcoin', 'harmony', 'avalanche-2', 'cosmos', 'axie-infinity', 'tezos', 'bitcoin-bep2', 'shiba-inu', 'yearn-finance', 'havven', 'near', 'coin98', 'ankr', 'swipe', 'wazirx', 'quick',
    'saito', 'planetwatch', 'xfinite-entertainment-token', 'opulous', 'clore-ai'],
  // livecoinwatch api
  livecoinwatch: ['KDL'],
};

/**
 * Function that combines with commas the elements of a string array till some max length and then return the new array of strings
 * @param {string[]} elements
 * @param {number} maxLength
 * @returns ApiCallStrings[]
 */
function makeRequestStrings(elements, maxLength) {
  const result = [];
  let temp = '';
  elements.forEach((element) => {
    if ((`${temp + element},`).length >= maxLength) {
      result.push(temp.replace(/,\s*$/, '')); // remove last ,
      temp = `${element},`;
    } else if (element === elements[elements.length - 1]) {
      result.push(temp + element);
    } else {
      temp = `${temp + element},`;
    }
  });
  return result;
}

const cryptoCompareIDs = makeRequestStrings(coinAggregatorIDs.cryptoCompare, 300);
const coingeckoIDs = makeRequestStrings(coinAggregatorIDs.coingecko, 450);
const cg4ccIDs = makeRequestStrings(coinAggregatorIDs.cg4cc, 450);
const liveCoinWatchIDs = makeRequestStrings(coinAggregatorIDs.livecoinwatch, 400);
console.log(cryptoCompareIDs);
// console.log(coingeckoIDs);
module.exports = {
  cryptoCompareIDs,
  coingeckoIDs,
  cg4ccIDs,
  liveCoinWatchIDs,
};
