import * as http from 'http';
import * as net from 'net';
import express from 'express';
import apicache from 'apicache';
import routes from '../src/routes';
import { CoinGecko } from '../src/services/providers/coinGecko';
import { resetPriceHistoryState } from '../src/services/priceHistory';

jest.mock('../src/services/providers/coinGecko');
jest.mock('../src/lib/log');

const MockedCoinGecko = CoinGecko as jest.Mocked<typeof CoinGecko>;
const DAY_S = 86400;

function fakeRange(id: string, vs: string, from: number, to: number) {
  const step = to - from > 90 * DAY_S ? DAY_S : 3600;
  const prices: [number, number][] = [];
  for (let t = Math.ceil(from / step) * step; t <= to; t += step) prices.push([t * 1000, 1 + t / 1e9]);
  return { prices };
}

const app = express();
routes(app);

/** Drives the real Express app in-process: no listen(), no network. */
function get(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    const req = new http.IncomingMessage(new net.Socket());
    req.method = 'GET';
    req.url = url;
    req.headers = {};
    const res = new http.ServerResponse(req);
    let body = '';
    const end = res.end.bind(res);
    res.end = ((chunk?: unknown, ...rest: unknown[]) => {
      if (chunk) body += String(chunk);
      const out = (end as (...a: unknown[]) => http.ServerResponse)(chunk, ...rest);
      setImmediate(() => resolve({ status: res.statusCode, body }));
      return out;
    }) as typeof res.end;
    (app as unknown as { handle: (q: unknown, s: unknown, next: () => void) => void })
      .handle(req, res, () => resolve({ status: 404, body: '' }));
  });
}

describe('GET /v2/prices/history/:geckoId route', () => {
  beforeEach(() => {
    resetPriceHistoryState();
    apicache.clear(undefined as unknown as string);
  });

  it('keeps no route-level response cache, so distinct query strings retain nothing', async () => {
    const upstream = jest.fn(async (...args: [string, string, number, number]) => fakeRange(...args));
    MockedCoinGecko.getInstance.mockReturnValue({ getMarketChartRange: upstream } as never);
    const nowS = Math.floor(Date.now() / 1000);
    const from = nowS - 3000 * DAY_S;

    const warm = await get(`/v2/prices/history/bitcoin?vs=eur&from=${from}&to=${nowS}`);
    expect(warm.status).toBe(200);
    const callsAfterWarm = upstream.mock.calls.length;

    for (let i = 1; i <= 50; i += 1) {
      // eslint-disable-next-line no-await-in-loop -- sequential on purpose: each must see the warm day cache.
      const res = await get(`/v2/prices/history/bitcoin?vs=eur&from=${from + 200}&to=${nowS - 200 - i}`);
      expect(res.status).toBe(200);
    }
    expect(apicache.getIndex().all).toHaveLength(0);
    // Warm requests are served from the day cache: zero upstream calls.
    expect(upstream).toHaveBeenCalledTimes(callsAfterWarm);
  });
});
