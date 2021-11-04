/**
 * @const { cryptoCompare:String[], coingecko:String[] } dictionary with Cryptocompare and Congecko IDS
 */
const  coinAggregatorIDs = {
  // Just add the cryptoCompare ID in the end of this list
  cryptoCompare : [
    "TOK", "CONI", "PAX", "GUSD", "USDC", "ETC", "XMR", "DASH", "BTC", "ETH",
    "ZEC", "USDT", "LTC", "BTCZ", "RVN", "BCH", "BNB", "BTX", "SONM", "OMG",
    "ZIL", "ZRX", "GNT", "SPHTX", "BAT", "MKR", "ENG", "PAY", "SUB", "CVC",
    "STX", "BTG", "KCS", "SRN", "EVX", "FET", "GTO", "GVT", "INS", "IOTX",
    "KEY", "LUN", "MDA", "MITH", "MTH", "OAX", "OST", "PPT", "QSP", "REN",
    "RLC", "SNGLS", "TNB", "TNT", "VIB", "VIBE", "WABI", "WPR", "DOCK", "FUEL",
    "CDT", "CELR", "CND", "DATA", "DGD", "DLT", "AGI", "HUSH", "TENT", "BTCP",
    "ZEN", "KMD", "XZC", "ABT", "ADX", "AE", "AION", "AST", "BBO", "APPC", "BLZ",
    "BNT", "ETHOS", "COFI", "DAI", "DGX", "ELEC", "ELF", "ENJ", "STORJ", "IOST",
    "DENT", "LEND", "LINK", "MANA", "LRC", "QASH", "ICN", "MCO", "MTL", "POE",
    "POLY", "POWR", "RCN", "RDN", "REQ", "SNT", "SALT", "STORM", "EDO", "TUSD",
    "DCN", "WAX", "WINGS", "DTA", "FUN", "KIN", "BSV", "AOA", "THETA", "ADT",
    "MFT", "ATL", "ANT", "ARNX", "BRD", "REP", "QKC", "LOOM", "ANON", "EURS",
    "AMB", "BCPT", "SIN", "MER", "ALEPH", "ZER", "QTUM", "XEM", "ONGAS",
    "ONT", "MIOTA", "GAS", "TRX", "DGB", "XLM", "DOGE", "EOS", "ADA", "XRP", "DOCK",
    "NEO", "TRON", "BTT", "SAFE", "BTH", "GRS", "XCASH", "LEO", "USDS", "ENQ", "FTM",
    "0XBTC", "AERGO", "UBT", "ILC", "HEX", "COMP", "VIDT", "DRGN", "WBTC", "OM", "UNI",
    "JST", "BDX", "FIRO", "CAKE", "MATIC", "ZCL", "VBK", "STETH", "AMP", "TEL", "ONE",
    "AVAX", "ATOM", "AXS", "XTZ", "BTCB", "SHIB", "UST", "YFI", "SNX", "NEAR", "C98",
    "ANKR", "SXP", "WRX", "QUICK", "PROM",
  ],
  // Just add the coingecko ID in the end of this list
  coingecko : [
    "solfarm", "cope", "bonfida", "maps", "media-network", "oxygen", "raydium", "step-finance", "rope-token", "presearch", "kyber-network", "kyber-network-crystal", "solana", 
	"serum", "gatechain-token", "snowgem", "zclassic", "1inch", "hotbit-token", "binance-usd", "huobi-pool-token", "huobi-token", "zb-token", "mx-token", "bitforex", 
	"okb", "veriblock", "dmme", "suqa", "holotoken", "half-life", "axe", "safe-coin-2", "genesis-network", "bzedge", "commercium", "bitcoin-zero", "zelcash", "kadena", 
	"whale", "golfcoin", "alpha-finance", "polkadot", "kusama", "nxm", "just-stablecoin", "sun-token", "chiliz", "gnosis", "cybervein", "husd", "ocean-protocol", "quant-network", 
	"hedgetrade", "terrausd", "reserve-rights-token", "ampleforth", "swissborg", "renbtc", "uma", "crypto-com-chain", "celsius-degree-token", "sushi", "the-graph", "ftx-token", 
	"yearn-finance", "havven", "aave", "revain", "xdai-stake", "dai", "nexo", "true-usd", "thorchain", "bitcoin-bep2", "maidsafecoin", "bakerytoken", "safemoon", "huplife", 
	"raptoreum", "axie-infinity", "vertcoin", "lido-staked-ether", "amp", "telcoin", "harmony", "waves", "perpetual-protocol", "audius", "curve-dao-token", "the-sandbox", 
	"fetch-ai", "golem", "neutrino", "skale", "numeraire", "livepeer", "my-neighbor-alice", "fei-protocol", "origin-protocol", "injective-protocol", "singularitynet", 
	"pax-gold", "band-protocol", "storm", "reef-finance", "cartesi", "nkn", 'quick', "woo-network", "polycat-finance", "solfarm", "zelcash","stratis","energy-web-token",
  "prometeus","coti","orchid-protocol","tomochain","orbs","ultra","badger-dao","pha","smooth-love-potion","mass-vehicle-ledger","nucypher","dodo","xyo-network","utrust",
  "yfii-finance","melon","balancer","bora","strike","videocoin","weth","dydx","digitalbits","velas","fx-coin","asd", "prometeus",
  ],
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

// console.log(cryptoCompareIDs);
// console.log(coingeckoIDs);
module.exports = { cryptoCompareIDs, coingeckoIDs };
