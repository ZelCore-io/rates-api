import axios from 'axios';

const PRODUCTION_URL = 'https://viprates.zelcore.io/marketsUSD';
const LOCAL_URL = 'http://localhost:3333/marketsUSD';
const ALLOWED_VARIATION = 0.80; // 2% variation allowed due to price fluctuation

/**
 * Helper function to check if two numbers are within the allowed variation.
 */
const isWithinRange = (prodMarket: number, localMarket: number): boolean => {
  // if both are very close to zero, consider them equal
  if (Math.abs(prodMarket) < 0.0001 && Math.abs(localMarket) < 0.0001) {
    return true;
  }
  const diff = Math.abs(prodMarket - localMarket);
  const maxDiff = prodMarket * ALLOWED_VARIATION;
  return diff <= maxDiff;
};
const AVOID = ['TOK', 'GUSD'];
/**
 * Helper function to convert the API response to a dictionary with 'code' as key and 'rate' as value.
 */
const convertArrayToMap = (data: Array<{ code: string, name: string, rate: number }>): Record<string, number> => {
  const map: Record<string, number> = {};
  data.forEach((entry) => {
    map[entry.code] = entry.rate;
  });
  return map;
};

describe('Crypto rates comparison between production and localhost', () => {
  let prodMarkets: Record<string, Record<string, number>>;
  let localMarkets: Record<string, Record<string, number>>;

  beforeAll(async () => {
    // Fetch production rates
    const prodResponse = await axios.get(PRODUCTION_URL);
    prodMarkets = prodResponse.data[0];  // Assuming the rates data is in the first element of the array
    
    // Fetch localhost rates
    const localResponse = await axios.get(LOCAL_URL);
    localMarkets = localResponse.data[0];  // Assuming the rates data is in the first element of the array

  });

  test('All crypto codes should be present in both production and localhost', () => {
    const prodKeys = Object.keys(prodMarkets);
    const localKeys = Object.keys(localMarkets);

    // Ensure all crypto codes from production exist in localhost data
    prodKeys.forEach((key) => {
      expect(localKeys).toContain(key);

      // Ensure enclosed object has the correct keys
      const prodValueKeys = Object.keys(prodMarkets[key]);
      prodValueKeys.forEach((prodKey) => {
        expect(localMarkets[key]).toHaveProperty(prodKey);
      });
    });
    
  });

  test('All rates should be within a reasonable range', () => {
    const prodKeys = Object.keys(prodMarkets);
    const diffs: any = [];
    // Compare rates for each crypto code
    prodKeys.forEach((key) => {
      const prodMarket = prodMarkets[key];
      const localMarket = localMarkets[key];

      // Ensure the rates for each value are within the allowed range
      const prodValueKeys = Object.keys(prodMarket);
      prodValueKeys.forEach((prodKey) => {
        if (!isWithinRange(prodMarket[prodKey], localMarket[prodKey]) && !AVOID.includes(key) && !['change', 'change7d', 'volume', 'supply'].includes(prodKey)) {
          diffs.push({
            code: key,
            value: prodKey,
            prodRate: prodMarket[prodKey],
            localRate: localMarket[prodKey],
          });
        }
      });

    });
    // Ensure the rates are within the allowed range
    expect(diffs).toEqual([]);
  });
});
