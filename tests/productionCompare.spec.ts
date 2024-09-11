import axios from 'axios';

const PRODUCTION_URL = 'https://viprates.zelcore.io/rates';
const LOCAL_URL = 'http://localhost:3333/rates';
const ALLOWED_VARIATION = 0.02; // 2% variation allowed due to price fluctuation

/**
 * Helper function to check if two numbers are within the allowed variation.
 */
const isWithinRange = (prodRate: number, localRate: number): boolean => {
  const diff = Math.abs(prodRate - localRate);
  const maxDiff = prodRate * ALLOWED_VARIATION;
  return diff <= maxDiff;
};

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
  let prodRates: Record<string, number>;
  let localRates: Record<string, number>;
  let revProdRates: Record<string, number>;
  let revLocalRates: Record<string, number>;

  beforeAll(async () => {
    // Fetch production rates
    const prodResponse = await axios.get(PRODUCTION_URL);
    const prodData = prodResponse.data[0];  // Assuming the rates data is in the first element of the array
    
    // Fetch localhost rates
    const localResponse = await axios.get(LOCAL_URL);
    const localData = localResponse.data[0];  // Assuming the rates data is in the first element of the array

    // Convert the array of rates into a map with 'code' as key and 'rate' as value
    prodRates = convertArrayToMap(prodData);
    localRates = convertArrayToMap(localData);
    revProdRates = prodResponse.data[1];
    revLocalRates = localResponse.data[1];
  });

  test('All crypto codes should be present in both production and localhost', () => {
    const prodKeys = Object.keys(prodRates);
    const localKeys = Object.keys(localRates);

    // Ensure all crypto codes from production exist in localhost data
    prodKeys.forEach((key) => {
      expect(localKeys).toContain(key);
    });

    const revProdKeys = Object.keys(revProdRates);
    const revLocalKeys = Object.keys(revLocalRates);

    // Ensure all crypto codes from production exist in localhost data
    revProdKeys.forEach((key) => {
      expect(revLocalKeys).toContain(key);
    });
  });

  test('All rates should be within a reasonable range', () => {
    const prodKeys = Object.keys(prodRates);

    // Compare rates for each crypto code
    prodKeys.forEach((key) => {
      const prodRate = prodRates[key];
      const localRate = localRates[key];

      // Ensure the rates are within the allowed range
      expect(isWithinRange(prodRate, localRate)).toBe(true);
    });

    const revProdKeys = Object.keys(revProdRates);

    // Compare rates for each crypto code
    revProdKeys.forEach((key) => {
      const prodRate = revProdRates[key];
      const localRate = revLocalRates[key];

      // Ensure the rates are within the allowed range
      expect(isWithinRange(prodRate, localRate)).toBe(true);
    });
  });
});
