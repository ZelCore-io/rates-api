import axios from "axios";

import * as log from '../lib/log';
import config from '../../config';

type CoinInfo = {
  description: string;
  total_supply: number | null;
  circulating_supply: number | null;
  websites: string[];
  explorers: string[];
  medium: string;
  discord: string;
  telegram: string;
  bitcointalk: string;
  facebook: string;
  twitter: string;
  reddit: string;
  repository: string;
  youtube: string;
  instagram: string;
  tiktok: string;
  twitch: string;
  linkedin: string;
  cryptoCompareID: string;
  coinMarketCapID: string;
  coingeckoID: string;
  auditInfos: string[];
  whitepaper: string[];
};
/**
 * @const { cryptoCompare:String[], coingecko:String[] } dictionary with Cryptocompare and Congecko IDS
 */
export const coinAggregatorIDs = {
  // Add the cryptoCompare ID at the end of this list
  cryptoCompare: [
    "CONI", "PAX", "SPHTX", "GVT", "INS", "MDA", "QSP", "SNGLS", "TNB", "WABI", "DGD", "TENT", "BBO", "ICN", "MCO", "EDO", "WINGS", "DTA", "ADT", "ATL", 
    "BCPT", "BTH", "USDS", "VIDT", "VBK", "UST", "GTO", "ONGAS", "MIOTA", "TOK", 'SAFE',
  ],
  /**
   * CoinGecko API ID
   * Found under the "Info" column, and part of the URL, e.g. https://www.coingecko.com/en/coins/[API-ID]
   * Add to the end of the list
   */
  coingecko: [... new Set([
    'solfarm', 'cope', 'bonfida', 'maps', 'media-network', 'oxygen', 'raydium', 'step-finance', 'rope-token', 'presearch', 'kyber-network', 'kyber-network-crystal', 'solana',
    'serum', 'gatechain-token', 'snowgem', 'zclassic', '1inch', 'hotbit-token', 'binance-usd', 'huobi-pool-token', 'huobi-token', 'zb-token', 'mx-token', 'bitforex',
    'okb', 'veriblock', 'suqa', 'holotoken', 'axe', 'safe-coin-2', 'bzedge', 'commercium', 'zelcash', 'kadena',
    'whale', 'alpha-finance', 'polkadot', 'kusama', 'nxm', 'just-stablecoin', 'sun-token', 'chiliz', 'gnosis', 'cybervein', 'husd', 'ocean-protocol', 'quant-network',
    'hedgetrade', 'terrausd', 'reserve-rights-token', 'ampleforth', 'swissborg', 'renbtc', 'uma', 'crypto-com-chain', 'celsius-degree-token', 'sushi', 'the-graph', 'ftx-token',
    'yearn-finance', 'havven', 'aave', 'revain', 'xdai-stake', 'dai', 'nexo', 'true-usd', 'thorchain', 'bitcoin-bep2', 'maidsafecoin', 'bakerytoken', 'safemoon', 'huplife',
    'raptoreum', 'axie-infinity', 'vertcoin', 'telcoin', 'harmony', 'waves', 'perpetual-protocol', 'audius', 'curve-dao-token', 'the-sandbox',
    'fetch-ai', 'golem', 'neutrino', 'skale', 'numeraire', 'livepeer', 'my-neighbor-alice', 'fei-protocol', 'origin-protocol', 'injective-protocol', 'singularitynet',
    'pax-gold', 'band-protocol', 'storm', 'reef-finance', 'cartesi', 'nkn', 'quick', 'woo-network', 'polycat-finance', 'stratis', 'energy-web-token',
    'prometeus', 'coti', 'orchid-protocol', 'tomochain', 'orbs', 'ultra', 'badger-dao', 'pha', 'smooth-love-potion', 'mass-vehicle-ledger', 'nucypher', 'dodo', 'xyo-network', 'utrust',
    'yfii-finance', 'melon', 'balancer', 'bora', 'strike', 'videocoin', 'weth', 'dydx', 'digitalbits', 'velas', 'fx-coin', 'asd', 'tribe-2', 'gods-unchained', 'ore-token', 'paribus',
    'crowny-token', 'samoyedcoin', 'mango-markets', 'star-atlas', 'star-atlas-dao', 'orca', 'aurory', 'solend', 'saber', 'liq-protocol', 'synthetify-token', 'port-finance', 'allbridge',
    'cropperfinance', 'investin', 'grape-2', 'ninja-protocol', 'msol', 'lido-staked-sol', 'solanium', 'defi-land', 'invictus', 'jet', 'dexlab', 'only1', 'marinade', 'hapi', 'aldrin',
    'cyclos', 'fabric', 'waggle-network', 'moonlana', 'solanax', 'cato', 'corestarter', 'sator', 'apyswap', 'sunny-aggregator', 'kurobi', 'frax', 'fio-protocol', 'avalanche-2', 'terra-luna',
    'terra-sdt', 'terra-krw', 'mirrored-amazon', 'mirrored-apple', 'mirrored-airbnb', 'mirrored-coinbase', 'mirrored-microsoft', 'mirrored-google', 'mirrored-tesla', 'mirrored-twitter', 'mirrored-netflix',
    'safemoon-2', 'bittorrent', 'elrond-erd-2', 'hollaex-token', 'zero', 'sonm', 'ergo', 'kdlaunch', 'kaddex', 'miners-of-kadenia', 'kdswap', 'algorand', 'kaspa', 'planetwatch', 'xfinite-entertainment-token',
    'opulous', 'clore-ai', 'karate-combat', 'pepe', 'floki', 'turbo', 'arbitrum', 'alephium', 'bonk', 'render-token', 'based-brett', 'dogwifcoin', 'the-open-network', 'notcoin', 'paxos-standard', 'gifto',
    'loom-network','tokok', 'coinbene-token', 'gemini-dollar', 'usd-coin', 'ethereum-classic', 'monero', 'dash', 'bitcoin', 'ethereum', 'zcash', 'tether', 'litecoin', 'bitcoinz', 'ravencoin', 
    'bitcoin-cash', 'binancecoin', 'bitcore', 'omisego', 'zilliqa', '0x', 'basic-attention-token', 'maker', 'enigma', 'tenx', 'substratum', 'civic', 'blockstack', 'bitcoin-gold', 'kucoin-shares', 
    'sirin-labs-token', 'everex', 'fetch-ai', 'genesis-vision', 'iotex', 'selfkey', 'lunyr', 'monetha', 'openanx', 'simple-token', 'populous', 'quantstamp', 'republic-protocol', 'iexec-rlc', 
    'singulardtv', 'viberate', 'vibe', 'wepower', 'dock', 'etherparty', 'blox', 'celer-network', 'cindicator', 'streamr', 'agrello', 'hush', 'snowgem', 'bitcoin-private', 'zencash', 'komodo', 'arcblock', 
    'aeternity', 'airswap', 'bigbom-eco', 'appcoins', 'bluzelle', 'bancor', 'coinfi', 'dai', 'digix-gold', 'electrify-asia', 'aelf', 'enjincoin', 'storj', 'iostoken', 'dent', 'chainlink', 'decentraland', 
    'loopring', 'qash', 'metal', 'poet', 'polymath', 'power-ledger', 'ripio-credit-network', 'raiden-network', 'request-network', 'status', 'salt', 'storm-token', 'true-usd', 'dentacoin', 'wings', 'data', 
    'funfair', 'kin', 'aurora', 'theta-token', 'adtoken', 'mainframe', 'atlant', 'aragon', 'aeron', 'augur', 'quark-chain', 'anon', 'stasis-eurs', 'blockmason-credit-protocol', 'suqa', 'mercurial', 
    'aleph', 'ontology', 'gas', 'tron', 'digibyte', 'stellar', 'dogecoin', 'eos', 'cardano', 'ripple', 'dock', 'neo', 'bittorrent-old', 'safe-coin-2', 'groestlcoin', 'leo-token', 'enq-enecuum', 'fantom', 'aergo', 
    'unibright', 'ilcoin', 'hex', 'compound-governance-token', 'wrapped-bitcoin', 'mantra-dao', 'uniswap', 'just', 'beldex', 'zcoin', 'pancakeswap-token', 'matic-network', 'veriblock', 'staked-ether', 
    'amp-token', 'telcoin', 'harmony', 'avalanche-2', 'cosmos', 'axie-infinity', 'tezos', 'bitcoin-bep2', 'shiba-inu', 'yearn-finance', 'havven', 'near', 'coin98', 'ankr', 'swipe', 'wazirx', 
    'saito', 'planetwatch', 'xfinite-entertainment-token', 'opulous', 'greentrust', 'gifto', 'mithril', 'tierion', 'delysium', 'adex', 'aion', 'ethos-3', 'ethlend', 'pnetwork',
    'wax', 'bitcoin-cash-sv', 'bread', 'loom-network', 'loom-network-new', 'amber', 'sin-city', 'qtum', 'nem', 'ong', 'iota', 'x-cash', 'oxbitcoin', 'dragonchain', 'binance-bitcoin',
  ])],
  // livecoinwatch api
  livecoinwatch: ['KDL'],
};

export async function getLatestCoinInfo() {
  try {
    const coinInfo: Record<string, CoinInfo> = (await axios.get(config.zelCoinInfoUrl)).data;
    const coinGeckoKeys = Object.values(coinInfo).map((coin) => coin.coingeckoID).filter((id) => !!id);
    const uniqueCoinGeckoKeys = [...new Set(coinGeckoKeys)];
    // console.log(uniqueCoinGeckoKeys.filter((id) => !coinAggregatorIDs.coingecko.includes(id)));
    // console.log(coinAggregatorIDs.coingecko.filter((id) => !uniqueCoinGeckoKeys.includes(id)));
    coinAggregatorIDs.coingecko = [...new Set([...coinAggregatorIDs.coingecko, ...uniqueCoinGeckoKeys])];
  } catch (error) {
    log.error('Error fetching coin info');
    log.error(error);
  } 
}
