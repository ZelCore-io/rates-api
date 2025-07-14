import axios from 'axios';

import * as log from '../lib/log';
import config from '../../config';
import cgCoins from '../../config/allCoins.json';
import { CoinGecko } from './providers';
import { CoinGeckoToken, CoinInfo } from '../types';

/**
 * An object containing arrays of cryptocurrency IDs used by different data aggregators.
 *
 * @const
 */
export const coinAggregatorIDs = {
  /**
   * CryptoCompare API IDs.
   *
   * Add the CryptoCompare IDs at the end of this list.
   */
  cryptoCompare: [
    'CONI', 'PAX', 'SPHTX', 'GVT', 'INS', 'MDA', 'QSP', 'SNGLS', 'TNB', 'WABI', 'DGD', 'TENT', 'BBO', 'ICN', 'MCO', 'EDO', 'WINGS', 'DTA', 'ADT', 'ATL', 
    'BCPT', 'BTH', 'USDS', 'VIDT', 'VBK', 'UST', 'GTO', 'ONGAS', 'MIOTA', 'TOK',
    'GNT', 'AGI', 'ETHOS', 'BSV', 'AMB', 'SIN', 'QTUM', 'XEM', 'XCASH',  // These are not actually used in ZelCore or some tickers; just for testing until merge
  ],
  /**
   * CoinGecko API IDs.
   *
   * Found under the 'Info' column and part of the URL, e.g., https://www.coingecko.com/en/coins/[API-ID].
   * Add to the end of the list.
   */
  coingecko: [...new Set([
    'solfarm', 'cope', 'bonfida', 'maps', 'media-network', 'oxygen', 'raydium', 'step-finance', 'rope-token', 'presearch', 'kyber-network', 'kyber-network-crystal', 'solana', 'serum', 'gatechain-token', 'zclassic', '1inch',
    'binance-usd', 'huobi-token', 'mx-token', 'bitforex', 'okb', 'holotoken', 'axe', 'safe-coin-2', 'bzedge', 'zelcash', 'kadena', 'whale', 'alpha-finance', 'polkadot', 'kusama', 'nxm', 'just-stablecoin', 'sun-token', 'chiliz',
    'gnosis', 'cybervein', 'husd', 'ocean-protocol', 'quant-network', 'hedgetrade', 'terrausd', 'reserve-rights-token', 'ampleforth', 'swissborg', 'renbtc', 'uma', 'crypto-com-chain', 'celsius-degree-token', 'sushi', 'the-graph',
    'ftx-token', 'yearn-finance', 'havven', 'aave', 'revain', 'xdai-stake', 'dai', 'nexo', 'true-usd', 'thorchain', 'maidsafecoin', 'bakerytoken', 'raptoreum', 'axie-infinity', 'vertcoin', 'telcoin', 'harmony', 'waves',
    'perpetual-protocol', 'audius', 'curve-dao-token', 'the-sandbox', 'fetch-ai', 'golem', 'neutrino', 'skale', 'numeraire', 'livepeer', 'my-neighbor-alice', 'origin-protocol', 'injective-protocol', 'singularitynet', 'pax-gold',
    'band-protocol', 'storm', 'cartesi', 'nkn', 'quick', 'woo-network', 'polycat-finance', 'stratis', 'energy-web-token', 'prometeus', 'coti', 'orchid-protocol', 'tomochain', 'orbs', 'ultra', 'badger-dao', 'pha', 'ethos',
    'mass-vehicle-ledger', 'nucypher', 'dodo', 'xyo-network', 'utrust', 'yfii-finance', 'melon', 'balancer', 'bora', 'strike', 'weth', 'dydx', 'digitalbits', 'velas', 'fx-coin', 'asd', 'tribe-2', 'gods-unchained', 'ore-token', 'paribus',
    'crowny-token', 'samoyedcoin', 'mango-markets', 'star-atlas', 'star-atlas-dao', 'orca', 'aurory', 'solend', 'saber', 'liq-protocol', 'synthetify-token', 'port-finance', 'allbridge', 'cropperfinance', 'investin', 'grape-2',
    'ninja-protocol', 'msol', 'lido-staked-sol', 'solanium', 'defi-land', 'jet', 'dexlab', 'only1', 'marinade', 'hapi', 'aldrin', 'cyclos', 'fabric', 'waggle-network', 'moonlana', 'cato', 'corestarter', 'sator', 'apyswap', 'sunny-aggregator',
    'kurobi', 'fio-protocol', 'avalanche-2', 'terra-luna', 'safemoon-2', 'bittorrent', 'elrond-erd-2', 'zero', 'sonm', 'ergo', 'kdlaunch', 'kaddex', 'kdswap', 'algorand', 'kaspa', 'planetwatch', 'xfinite-entertainment-token', 'opulous',
    'clore-ai', 'karate-combat', 'pepe', 'floki', 'turbo', 'arbitrum', 'alephium', 'bonk', 'render-token', 'based-brett', 'dogwifcoin', 'the-open-network', 'notcoin', 'paxos-standard', 'gifto', 'loom-network', 'gemini-dollar', 'usd-coin',
    'ethereum-classic', 'monero', 'dash', 'bitcoin', 'ethereum', 'zcash', 'tether', 'litecoin', 'bitcoinz', 'ravencoin', 'bitcoin-cash', 'binancecoin', 'bitcore', 'omisego', 'zilliqa', '0x', 'basic-attention-token', 'maker', 'enigma', 'tenx',
    'substratum', 'civic', 'blockstack', 'bitcoin-gold', 'kucoin-shares', 'sirin-labs-token', 'everex', 'iotex', 'selfkey', 'lunyr', 'monetha', 'openanx', 'simple-token', 'populous', 'republic-protocol', 'iexec-rlc', 'viberate', 'vibe',
    'wepower', 'dock', 'etherparty', 'blox', 'celer-network', 'cindicator', 'streamr', 'agrello', 'hush', 'bitcoin-private', 'zencash', 'komodo', 'arcblock', 'aeternity', 'airswap', 'appcoins', 'bluzelle', 'bancor', 'coinfi', 'digix-gold',
    'electrify-asia', 'aelf', 'enjincoin', 'storj', 'iostoken', 'dent', 'chainlink', 'decentraland', 'loopring', 'qash', 'metal', 'poet', 'polymath', 'power-ledger', 'ripio-credit-network', 'raiden-network', 'request-network', 'status', 'salt',
    'storm-token', 'dentacoin', 'funfair', 'kin', 'aurora', 'theta-token', 'mainframe', 'aragon', 'aeron', 'augur', 'quark-chain', 'anon', 'stasis-eurs', 'mercurial', 'aleph', 'ontology', 'gas', 'tron', 'digibyte', 'stellar', 'dogecoin', 'eos',
    'cardano', 'ripple', 'neo', 'bittorrent-old', 'groestlcoin', 'leo-token', 'enq-enecuum', 'fantom', 'aergo', 'unibright', 'ilcoin', 'hex', 'compound-governance-token', 'wrapped-bitcoin', 'mantra-dao', 'uniswap', 'just', 'beldex', 'zcoin',
    'pancakeswap-token', 'matic-network', 'staked-ether', 'amp-token', 'cosmos', 'tezos', 'shiba-inu', 'near', 'coin98', 'ankr', 'swipe', 'wazirx', 'saito', 'mithril', 'tierion', 'adex', 'aion', 'ethlend',
    'frax', 'smooth-love-potion', // These are not actually used in ZelCore or some tickers; just for testing until merge
    'wax', 'bread', 'loom-network-new', 'ong', 'iota', 'oxbitcoin', 'dragonchain', 'binance-bitcoin', 'telestai'])],
  /**
   * LiveCoinWatch API IDs.
   */
  livecoinwatch: ['KDL', 'TLS'],
};

