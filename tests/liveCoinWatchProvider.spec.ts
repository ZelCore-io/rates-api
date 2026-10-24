import type { AxiosResponse } from 'axios';

const axiosResponse = <T>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as AxiosResponse<T>['config'],
});

describe('LiveCoinWatch provider', () => {
  afterEach(() => jest.restoreAllMocks());

  // Sent as the joined string 'KDL,TLS', `codes` was matched as a substring
  // and the API answered with S, T, D, K, KD, DL and KDL -- unrelated coins
  // whose rows then overwrote CoinGecko's for the same tickers.
  it('sends the requested codes as an array', async () => {
    jest.resetModules();
    const { AxiosWrapper } = await import('../src/lib/axios');
    const postSpy = jest.spyOn(AxiosWrapper.prototype, 'post').mockResolvedValue(axiosResponse([]));
    const { LiveCoinWatch } = await import('../src/services/providers/liveCoinWatch');

    await LiveCoinWatch.getInstance().getExchangeRates(['KDL', 'TLS'], 'USD');

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toBe('coins/map');
    expect(postSpy.mock.calls[0][1]).toMatchObject({ currency: 'USD', codes: ['KDL', 'TLS'] });
  });
});
