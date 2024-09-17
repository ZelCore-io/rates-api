export type CryptoPrice = {
  id: string;
  provider: string;
  rates: Record<string, number>;
  supply: number;
  volume: number;
  change24h: number;
  market: number;
  rank?: number;
  total_supply?: number;
  change7d?: number;
};

export type FiatPrice = {
  code: string;
  name: string;
  rate: number;
  provider?: string;
};

export type PricesResponse = {
  crypto: CryptoPrice[];
  fiat: FiatPrice[];
};


export type CoinGeckoPrice = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: null | {
    times: number;
    currency: string;
    percentage: number;
  };
  last_updated: string;
  price_change_percentage_7d_in_currency: number;
};

export type CryptoComparePrice = {
  [key: string]: {
    [key: string]: number;
  };
};
export type CryptoCompareMarkets = {
  [key: string]: {
    [key: string]: {
      TYPE: string;
      MARKET: string;
      FROMSYMBOL: string;
      TOSYMBOL: string;
      FLAGS: string;
      PRICE: number;
      LASTUPDATE: number;
      MEDIAN: number;
      LASTVOLUME: number;
      LASTVOLUMETO: number;
      LASTTRADEID: string;
      VOLUMEDAY: number;
      VOLUMEDAYTO: number;
      VOLUME24HOUR: number;
      VOLUME24HOURTO: number;
      OPENDAY: number;
      HIGHDAY: number;
      LOWDAY: number;
      OPEN24HOUR: number;
      HIGH24HOUR: number;
      LOW24HOUR: number;
      LASTMARKET: string;
      VOLUMEHOUR: number;
      VOLUMEHOURTO: number;
      OPENHOUR: number;
      HIGHHOUR: number;
      LOWHOUR: number;
      TOPTIERVOLUME24HOUR: number;
      TOPTIERVOLUME24HOURTO: number;
      CHANGE24HOUR: number;
      CHANGEPCT24HOUR: number;
      CHANGEDAY: number;
      CHANGEPCTDAY: number;
      CHANGEHOUR: number;
      CHANGEPCTHOUR: number;
      CONVERSIONTYPE: string;
      CONVERSIONSYMBOL: string;
      CONVERSIONLASTUPDATE: number;
      SUPPLY: number;
      MKTCAP: number;
      MKTCAPPENALTY: number;
      CIRCULATINGSUPPLY: number;
      CIRCULATINGSUPPLYMKTCAP: number;
      TOTALVOLUME24H: number;
      TOTALVOLUME24HTO: number;
      TOTALTOPTIERVOLUME24H: number;
      TOTALTOPTIERVOLUME24HTO: number;
      IMAGEURL: string;
    }
  };
};