/**
 * Global object to store coin information.
 */
export const zelData: {
  coinInfo: Record<string, CoinInfo>,
} = {
  coinInfo: {},
};

/**
 * Array of CoinGecko tokens.
 */
export let cgTokens: CoinGeckoToken[] = cgCoins;

/**
 * Map of contract addresses to CoinGecko tokens.
 */
export const cgContractMap: Record<string, CoinGeckoToken> = {};

/**
 * Fetches the latest coin information and updates the global data.
 *
 * This function retrieves coin information from a specified URL, updates the CoinGecko IDs,
 * and populates the contract map with CoinGecko tokens.
 *
 * @async
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 *
 * @example
 * ```typescript
 * await getLatestCoinInfo();
 * console.log(zelData.coinInfo);
 * ```
 */
export async function getLatestCoinInfo(): Promise<void> {
  try {
    const coinInfo: Record<string, CoinInfo> = (await axios.get(config.zelCoinInfoUrl)).data;
    const coinGeckoKeys = Object.values(coinInfo)
      .map((coin) => coin.coingeckoID)
      .filter((id) => !!id);
    const uniqueCoinGeckoKeys = [...new Set(coinGeckoKeys)];
    coinAggregatorIDs.coingecko = [...new Set([...coinAggregatorIDs.coingecko, ...uniqueCoinGeckoKeys])];
    zelData.coinInfo = coinInfo;
    const cgCoins = await CoinGecko.getInstance().getCoinsList();
    if (cgCoins) {
      cgTokens = cgCoins as CoinGeckoToken[];
      cgCoins.forEach((coin: CoinGeckoToken) => {
        for (const _contract of Object.values(coin.platforms)) {
          if (_contract) {
            cgContractMap[_contract] = coin;
          }
        }
      });
    }
  } catch (error) {
    log.error('Error fetching coin info');
    log.error(error);
  }
}
