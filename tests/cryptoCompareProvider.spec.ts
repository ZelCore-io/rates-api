import type { AxiosResponse } from 'axios';

/**
 * CryptoCompare reports an exhausted quota with HTTP 200 and an error
 * envelope in the body -- no RAW field, nothing for axios to throw on. The
 * shape below was captured live from the production key:
 *
 *   HTTP:200 {"Response":"Error","Type":99,"Cooldown":406,
 *             "Message":"You are over your rate limit please upgrade your account!"}
 *
 * Read as data it looks like "no symbols matched", which is how a spent quota
 * turned into a silently empty provider rather than a reported failure.
 */
const RATE_LIMITED = {
  Response: 'Error',
  Message: 'You are over your rate limit please upgrade your account!',
  HasWarning: false,
  Type: 99,
  RateLimit: {},
  Data: {},
  Cooldown: 406,
};

const axiosResponse = <T>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as AxiosResponse<T>['config'],
});

const marketFixture = (symbols: string[], currencies: string[]) => ({
  RAW: Object.fromEntries(symbols.map((s) => [s, Object.fromEntries(currencies.map((c) => [c, {
    FROMSYMBOL: s,
    TOSYMBOL: c,
    PRICE: c === 'BTC' ? 0.00003 : 2.5,
    SUPPLY: 100,
    VOLUME24HOURTO: 200,
    CHANGEPCT24HOUR: 1.5,
    MKTCAP: 300,
    TOTALVOLUME24H: 400,
    TOTALVOLUME24HTO: 500,
  }]))])),
});

/** The provider is a singleton holding its own cache, so isolate per test. */
async function loadIsolated() {
  jest.resetModules();
  const { AxiosWrapper } = await import('../src/lib/axios');
  const getSpy = jest.spyOn(AxiosWrapper.prototype, 'get');
  const { CryptoCompare } = await import('../src/services/providers/cryptoCompare');
  return { CryptoCompare, getSpy };
}

describe('CryptoCompare provider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('reports an exhausted quota as a failure rather than an empty result', async () => {
    const { CryptoCompare, getSpy } = await loadIsolated();
    getSpy.mockResolvedValue(axiosResponse(RATE_LIMITED));

    await expect(CryptoCompare.getInstance().getMarketData(['QTUM', 'XEM'], 'USD'))
      .rejects.toThrow(/rate limit/i);
  });

  it('reports an exhausted quota from the price endpoint too', async () => {
    const { CryptoCompare, getSpy } = await loadIsolated();
    getSpy.mockResolvedValue(axiosResponse(RATE_LIMITED));

    await expect(CryptoCompare.getInstance().getExchangeRates(['QTUM'], 'BTC'))
      .rejects.toThrow(/rate limit/i);
  });

  it('returns every requested quote currency from one request', async () => {
    const { CryptoCompare, getSpy } = await loadIsolated();
    getSpy.mockResolvedValue(axiosResponse(marketFixture(['QTUM'], ['BTC', 'USD'])));

    const data = await CryptoCompare.getInstance().getMarketData(['QTUM'], 'BTC,USD');

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy.mock.calls[0][1]).toMatchObject({ params: { tsyms: 'BTC,USD', fsyms: 'QTUM' } });
    expect(data.QTUM.BTC.PRICE).toBe(0.00003);
    expect(data.QTUM.USD.PRICE).toBe(2.5);
  });

  // The error envelope carries `Cooldown` in seconds, and the API re-arms that
  // window on every request made while it is running -- which is why polling
  // through it kept the production key limited indefinitely. Honour it.
  it('stops calling the API while the reported cooldown is still running', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
    const { CryptoCompare, getSpy } = await loadIsolated();
    getSpy.mockResolvedValue(axiosResponse({ ...RATE_LIMITED, Cooldown: 300 }));
    const cc = CryptoCompare.getInstance();

    await expect(cc.getMarketData(['QTUM'], 'USD')).rejects.toThrow(/rate limit/i);
    expect(getSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60 * 1000);
    await expect(cc.getMarketData(['QTUM'], 'USD')).rejects.toThrow(/cooldown/i);
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it('resumes once the cooldown has elapsed', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
    const { CryptoCompare, getSpy } = await loadIsolated();
    getSpy.mockResolvedValue(axiosResponse({ ...RATE_LIMITED, Cooldown: 300 }));
    const cc = CryptoCompare.getInstance();

    await expect(cc.getMarketData(['QTUM'], 'USD')).rejects.toThrow();

    jest.advanceTimersByTime(301 * 1000);
    getSpy.mockResolvedValue(axiosResponse(marketFixture(['QTUM'], ['USD'])));
    await expect(cc.getMarketData(['QTUM'], 'USD')).resolves.toHaveProperty('QTUM');
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  // The limit is per account, not per endpoint, so a cooldown learned from one
  // must silence the others too.
  it('applies the cooldown across endpoints', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
    const { CryptoCompare, getSpy } = await loadIsolated();
    getSpy.mockResolvedValue(axiosResponse({ ...RATE_LIMITED, Cooldown: 300 }));
    const cc = CryptoCompare.getInstance();

    await expect(cc.getMarketData(['QTUM'], 'USD')).rejects.toThrow();
    await expect(cc.getExchangeRates(['QTUM'], 'BTC')).rejects.toThrow(/cooldown/i);
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  // Only back off when actually asked to: a malformed-request error is not a
  // reason to stop talking to the API.
  it('does not start a cooldown for an error that does not report one', async () => {
    const { CryptoCompare, getSpy } = await loadIsolated();
    getSpy.mockResolvedValue(axiosResponse({
      Response: 'Error', Message: 'We only accept JSON data in the body', Type: 1, Data: {},
    }));
    const cc = CryptoCompare.getInstance();

    await expect(cc.getMarketData(['QTUM'], 'USD')).rejects.toThrow();
    await expect(cc.getMarketData(['XEM'], 'USD')).rejects.toThrow();
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  // The cache is consulted before the cooldown guard, so a backoff shorter
  // than the TTL costs nothing: callers keep being served the last good data.
  it('still serves cached data while in cooldown', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
    const { CryptoCompare, getSpy } = await loadIsolated();
    const cc = CryptoCompare.getInstance();

    getSpy.mockResolvedValue(axiosResponse(marketFixture(['QTUM'], ['USD'])));
    await cc.getMarketData(['QTUM'], 'USD');

    // A different symbol set misses the cache and trips the rate limit.
    getSpy.mockResolvedValue(axiosResponse({ ...RATE_LIMITED, Cooldown: 300 }));
    await expect(cc.getMarketData(['XEM'], 'USD')).rejects.toThrow();

    jest.advanceTimersByTime(60 * 1000);
    await expect(cc.getMarketData(['QTUM'], 'USD')).resolves.toHaveProperty('QTUM');
  });

  it('caches a successful response for 5 minutes', async () => {
    // lru-cache reads the clock from performance.now, which Jest's fake
    // timers leave alone; bridge it to the fake Date.
    jest.useFakeTimers({ doNotFake: ['performance'] });
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());

    const { CryptoCompare, getSpy } = await loadIsolated();
    getSpy.mockResolvedValue(axiosResponse(marketFixture(['QTUM'], ['USD'])));
    const cc = CryptoCompare.getInstance();

    await cc.getMarketData(['QTUM'], 'USD');
    jest.advanceTimersByTime(4.5 * 60 * 1000);
    await cc.getMarketData(['QTUM'], 'USD');
    expect(getSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60 * 1000);
    await cc.getMarketData(['QTUM'], 'USD');
    expect(getSpy).toHaveBeenCalledTimes(2);
  });
});
